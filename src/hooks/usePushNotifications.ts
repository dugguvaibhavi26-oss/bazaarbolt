import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  PushNotifications, 
  Token, 
  ActionPerformed, 
  PushNotificationSchema 
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';

export const usePushNotifications = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const initialized = useRef(false);

  const saveTokenToBackend = useCallback(async (fcmToken: string) => {
    const user = auth.currentUser;
    if (!user) {
      console.log('⚠️ Notification: No user logged in, skipping token sync');
      return;
    }

    try {
      console.log('📡 Syncing FCM token to backend...');
      const response = await fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, fcmToken }),
      });
      
      if (response.ok) {
        console.log('✅ FCM Token successfully registered and topics subscribed');
      } else {
        console.error('❌ Failed to register FCM token:', await response.text());
      }
    } catch (e) {
      console.error('❌ Error syncing FCM token:', e);
    }
  }, []);

  const initPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || initialized.current) return;
    initialized.current = true;

    try {
      console.log('🚀 Initializing Push Notifications...');

      // 1. Check/Request Permissions
      let permission = await PushNotifications.checkPermissions();
      console.log('📊 Initial Permission State:', permission.receive);

      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
        console.log('📊 Permission After Request:', permission.receive);
      }

      if (permission.receive !== 'granted') {
        console.warn('❌ Push notification permission denied');
        return;
      }

      // 2. Register with FCM
      await PushNotifications.register();

      // 3. Listeners
      PushNotifications.addListener('registration', (t: Token) => {
        console.log('✅ FCM Registration Success, Token:', t.value);
        setToken(t.value);
        saveTokenToBackend(t.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ FCM Registration Error:', JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('📩 Push Received (Foreground):', notification);
        const message = notification.body || notification.title || 'New Notification';
        toast.success(message, { 
          duration: 4000,
          position: 'top-center'
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('👉 Push Action Performed:', notification.actionId, notification.notification);
        // Handle deep linking or navigation
        const data = notification.notification.data;
        if (data && data.url) {
          router.push(data.url);
        }
      });

    } catch (e) {
      console.error('❌ Error during Push initialization:', e);
    }
  }, [saveTokenToBackend]);

  useEffect(() => {
    initPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      if (Capacitor.isNativePlatform()) {
        console.log('🧹 Cleaning up Push listeners');
        PushNotifications.removeAllListeners();
      }
    };
  }, [initPushNotifications]);

  // Sync token when auth state changes (e.g., user logs in or auth loads after token is ready)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && token) {
        saveTokenToBackend(token);
      }
    });
    return () => unsubscribe();
  }, [token, saveTokenToBackend]);

  return { token };
};
