package com.layam.hifi.playback

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioMixerAttributes
import android.os.Build
import androidx.annotation.RequiresApi

/**
 * Android 14+ (API 34+) Bit-Perfect Controller.
 * Configures hardware mixer attributes to MIXER_BEHAVIOR_BIT_PERFECT for attached USB DACs.
 */
class LayamBitPerfectController(private val context: Context) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    fun applyBitPerfectIfAvailable(targetDevice: AudioDeviceInfo?, sampleRate: Int, channelCount: Int): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && targetDevice != null) {
            return setBitPerfectMixer(targetDevice, sampleRate, channelCount)
        }
        return false
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private fun setBitPerfectMixer(device: AudioDeviceInfo, sampleRate: Int, channelCount: Int): Boolean {
        val channelMask = if (channelCount == 1) AudioFormat.CHANNEL_OUT_MONO else AudioFormat.CHANNEL_OUT_STEREO
        val audioFormat = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
            .setSampleRate(sampleRate)
            .setChannelMask(channelMask)
            .build()

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build()

        val mixerAttributes = AudioMixerAttributes.Builder(audioFormat)
            .setMixerBehavior(AudioMixerAttributes.MIXER_BEHAVIOR_BIT_PERFECT)
            .build()

        return try {
            audioManager.setPreferredMixerAttributes(audioAttributes, device, mixerAttributes)
        } catch (e: Exception) {
            android.util.Log.w("LAYAM_BITPERFECT", "Could not setPreferredMixerAttributes: ${e.message}")
            false
        }
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    fun clearBitPerfect(device: AudioDeviceInfo) {
        try {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .build()

            audioManager.clearPreferredMixerAttributes(audioAttributes, device)
        } catch (_: Exception) {}
    }
}
