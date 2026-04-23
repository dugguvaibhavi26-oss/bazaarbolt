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
        const title = notification.title || 'Notification';
        const body = notification.body || '';
        
        // Custom prominent toast for in-app notifications
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-2'} max-w-md w-full bg-white shadow-2xl rounded-3xl pointer-events-auto flex flex-col border border-zinc-100 overflow-hidden`}>
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-xl">notifications_active</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-zinc-900 tracking-tight">{title}</p>
                <p className="text-[10px] font-bold text-zinc-500 mt-0.5 leading-relaxed">{body}</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)} className="text-zinc-300 hover:text-zinc-500">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            {notification.data?.url && (
              <button 
                onClick={() => {
                  router.push(notification.data.url);
                  toast.dismiss(t.id);
                }}
                className="bg-zinc-50 border-t border-zinc-100 p-3 text-[9px] font-black tracking-widest text-primary uppercase hover:bg-zinc-100 transition-colors"
              >
                View Details
              </button>
            )}
          </div>
        ), { duration: 6000, position: 'top-center' });
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

    // Listeners are kept for the lifetime of the app as it sits in the root AuthProvider
    return () => {
      console.log('🔔 Push listeners maintained');
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
