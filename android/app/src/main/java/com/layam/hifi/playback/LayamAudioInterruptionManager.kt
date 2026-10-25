package com.layam.hifi.playback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build

/**
 * Manages phone calls, transient audio focus interruptions (GPS, alarms, notifications),
 * and audio becoming noisy events (wired/USB/Bluetooth disconnects).
 */
class LayamAudioInterruptionManager(
    private val context: Context,
    private val onPlayStateChange: (shouldPlay: Boolean, duckVolume: Float) -> Unit
) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var focusRequest: AudioFocusRequest? = null
    private var isReceiverRegistered = false

    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                // Instantly pause when headphones/DAC are unplugged to prevent speaker blast
                onPlayStateChange(false, 1.0f)
            }
        }
    }

    private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                onPlayStateChange(true, 1.0f)
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Lower volume for notifications or GPS navigation
                onPlayStateChange(true, 0.2f)
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                // Pause for phone calls or alarms
                onPlayStateChange(false, 1.0f)
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                // Permanent loss (another music app started)
                onPlayStateChange(false, 1.0f)
            }
        }
    }

    fun requestAudioFocus(): Boolean {
        registerNoisyReceiver()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()

            focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(focusChangeListener)
                .build()

            audioManager.requestAudioFocus(focusRequest!!) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                focusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    fun abandonAudioFocus() {
        unregisterNoisyReceiver()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(focusChangeListener)
        }
    }

    private fun registerNoisyReceiver() {
        if (!isReceiverRegistered) {
            context.registerReceiver(
                noisyReceiver,
                IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
            )
            isReceiverRegistered = true
        }
    }

    private fun unregisterNoisyReceiver() {
        if (isReceiverRegistered) {
            try {
                context.unregisterReceiver(noisyReceiver)
            } catch (_: IllegalArgumentException) {}
            isReceiverRegistered = false
        }
    }
}
