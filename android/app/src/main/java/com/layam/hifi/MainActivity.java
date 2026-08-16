package com.layam.hifi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.layam.hifi.plugin.LayamNativeAudioPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LayamNativeAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
