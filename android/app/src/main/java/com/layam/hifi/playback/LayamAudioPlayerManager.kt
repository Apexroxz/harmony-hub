package com.layam.hifi.playback

import android.content.Context
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import android.net.Uri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

/**
 * High-Fidelity Native Audio Player Manager for Layam Hi-Fi.
 *
 * Configured with Android Jetpack Media3 (ExoPlayer) with automatic audio focus handling,
 * headset unplugging detection (becoming noisy), and hardware-accelerated AudioFX DSP.
 */
class LayamAudioPlayerManager private constructor(private val context: Context) {

    companion object {
        @Volatile
        private var instance: LayamAudioPlayerManager? = null

        fun getInstance(context: Context): LayamAudioPlayerManager {
            return instance ?: synchronized(this) {
                instance ?: LayamAudioPlayerManager(context.applicationContext).also { instance = it }
            }
        }
    }

    interface PlaybackListener {
        fun onPlaybackStateChanged(isPlaying: Boolean, state: String, positionMs: Long, durationMs: Long)
        fun onPositionDiscontinuity(positionMs: Long)
        fun onTrackChanged(title: String?, artist: String?, album: String?, artworkUri: String?, durationMs: Long)
        fun onError(errorCode: Int, errorMessage: String)
    }

    private var player: ExoPlayer? = null
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private val listeners = mutableListOf<PlaybackListener>()

    init {
        initializePlayer()
    }

    private fun initializePlayer() {
        if (player != null) return

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        player = ExoPlayer.Builder(context)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build().apply {
                addListener(object : Player.Listener {
                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        notifyState()
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        notifyState()
                    }

                    override fun onPositionDiscontinuity(
                        oldPosition: Player.PositionInfo,
                        newPosition: Player.PositionInfo,
                        reason: Int
                    ) {
                        listeners.forEach { it.onPositionDiscontinuity(newPosition.positionMs) }
                    }

                    override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
                        val duration = player?.duration ?: 0L
                        listeners.forEach {
                            it.onTrackChanged(
                                mediaMetadata.title?.toString(),
                                mediaMetadata.artist?.toString(),
                                mediaMetadata.albumTitle?.toString(),
                                mediaMetadata.artworkUri?.toString(),
                                if (duration < 0) 0L else duration
                            )
                        }
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        listeners.forEach {
                            it.onError(error.errorCode, error.message ?: "Native playback error")
                        }
                    }
                })
            }

        attachAudioEffects()
    }

    private fun attachAudioEffects() {
        try {
            val sessionId = player?.audioSessionId ?: return
            if (sessionId != C.AUDIO_SESSION_ID_UNSET) {
                equalizer = Equalizer(0, sessionId).apply { enabled = true }
                bassBoost = BassBoost(0, sessionId).apply { enabled = true }
                virtualizer = Virtualizer(0, sessionId).apply { enabled = true }
            }
        } catch (e: Exception) {
            // AudioFX may be unavailable on certain custom ROMs or virtual targets
        }
    }

    fun getPlayer(): ExoPlayer {
        if (player == null) initializePlayer()
        return player!!
    }

    fun addListener(listener: PlaybackListener) {
        if (!listeners.contains(listener)) listeners.add(listener)
    }

    fun removeListener(listener: PlaybackListener) {
        listeners.remove(listener)
    }

    fun playTrack(
        uriString: String,
        title: String?,
        artist: String?,
        album: String?,
        artworkUri: String?,
        initialPositionMs: Long = 0L
    ) {
        val exo = getPlayer()
        val mediaUri = Uri.parse(uriString)

        val metadata = MediaMetadata.Builder()
            .setTitle(title ?: "Unknown Track")
            .setArtist(artist ?: "Unknown Artist")
            .setAlbumTitle(album ?: "Layam Vault")
            .apply {
                if (!artworkUri.isNullOrBlank()) {
                    setArtworkUri(Uri.parse(artworkUri))
                }
            }
            .build()

        val mediaItem = MediaItem.Builder()
            .setUri(mediaUri)
            .setMediaMetadata(metadata)
            .build()

        exo.setMediaItem(mediaItem)
        if (initialPositionMs > 0) {
            exo.seekTo(initialPositionMs)
        }
        exo.prepare()
        exo.play()

        // Re-ensure audio effects are attached to the active session
        if (equalizer == null) {
            attachAudioEffects()
        }
    }

    fun pause() {
        player?.pause()
    }

    fun resume() {
        player?.play()
    }

    fun seekTo(positionMs: Long) {
        player?.seekTo(positionMs)
    }

    fun setVolume(volume: Float) {
        player?.volume = volume.coerceIn(0.0f, 1.0f)
    }

    // ── Native DSP / AudioFX Control ──

    fun setEqualizerEnabled(enabled: Boolean) {
        try {
            equalizer?.enabled = enabled
            bassBoost?.enabled = enabled
            virtualizer?.enabled = enabled
        } catch (e: Exception) {
            // Safe fallback
        }
    }

    fun setEqualizerGains(gains: List<Double>) {
        val eq = equalizer ?: return
        try {
            val numBands = eq.numberOfBands.toInt()
            val range = eq.bandLevelRange // [min mB, max mB], e.g. -1500 to +1500
            val minMb = range[0].toInt()
            val maxMb = range[1].toInt()

            for (i in 0 until numBands) {
                if (i < gains.size) {
                    val gainDb = gains[i]
                    // Convert dB to millibels (1 dB = 100 mB)
                    val mb = (gainDb * 100).toInt().coerceIn(minMb, maxMb)
                    eq.setBandLevel(i.toShort(), mb.toShort())
                }
            }
        } catch (e: Exception) {
            // Safe fallback
        }
    }

    fun setBassBoostStrength(strength: Int) { // 0 to 1000
        try {
            bassBoost?.setStrength(strength.coerceIn(0, 1000).toShort())
        } catch (e: Exception) {
            // Safe fallback
        }
    }

    fun setVirtualizerStrength(strength: Int) { // 0 to 1000
        try {
            virtualizer?.setStrength(strength.coerceIn(0, 1000).toShort())
        } catch (e: Exception) {
            // Safe fallback
        }
    }

    fun getPosition(): Long = player?.currentPosition ?: 0L

    fun getDuration(): Long {
        val dur = player?.duration ?: 0L
        return if (dur < 0) 0L else dur
    }

    fun isPlaying(): Boolean = player?.isPlaying == true

    private fun notifyState() {
        val p = player ?: return
        val isPlaying = p.isPlaying
        val stateString = when (p.playbackState) {
            Player.STATE_IDLE -> "IDLE"
            Player.STATE_BUFFERING -> "BUFFERING"
            Player.STATE_READY -> if (isPlaying) "PLAYING" else "PAUSED"
            Player.STATE_ENDED -> "ENDED"
            else -> "UNKNOWN"
        }
        val pos = getPosition()
        val dur = getDuration()

        listeners.forEach {
            it.onPlaybackStateChanged(isPlaying, stateString, pos, dur)
        }
    }

    fun release() {
        try {
            equalizer?.release()
            bassBoost?.release()
            virtualizer?.release()
        } catch (e: Exception) {}
        equalizer = null
        bassBoost = null
        virtualizer = null

        player?.release()
        player = null
        listeners.clear()
    }
}
