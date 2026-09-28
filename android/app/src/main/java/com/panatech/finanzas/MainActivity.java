package com.panatech.finanzas;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AccountPickerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
