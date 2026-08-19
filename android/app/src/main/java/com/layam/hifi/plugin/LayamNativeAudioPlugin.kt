package com.layam.hifi.plugin

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResult
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.layam.hifi.playback.LayamAudioPlayerManager

/**
 * Capacitor Bridge Plugin for Layam Native Jetpack Media3 Audio, AudioFX DSP,
 * Runtime Media Permissions & Storage Access Framework / MediaStore.
 */
@CapacitorPlugin(
    name = "LayamNativeAudio",
    permissions = [
        Permission(
            alias = "audio",
            strings = [
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ]
        )
    ]
)
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

    private fun getRequiredPermission(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_AUDIO
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }
    }

    private fun hasRequiredPermission(): Boolean {
        val permission = getRequiredPermission()
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    @PluginMethod
    fun checkAudioPermission(call: PluginCall) {
        val permission = getRequiredPermission()
        val granted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().apply {
            put("granted", granted)
            put("permission", permission)
            put("sdkVersion", Build.VERSION.SDK_INT)
        })
    }

    @PluginMethod
    fun requestAudioPermission(call: PluginCall) {
        val permission = getRequiredPermission()
        if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) {
            call.resolve(JSObject().apply {
                put("granted", true)
                put("permission", permission)
                put("sdkVersion", Build.VERSION.SDK_INT)
            })
            return
        }

        requestPermissionForAlias("audio", call, "audioPermissionCallback")
    }

    @PermissionCallback
    private fun audioPermissionCallback(call: PluginCall) {
        val permission = getRequiredPermission()
        val granted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        android.util.Log.i("LAYAM_PERM", "[LAYAM_PERM] Permission callback for $permission: granted=$granted")
        call.resolve(JSObject().apply {
            put("granted", granted)
            put("permission", permission)
            put("sdkVersion", Build.VERSION.SDK_INT)
        })
    }

    @PluginMethod
    fun playTrack(call: PluginCall) {
        val uri = call.getString("uri")
        if (uri.isNullOrBlank()) {
            android.util.Log.e("LAYAM_PLAY", "[LAYAM_PLAY] playTrack REJECTED: URI is null or blank")
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

        val replayGainDb = if (call.data.has("replayGainDb")) call.getDouble("replayGainDb") ?: call.data.optDouble("replayGainDb", 0.0) else 0.0
        val replayGainPeak = if (call.data.has("replayGainPeak")) call.getDouble("replayGainPeak") ?: call.data.optDouble("replayGainPeak", 1.0) else 1.0

        val parsedUri = try { Uri.parse(uri) } catch (_: Exception) { null }
        android.util.Log.i("LAYAM_PLAY", "[LAYAM_PLAY] playTrack CALLED: uri=$uri title=$title artist=$artist album=$album positionMs=$positionMs replayGainDb=$replayGainDb peak=$replayGainPeak scheme=${parsedUri?.scheme} authority=${parsedUri?.authority}")

        activity?.runOnUiThread {
            try {
                playerManager.playTrack(uri, title, artist, album, artworkUri, positionMs, replayGainDb, replayGainPeak)
                android.util.Log.i("LAYAM_PLAY", "[LAYAM_PLAY] playTrack SUCCESS dispatch to playerManager")
                call.resolve(JSObject().apply { put("success", true) })
            } catch (e: Exception) {
                android.util.Log.e("LAYAM_PLAY", "[LAYAM_PLAY] playTrack EXCEPTION: ${e.javaClass.name} - ${e.message}", e)
                call.reject("Native playback failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun setNormalizerEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        activity?.runOnUiThread {
            playerManager.setNormalizerEnabled(enabled)
            call.resolve(JSObject().apply { put("success", true) })
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
        val act = activity
        val runnable = Runnable {
            try {
                val ret = JSObject().apply {
                    put("isPlaying", playerManager.isPlaying())
                    put("positionMs", playerManager.getPosition())
                    put("durationMs", playerManager.getDuration())
                    put("isNative", true)
                    put("uri", playerManager.currentUri)
                    put("title", playerManager.currentTitle)
                    put("artist", playerManager.currentArtist)
                    put("album", playerManager.currentAlbum)
                    put("artworkUri", playerManager.currentArtworkUri)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                android.util.Log.e("LAYAM_NATIVE", "[LAYAM_NATIVE] getPlaybackState error: ${e.message}")
                call.resolve(JSObject().apply {
                    put("isPlaying", false)
                    put("positionMs", 0L)
                    put("durationMs", 0L)
                    put("isNative", true)
                })
            }
        }

        if (act != null) {
            act.runOnUiThread(runnable)
        } else {
            android.os.Handler(android.os.Looper.getMainLooper()).post(runnable)
        }
    }

    @PluginMethod
    fun openDocumentPicker(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                "audio/*",
                "application/ogg",
                "application/x-flac",
                "application/octet-stream",
                "*/*"
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

    @PluginMethod
    fun scanDeviceAudioFiles(call: PluginCall) {
        if (!hasRequiredPermission()) {
            call.reject("Permission not granted: ${getRequiredPermission()}", "PERMISSION_DENIED")
            return
        }

        activity?.runOnUiThread {
            try {
                val filesArray = JSArray()
                val projection = arrayOf(
                    MediaStore.Audio.Media._ID,
                    MediaStore.Audio.Media.DISPLAY_NAME,
                    MediaStore.Audio.Media.TITLE,
                    MediaStore.Audio.Media.ARTIST,
                    MediaStore.Audio.Media.ALBUM,
                    MediaStore.Audio.Media.ALBUM_ID,
                    MediaStore.Audio.Media.DURATION,
                    MediaStore.Audio.Media.SIZE,
                    MediaStore.Audio.Media.MIME_TYPE
                )
                val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
                val cursor = context.contentResolver.query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    null,
                    "${MediaStore.Audio.Media.TITLE} ASC"
                )

                cursor?.use { c ->
                    val idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                    val nameCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                    val titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                    val artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                    val albumCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                    val albumIdCol = c.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)
                    val durCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                    val sizeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                    val mimeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)

                    while (c.moveToNext()) {
                        val id = c.getLong(idCol)
                        val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                        val name = c.getString(nameCol) ?: "audio_$id"
                        val title = c.getString(titleCol)?.takeIf { it.isNotBlank() } ?: name.substringBeforeLast('.')
                        val artist = c.getString(artistCol)?.takeIf { it.isNotBlank() && it != "<unknown>" } ?: "Local Artist"
                        val album = c.getString(albumCol)?.takeIf { it.isNotBlank() && it != "<unknown>" } ?: "Local Master Imports"
                        val albumId = if (albumIdCol >= 0 && !c.isNull(albumIdCol)) c.getLong(albumIdCol) else -1L
                        val coverImageUri = if (albumId >= 0) {
                            ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId).toString()
                        } else ""
                        val durationMs = if (durCol >= 0 && !c.isNull(durCol)) c.getLong(durCol) else 0L
                        val sizeBytes = if (sizeCol >= 0 && !c.isNull(sizeCol)) c.getLong(sizeCol) else 0L
                        val mimeType = if (mimeCol >= 0 && !c.isNull(mimeCol)) c.getString(mimeCol) else "audio/*"

                        val ext = name.substringAfterLast('.', "").lowercase()
                        val format = when {
                            ext == "flac" || mimeType?.contains("flac", ignoreCase = true) == true -> "FLAC"
                            ext == "mp3" || mimeType?.contains("mpeg", ignoreCase = true) == true -> "MP3"
                            ext == "m4a" || ext == "mp4" || mimeType?.contains("mp4", ignoreCase = true) == true -> "M4A"
                            ext == "aac" -> "AAC"
                            ext == "ogg" || mimeType?.contains("ogg", ignoreCase = true) == true -> "OGG"
                            ext == "wav" -> "WAV"
                            else -> ext.uppercase().ifBlank { "AUDIO" }
                        }

                        val fileObj = JSObject().apply {
                            put("uri", contentUri.toString())
                            put("name", name)
                            put("sizeBytes", sizeBytes)
                            put("mimeType", mimeType ?: "audio/*")
                            put("title", title)
                            put("artist", artist)
                            put("album", album)
                            put("coverImage", coverImageUri)
                            put("durationMs", durationMs)
                            put("bitrate", 0)
                            put("format", format)
                        }
                        filesArray.put(fileObj)
                    }
                }

                call.resolve(JSObject().apply {
                    put("files", filesArray)
                    put("count", filesArray.length())
                })
            } catch (e: Exception) {
                android.util.Log.e("LAYAM_SCAN", "Error scanning MediaStore", e)
                call.reject("Failed to scan media store: ${e.message}", e)
            }
        }
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
