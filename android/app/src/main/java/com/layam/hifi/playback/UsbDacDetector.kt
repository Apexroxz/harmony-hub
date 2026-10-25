package com.layam.hifi.playback

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Monitors and detects external USB DACs and high-fidelity output hardware.
 */
class UsbDacDetector(private val context: Context) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val _connectedDac = MutableStateFlow<AudioDeviceInfo?>(null)
    val connectedDac: StateFlow<AudioDeviceInfo?> = _connectedDac.asStateFlow()

    private val deviceCallback = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        object : AudioDeviceCallback() {
            override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
                scanDevices()
            }

            override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
                scanDevices()
            }
        }
    } else null

    fun startListening() {
        scanDevices()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && deviceCallback != null) {
            audioManager.registerAudioDeviceCallback(deviceCallback, null)
        }
    }

    fun stopListening() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && deviceCallback != null) {
            audioManager.unregisterAudioDeviceCallback(deviceCallback)
        }
    }

    private fun scanDevices() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            val dac = devices.firstOrNull { isUsbOrExternalDac(it) }
            _connectedDac.value = dac
            if (dac != null) {
                android.util.Log.i("LAYAM_DAC", "Detected external USB DAC: ${dac.productName} type=${dac.type}")
            }
        }
    }

    private fun isUsbOrExternalDac(device: AudioDeviceInfo): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
        return when (device.type) {
            AudioDeviceInfo.TYPE_USB_DEVICE,
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_USB_ACCESSORY -> true
            else -> false
        }
    }
}
