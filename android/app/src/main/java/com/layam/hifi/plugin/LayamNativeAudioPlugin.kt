package com.layam.hifi.plugin

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.layam.hifi.playback.LayamAudioPlayerManager
import org.json.JSONObject

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
        val positionMs = call.getLong("positionMs") ?: 0L

        activity?.runOnUiThread {
            playerManager.playTrack(uri, title, artist, album, artworkUri, positionMs)
            call.resolve(JSObject().apply {
                put("success", true)
            })
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
        val positionMs = call.getLong("positionMs")
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
        val volume = call.getFloat("volume") ?: 1.0f
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
        val isPlaying = playerManager.isPlaying()
        val pos = playerManager.getPosition()
        val dur = playerManager.getDuration()

        val ret = JSObject().apply {
            put("isPlaying", isPlaying)
            put("positionMs", pos)
            put("durationMs", dur)
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

        if (dataIntent?.clipData != null) {
            val clipData = dataIntent.clipData!!
            for (i in 0 until clipData.itemCount) {
                val uri = clipData.getItemAt(i).uri
                persistUriPermission(uri)
                filesArray.put(uri.toString())
            }
        } else if (dataIntent?.data != null) {
            val uri = dataIntent.data!!
            persistUriPermission(uri)
            filesArray.put(uri.toString())
        }

        val ret = JSObject().apply {
            put("cancelled", false)
            put("files", filesArray)
        }
        call.resolve(ret)
    }

    private fun persistUriPermission(uri: Uri) {
        try {
            val takeFlags: Int = Intent.FLAG_GRANT_READ_URI_PERMISSION
            context.contentResolver.takePersistableUriPermission(uri, takeFlags)
        } catch (e: Exception) {
            // Ignored if uri is not persistable
        }
    }

    // ── LayamAudioPlayerManager.PlaybackListener Callbacks ──

    override fun onPlaybackStateChanged(
        isPlaying: Boolean,
        state: String,
        positionMs: Long,
        durationMs: Long
    ) {
        val data = JSObject().apply {
            put("isPlaying", isPlaying)
            put("state", state)
            put("positionMs", positionMs)
            put("durationMs", durationMs)
        }
        notifyListeners("onPlaybackStateChanged", data)
    }

    override fun onPositionDiscontinuity(positionMs: Long) {
        val data = JSObject().apply {
            put("positionMs", positionMs)
        }
        notifyListeners("onPositionDiscontinuity", data)
    }

    override fun onTrackChanged(
        title: String?,
        artist: String?,
        album: String?,
        artworkUri: String?,
        durationMs: Long
    ) {
        val data = JSObject().apply {
            put("title", title ?: "Unknown Track")
            put("artist", artist ?: "Unknown Artist")
            put("album", album ?: "Layam Vault")
            put("artworkUri", artworkUri)
            put("durationMs", durationMs)
        }
        notifyListeners("onTrackChanged", data)
    }

    override fun onError(errorCode: Int, errorMessage: String) {
        val data = JSObject().apply {
            put("errorCode", errorCode)
            put("errorMessage", errorMessage)
        }
        notifyListeners("onError", data)
    }
}
