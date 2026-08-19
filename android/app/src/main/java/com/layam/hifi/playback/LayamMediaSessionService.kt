package com.layam.hifi.playback

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.core.app.NotificationCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaNotification
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaStyleNotificationHelper
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.layam.hifi.MainActivity
import com.layam.hifi.R

/**
 * Android Foreground MediaLibraryService for Layam Hi-Fi.
 *
 * Implements Android Auto / Automotive / Wear OS browsing hierarchy:
 * - Root
 *   ├── All Tracks
 *   ├── Albums
 *   ├── Artists
 *   ├── Playlists
 *   └── Favorites
 *
 * Exposes Android lock-screen, notification shade, and Bluetooth playback controls
 * with full foreground media session management and MediaStyle notification.
 */
@OptIn(UnstableApi::class)
class LayamMediaSessionService : MediaLibraryService() {

    private var mediaLibrarySession: MediaLibrarySession? = null

    companion object {
        const val CHANNEL_ID = "layam_hifi_playback_channel_v2"
        const val NOTIFICATION_ID = 1001

        // Root Node IDs for Android Auto
        const val ROOT_ID = "layam_root"
        const val CATEGORY_TRACKS = "layam_tracks"
        const val CATEGORY_ALBUMS = "layam_albums"
        const val CATEGORY_ARTISTS = "layam_artists"
        const val CATEGORY_PLAYLISTS = "layam_playlists"
        const val CATEGORY_FAVORITES = "layam_favorites"
    }

    override fun onCreate() {
        super.onCreate()
        android.util.Log.i("LAYAM_SERVICE", "[LAYAM_SERVICE] onCreate MediaLibraryService (Android Auto enabled)")
        createNotificationChannel()

        val playerManager = LayamAudioPlayerManager.getInstance(applicationContext)
        val player = playerManager.getPlayer()

        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        mediaLibrarySession = MediaLibrarySession.Builder(this, player, CustomMediaLibrarySessionCallback())
            .setSessionActivity(sessionActivityPendingIntent)
            .build()

        player.addListener(object : Player.Listener {
            override fun onEvents(p: Player, events: Player.Events) {
                if (events.containsAny(
                        Player.EVENT_PLAY_WHEN_READY_CHANGED,
                        Player.EVENT_PLAYBACK_STATE_CHANGED,
                        Player.EVENT_MEDIA_METADATA_CHANGED,
                        Player.EVENT_MEDIA_ITEM_TRANSITION,
                        Player.EVENT_IS_PLAYING_CHANGED
                    )
                ) {
                    mediaLibrarySession?.let { session ->
                        postOrUpdateNotification(session)
                    }
                }
            }
        })

        val notificationProvider = object : MediaNotification.Provider {
            override fun createNotification(
                session: MediaSession,
                customLayout: ImmutableList<CommandButton>,
                actionFactory: MediaNotification.ActionFactory,
                onNotificationChangedCallback: MediaNotification.Provider.Callback
            ): MediaNotification {
                return buildMediaNotification(session)
            }

            override fun handleCustomCommand(
                session: MediaSession,
                action: String,
                extras: Bundle
            ): Boolean {
                return false
            }
        }

        setMediaNotificationProvider(notificationProvider)
    }

    private fun extractArtworkBitmap(mediaUri: android.net.Uri?, artworkUri: android.net.Uri?): android.graphics.Bitmap? {
        if (artworkUri != null) {
            try {
                if (artworkUri.scheme == "content" || artworkUri.scheme == "file") {
                    contentResolver.openInputStream(artworkUri)?.use { input ->
                        return android.graphics.BitmapFactory.decodeStream(input)
                    }
                }
            } catch (_: Exception) {}
        }
        if (mediaUri != null && (mediaUri.scheme == "content" || mediaUri.scheme == "file")) {
            try {
                val retriever = android.media.MediaMetadataRetriever()
                retriever.setDataSource(this, mediaUri)
                val picture = retriever.embeddedPicture
                retriever.release()
                if (picture != null) {
                    return android.graphics.BitmapFactory.decodeByteArray(picture, 0, picture.size)
                }
            } catch (_: Exception) {}
        }
        return null
    }

