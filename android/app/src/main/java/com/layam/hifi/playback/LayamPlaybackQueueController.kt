package com.layam.hifi.playback

import android.animation.ValueAnimator
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

@OptIn(UnstableApi::class)
class LayamPlaybackQueueController(private val exoPlayer: ExoPlayer) {

    private val _currentTrackIndex = MutableStateFlow(0)
    val currentTrackIndex = _currentTrackIndex.asStateFlow()

    init {
        exoPlayer.addListener(object : Player.Listener {
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                _currentTrackIndex.value = exoPlayer.currentMediaItemIndex
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    // Preload next track in queue seamlessly
                    if (exoPlayer.hasNextMediaItem()) {
                        // Media3 automatically prepares the next window in the background
                    }
                }
            }
        })
    }

    fun setQueue(items: List<MediaItem>, startIndex: Int = 0) {
        exoPlayer.setMediaItems(items, startIndex, 0L)
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true
    }

    fun applyCrossfadeTransition(durationMs: Long = 1000L, onCrossfadeComplete: () -> Unit) {
        val fadeOut = ValueAnimator.ofFloat(1.0f, 0.0f).apply {
            duration = durationMs / 2
            addUpdateListener { animation ->
                exoPlayer.volume = animation.animatedValue as Float
            }
        }
        val fadeIn = ValueAnimator.ofFloat(0.0f, 1.0f).apply {
            duration = durationMs / 2
            addUpdateListener { animation ->
                exoPlayer.volume = animation.animatedValue as Float
            }
        }

        fadeOut.addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                onCrossfadeComplete()
                fadeIn.start()
            }
        })
        fadeOut.start()
    }
}
