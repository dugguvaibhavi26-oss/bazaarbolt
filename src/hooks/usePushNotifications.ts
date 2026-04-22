import { useEffect, useState } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      initPushNotifications();
    }
  }, []);

  const initPushNotifications = async () => {
    try {
      // Request permission to use push notifications
      let permission = await PushNotifications.checkPermissions();
      
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      // Register with Apple / Google to receive push via APNs/FCM
      await PushNotifications.register();

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        setToken(token.value);
        saveTokenToFirestore(token.value);
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));
        const message = notification.body 
          ? `${notification.title}: ${notification.body}`
          : (notification.title || 'New Notification');
        
        toast.success(message, {
            duration: 5000,
        });
      });

      // Method called when an action is performed on the push notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        // You can handle navigation here based on notification data
      });

    } catch (e) {
      console.error('Error initializing push notifications', e);
    }
  };

  const saveTokenToFirestore = async (fcmToken: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, fcmToken }),
      });
      console.log('FCM Token registered and topics subscribed');
    } catch (e) {
      console.error('Error registering FCM token', e);
    }
  };

  return { token };
};