    private fun buildMediaNotification(session: MediaSession): MediaNotification {
        val currentPlayer = session.player
        val metadata = currentPlayer.mediaMetadata
        val title = metadata.title?.toString() ?: "Layam Hi-Fi"
        val artist = metadata.artist?.toString() ?: "Audiophile Master"
        val isPlaying = currentPlayer.isPlaying

        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val currentMediaItem = currentPlayer.currentMediaItem
        val mediaUri = currentMediaItem?.localConfiguration?.uri
        val artworkUri = metadata.artworkUri
        val artworkBitmap = extractArtworkBitmap(mediaUri, artworkUri)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(R.drawable.ic_layam_stat_notify)
            .apply {
                if (artworkBitmap != null) {
                    setLargeIcon(artworkBitmap)
                }
            }
            .setContentIntent(sessionActivityPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(isPlaying)
            .setStyle(
                MediaStyleNotificationHelper.MediaStyle(session)
            )

        return MediaNotification(NOTIFICATION_ID, builder.build())
    }

    private fun postOrUpdateNotification(session: MediaSession) {
        val player = session.player
        if (player.playbackState == Player.STATE_IDLE) {
            return
        }
        val mediaNotification = buildMediaNotification(session)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, mediaNotification.notification)
        if (player.playWhenReady && player.isPlaying) {
            try {
                startForeground(NOTIFICATION_ID, mediaNotification.notification)
            } catch (e: Exception) {
                android.util.Log.w("LAYAM_SERVICE", "[LAYAM_SERVICE] startForeground notice: ${e.message}")
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        android.util.Log.i("LAYAM_SERVICE", "[LAYAM_SERVICE] onStartCommand action=${intent?.action}")
        val res = super.onStartCommand(intent, flags, startId)
        mediaLibrarySession?.let { session ->
            postOrUpdateNotification(session)
        }
        return res
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? {
        return mediaLibrarySession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaLibrarySession?.player
        if (player == null || !player.playWhenReady || player.playbackState == Player.STATE_IDLE) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        mediaLibrarySession?.run {
            release()
            mediaLibrarySession = null
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Layam Hi-Fi Playback"
            val descriptionText = "Audiophile local audio playback and controls"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
                setSound(null, null)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Custom MediaLibrarySession.Callback handling Android Auto and external media browsers.
     */
    private inner class CustomMediaLibrarySessionCallback : MediaLibrarySession.Callback {

        override fun onGetLibraryRoot(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val rootItem = MediaItem.Builder()
                .setMediaId(ROOT_ID)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setIsBrowsable(true)
                        .setIsPlayable(false)
                        .setTitle("Layam Hi-Fi")
                        .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                        .build()
                )
                .build()
            return Futures.immediateFuture(LibraryResult.ofItem(rootItem, params))
        }

        override fun onGetChildren(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            parentId: String,
            page: Int,
            pageSize: Int,
            params: LibraryParams?
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
            val items = mutableListOf<MediaItem>()

            when (parentId) {
                ROOT_ID -> {
                    // Expose the 5 core navigation categories for Android Auto
                    val categories = listOf(
                        CATEGORY_TRACKS to "All Tracks",
                        CATEGORY_ALBUMS to "Albums",
                        CATEGORY_ARTISTS to "Artists",
                        CATEGORY_PLAYLISTS to "Playlists",
                        CATEGORY_FAVORITES to "Favorites"
                    )
                    for ((id, title) in categories) {
                        items.add(
                            MediaItem.Builder()
                                .setMediaId(id)
                                .setMediaMetadata(
                                    MediaMetadata.Builder()
                                        .setIsBrowsable(true)
                                        .setIsPlayable(false)
                                        .setTitle(title)
                                        .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                                        .build()
                                )
                                .build()
                        )
                    }
                }
                CATEGORY_TRACKS, CATEGORY_FAVORITES -> {
                    // Return scanned audio files from MediaStore
                    val scanner = com.layam.hifi.catalog.LayamMusicScanner(applicationContext)
                    val scanned = scanner.scanTracksDirect()
                    for (file in scanned) {
                        items.add(
                            MediaItem.Builder()
                                .setMediaId(file.uri.toString())
                                .setRequestMetadata(
                                    MediaItem.RequestMetadata.Builder()
                                        .setMediaUri(file.uri)
                                        .build()
                                )
                                .setMediaMetadata(
                                    MediaMetadata.Builder()
                                        .setIsBrowsable(false)
                                        .setIsPlayable(true)
                                        .setTitle(file.title)
                                        .setArtist(file.artist)
                                        .setAlbumTitle(file.album)
                                        .build()
                                )
                                .build()
                        )
                    }
                }
                else -> {
                    // Other folders
                }
            }

            return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(items), params))
        }

        override fun onGetItem(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            mediaId: String
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val item = MediaItem.Builder()
                .setMediaId(mediaId)
                .build()
            return Futures.immediateFuture(LibraryResult.ofItem(item, null))
        }
    }
}
