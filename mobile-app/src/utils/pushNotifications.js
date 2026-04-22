// mobile-app/src/utils/pushNotifications.js
// Expo Push Notification registration + listener setup
// Guarded: gracefully skips in Expo Go (push removed from Expo Go in SDK 53+)

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

// Detect if running in Expo Go (push is not supported there since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

let Notifications = null;

// Dynamically load and configure notifications only when NOT in Expo Go
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[PUSH] expo-notifications unavailable:', e.message);
  }
}

/**
 * Requests notification permission and registers the Expo push token
 * with the backend for the given user.
 * @param {number|string} userId
 */
export async function registerForPushNotifications(userId) {
  if (isExpoGo) {
    console.log('[PUSH] Skipping push registration in Expo Go (not supported since SDK 53).');
    return null;
  }

  if (!Notifications) {
    console.log('[PUSH] Notifications module not available.');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[PUSH] Skipping push registration on emulator/simulator.');
    return null;
  }

  try {
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

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[PUSH] No EAS projectId found in app.json. Push tokens will not work.');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
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

    console.log('[PUSH] Token registered with backend.');
    return token;
  } catch (err) {
    console.error('[PUSH] Failed to get/register push token:', err.message);
    return null;
  }
}

/**
 * Adds a listener that fires when user TAPS a notification.
 * Returns the subscription so you can remove it on unmount.
 * @param {function} onTap - receives the notification response object
 */
export function addNotificationTapListener(onTap) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(onTap);
}

/**
 * Adds a listener that fires when a notification arrives while the app is OPEN.
 * Returns the subscription so you can remove it on unmount.
 * @param {function} onReceive - receives the notification object
 */
export function addNotificationReceivedListener(onReceive) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(onReceive);
}
