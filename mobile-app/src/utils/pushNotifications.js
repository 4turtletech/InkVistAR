// mobile-app/src/utils/pushNotifications.js
// Expo Push Notification registration + listener setup

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

// How notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests notification permission and registers the Expo push token
 * with the backend for the given user.
 * @param {number|string} userId
 */
export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) {
    console.log('[PUSH] Skipping push registration on emulator/simulator.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PUSH] Permission not granted. Push notifications disabled.');
    return null;
  }

  // Android channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'InkVistAR Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DAA520',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[PUSH] Expo Push Token:', token);

    // Register with backend
    await fetch(`${API_BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        token,
        platform: Platform.OS,
      }),
    });

    console.log('[PUSH] ✅ Token registered with backend.');
    return token;
  } catch (err) {
    console.error('[PUSH] ❌ Failed to get/register push token:', err.message);
    return null;
  }
}

/**
 * Adds a listener that fires when user TAPS a notification.
 * Returns the subscription so you can remove it on unmount.
 * @param {function} onTap - receives the notification response object
 */
export function addNotificationTapListener(onTap) {
  return Notifications.addNotificationResponseReceivedListener(onTap);
}

/**
 * Adds a listener that fires when a notification arrives while the app is OPEN.
 * Returns the subscription so you can remove it on unmount.
 * @param {function} onReceive - receives the notification object
 */
export function addNotificationReceivedListener(onReceive) {
  return Notifications.addNotificationReceivedListener(onReceive);
}
