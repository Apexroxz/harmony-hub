package com.layam.hifi.plugin

import android.app.Activity
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.layam.hifi.playback.LayamAudioPlayerManager

/**
 * Capacitor Bridge Plugin for Layam Native Jetpack Media3 Audio, AudioFX DSP & Storage Access Framework.
 */
@CapacitorPlugin(name = "LayamNativeAudio")
class LayamNativeAudioPlugin : Plugin(), LayamAudioPlayerManager.PlaybackListener {

    private lateinit var playerManager: LayamAudioPlayerManager

    override fun load() {
        super.load()
        playerManager = LayamAudioPlayerManager.getInstance(context)
        playerManager.addListener(this)
    }

    override fun handleOnDestroy() {
        playerManager.removeListener(this)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun playTrack(call: PluginCall) {
        val uri = call.getString("uri")
        if (uri.isNullOrBlank()) {
            call.reject("URI is required")
            return
        }

        val title = call.getString("title")
        val artist = call.getString("artist")
        val album = call.getString("album")
        val artworkUri = call.getString("artworkUri")
        val positionMs = call.getDouble("positionMs")?.toLong()
            ?: call.getInt("positionMs")?.toLong()
            ?: call.getLong("positionMs")
            ?: call.data.optLong("positionMs", 0L)

        activity?.runOnUiThread {
            try {
                playerManager.playTrack(uri, title, artist, album, artworkUri, positionMs)
                call.resolve(JSObject().apply { put("success", true) })
            } catch (e: Exception) {
                call.reject("Native playback failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity?.runOnUiThread {
            playerManager.pause()
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        activity?.runOnUiThread {
            playerManager.resume()
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = call.getDouble("positionMs")?.toLong()
            ?: call.getInt("positionMs")?.toLong()
            ?: call.getLong("positionMs")
            ?: if (call.data.has("positionMs")) call.data.optLong("positionMs", 0L) else null

        if (positionMs == null) {
            call.reject("positionMs is required")
            return
        }

        activity?.runOnUiThread {
            playerManager.seekTo(positionMs)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val volume = call.getDouble("volume")?.toFloat()
            ?: call.getFloat("volume")
            ?: call.getInt("volume")?.toFloat()
            ?: 1.0f
        activity?.runOnUiThread {
            playerManager.setVolume(volume)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun setEqualizerEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: true
        activity?.runOnUiThread {
            playerManager.setEqualizerEnabled(enabled)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun setEqualizerGains(call: PluginCall) {
        val gainsArray = call.getArray("gains")
        val gainsList = mutableListOf<Double>()
        if (gainsArray != null) {
            for (i in 0 until gainsArray.length()) {
                gainsList.add(gainsArray.optDouble(i, 0.0))
            }
        }
        activity?.runOnUiThread {
            playerManager.setEqualizerGains(gainsList)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun setBassBoostStrength(call: PluginCall) {
        val strength = call.getInt("strength") ?: 0
        activity?.runOnUiThread {
            playerManager.setBassBoostStrength(strength)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun setVirtualizerStrength(call: PluginCall) {
        val strength = call.getInt("strength") ?: 0
        activity?.runOnUiThread {
            playerManager.setVirtualizerStrength(strength)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    @PluginMethod
    fun getPlaybackState(call: PluginCall) {
        val ret = JSObject().apply {
            put("isPlaying", playerManager.isPlaying())
            put("positionMs", playerManager.getPosition())
            put("durationMs", playerManager.getDuration())
            put("isNative", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun openDocumentPicker(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "audio/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                "audio/*",
                "audio/mpeg",
                "audio/mp4",
                "audio/aac",
                "audio/ogg",
                "audio/flac",
                "application/ogg",
                "application/x-flac"
            ))
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        }
        startActivityForResult(call, intent, "handlePickerResult")
    }

    @ActivityCallback
    private fun handlePickerResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK) {
            call.resolve(JSObject().apply {
                put("cancelled", true)
                put("files", JSArray())
            })
            return
        }

        val dataIntent = result.data
        val filesArray = JSArray()
        val uris = mutableListOf<Uri>()

        if (dataIntent?.clipData != null) {
            val clipData = dataIntent.clipData!!
            for (i in 0 until clipData.itemCount) {
                uris.add(clipData.getItemAt(i).uri)
            }
        } else if (dataIntent?.data != null) {
            uris.add(dataIntent.data!!)
        }

        uris.forEach { uri ->
            persistUriPermission(uri)
            filesArray.put(readAudioFileInfo(uri))
        }

        call.resolve(JSObject().apply {
            put("cancelled", false)
            put("files", filesArray)
        })
    }

    private fun persistUriPermission(uri: Uri) {
        try {
            context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (_: Exception) {
            // Some providers issue non-persistable URIs; the current grant remains valid for this session.
        }
    }

    private fun readAudioFileInfo(uri: Uri): JSObject {
        val resolver = context.contentResolver
        var displayName = "audio_master"
        var sizeBytes = 0L
        try {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (nameIndex >= 0) displayName = cursor.getString(nameIndex) ?: displayName
                    if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) sizeBytes = cursor.getLong(sizeIndex)
                }
            }
        } catch (_: Exception) {}

        var title: String? = null
        var artist: String? = null
        var album: String? = null
        var durationMs = 0L
        var bitrate = 0
        var mimeType: String? = resolver.getType(uri)

        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, uri)
            title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
            artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
            album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
            durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            bitrate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toIntOrNull() ?: 0
            mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE) ?: mimeType
        } catch (_: Exception) {
            // Metadata is best-effort; ExoPlayer remains the authoritative decoder.
        } finally {
            try { retriever.release() } catch (_: Exception) {}
        }

        val cleanTitle = title?.takeIf { it.isNotBlank() } ?: displayName.substringBeforeLast('.', displayName)
        val extension = displayName.substringAfterLast('.', "").lowercase()
        val format = when {
            extension == "flac" || mimeType?.contains("flac", ignoreCase = true) == true -> "FLAC"
            extension == "mp3" || mimeType?.contains("mpeg", ignoreCase = true) == true -> "MP3"
            extension == "m4a" || extension == "mp4" || mimeType?.contains("mp4", ignoreCase = true) == true -> "M4A"
            extension == "aac" -> "AAC"
            extension == "ogg" || mimeType?.contains("ogg", ignoreCase = true) == true -> "OGG"
            extension == "wav" -> "WAV"
            else -> extension.uppercase().ifBlank { "AUDIO" }
        }

        return JSObject().apply {
            put("uri", uri.toString())
            put("name", displayName)
            put("sizeBytes", sizeBytes)
            put("mimeType", mimeType ?: "audio/*")
            put("title", cleanTitle)
            put("artist", artist?.takeIf { it.isNotBlank() } ?: "Local Artist")
            put("album", album?.takeIf { it.isNotBlank() } ?: "Local Master Imports")
            put("durationMs", durationMs)
            put("bitrate", bitrate)
            put("format", format)
        }
    }

    override fun onPlaybackStateChanged(isPlaying: Boolean, state: String, positionMs: Long, durationMs: Long) {
        notifyListeners("onPlaybackStateChanged", JSObject().apply {
            put("isPlaying", isPlaying)
            put("state", state)
            put("positionMs", positionMs)
            put("durationMs", durationMs)
        })
    }

    override fun onPositionDiscontinuity(positionMs: Long) {
        notifyListeners("onPositionDiscontinuity", JSObject().apply { put("positionMs", positionMs) })
    }

    override fun onTrackChanged(title: String?, artist: String?, album: String?, artworkUri: String?, durationMs: Long) {
        notifyListeners("onTrackChanged", JSObject().apply {
            put("title", title ?: "Unknown Track")
            put("artist", artist ?: "Unknown Artist")
            put("album", album ?: "Layam Vault")
            put("artworkUri", artworkUri)
            put("durationMs", durationMs)
        })
    }

    override fun onError(errorCode: Int, errorMessage: String) {
        notifyListeners("onError", JSObject().apply {
            put("errorCode", errorCode)
            put("errorMessage", errorMessage)
        })
    }
}
