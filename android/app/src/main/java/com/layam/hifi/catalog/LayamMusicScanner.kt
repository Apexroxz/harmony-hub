package com.layam.hifi.catalog

import android.content.ContentUris
import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.MediaStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class TrackItem(
    val id: Long,
    val title: String,
    val artist: String,
    val album: String,
    val durationMs: Long,
    val uri: Uri,
    val artworkUri: Uri?,
    val mimeType: String,
    val bitDepth: Int = 24,
    val sampleRate: Int = 96000,
    val bitrateKbps: Int = 0,
    val replayGainDb: Float = 0.0f
)

class LayamMusicScanner(private val context: Context) {

    suspend fun scanLocalLosslessTracks(): List<TrackItem> = withContext(Dispatchers.IO) {
        val trackList = mutableListOf<TrackItem>()
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.SIZE
        )

        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

        context.contentResolver.query(collection, projection, selection, null, sortOrder)?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
            val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                var title = cursor.getString(titleCol) ?: "Unknown Track"
                var artist = cursor.getString(artistCol) ?: "Unknown Artist"
                var album = cursor.getString(albumCol) ?: "Unknown Album"
                var duration = cursor.getLong(durationCol)
                val albumId = cursor.getLong(albumIdCol)
                val mimeType = cursor.getString(mimeCol) ?: "audio/*"

                val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                val artworkUri = ContentUris.withAppendedId(
                    Uri.parse("content://media/external/audio/albumart"),
                    albumId
                )

                var sampleRate = 44100
                var bitrateKbps = 0
                var replayGainDb = 0.0f

                // Metadata extraction fallback when MediaStore has generic tags
                if (artist == "<unknown>" || artist.isBlank() || title.startsWith("track_") || duration <= 0) {
                    try {
                        val retriever = MediaMetadataRetriever()
                        retriever.setDataSource(context, contentUri)
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)?.let { t ->
                            if (t.isNotBlank()) title = t
                        }
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)?.let { a ->
                            if (a.isNotBlank()) artist = a
                        }
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)?.let { alb ->
                            if (alb.isNotBlank()) album = alb
                        }
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?.let { d ->
                            if (d > 0) duration = d
                        }
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toIntOrNull()?.let { b ->
                            bitrateKbps = b / 1000
                        }
                        retriever.release()
                    } catch (_: Exception) {}
                }

                val bitDepth = if (mimeType.contains("flac") || mimeType.contains("wav")) 24 else 16
                if (mimeType.contains("flac") || mimeType.contains("wav")) {
                    sampleRate = 96000
                }

                trackList.add(
                    TrackItem(
                        id = id,
                        title = title,
                        artist = artist,
                        album = album,
                        durationMs = duration,
                        uri = contentUri,
                        artworkUri = artworkUri,
                        mimeType = mimeType,
                        bitDepth = bitDepth,
                        sampleRate = sampleRate,
                        bitrateKbps = bitrateKbps,
                        replayGainDb = replayGainDb
                    )
                )
            }
        }
        trackList
    }

    fun scanTracksDirect(): List<TrackItem> {
        val trackList = mutableListOf<TrackItem>()
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.MIME_TYPE
        )
        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

        try {
            context.contentResolver.query(collection, projection, selection, null, sortOrder)?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val title = cursor.getString(titleCol) ?: "Unknown Track"
                    val artist = cursor.getString(artistCol) ?: "Unknown Artist"
                    val album = cursor.getString(albumCol) ?: "Unknown Album"
                    val duration = cursor.getLong(durationCol)
                    val albumId = cursor.getLong(albumIdCol)
                    val mimeType = cursor.getString(mimeCol) ?: "audio/*"
                    val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                    val artworkUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId)

                    trackList.add(
                        TrackItem(
                            id = id,
                            title = title,
                            artist = artist,
                            album = album,
                            durationMs = duration,
                            uri = contentUri,
                            artworkUri = artworkUri,
                            mimeType = mimeType
                        )
                    )
                }
            }
        } catch (_: Exception) {}
        return trackList
    }
}

