package com.bazaarbolt.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Explicitly initialize Firebase first
        try {
            FirebaseApp.initializeApp(this);
            Log.d(TAG, "FirebaseApp initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "FirebaseApp initialization failed", e);
        }
        
        // Force Token Generation immediately
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d(TAG, "FCM_TOKEN_ON_START: " + token);
            });
    }
}
