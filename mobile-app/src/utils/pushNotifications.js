// mobile-app/src/utils/pushNotifications.js
// Expo Push Notification registration + listener setup
// Guarded: gracefully skips in Expo Go (push removed from Expo Go in SDK 53+)

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetchAPI } from './api';

// Detect if running in Expo Go (push is not supported there since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

let Notifications = null;

// Dynamically load and configure notifications only when NOT in Expo Go
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[PUSH] expo-notifications unavailable:', e.message);
  }
}

const syncPushToken = async (userId, token) => {
  const result = await fetchAPI('/push/register', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      token,
      platform: Platform.OS,
    }),
  });

  if (!result.success) {
    throw new Error(result.message || 'The push token could not be registered.');
  }
};

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
    // Android 13+ permission prompts are associated with a notification channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'InkVistAR Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DAA520',
        sound: 'default',
      });
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

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn('[PUSH] No EAS projectId found in app.json. Push tokens will not work.');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await syncPushToken(userId, token);

    console.log(`[PUSH] ${Platform.OS} token registered with backend.`);
    return token;
  } catch (err) {
    console.error('[PUSH] Failed to get/register push token:', err.message);
    throw err;
  }
}

/** Keep the backend synchronized if APNs or FCM rotates the native push token. */
export function addPushTokenChangeListener(userId) {
  if (!Notifications || !userId) return { remove: () => {} };
  return Notifications.addPushTokenListener(async () => {
    try {
      await registerForPushNotifications(userId);
    } catch (error) {
      console.warn('[PUSH] Token refresh registration failed:', error.message);
    }
  });
}

/** Remove only this device platform's token before clearing the login session. */
export async function unregisterPushNotifications(userId) {
  if (isExpoGo || !Notifications || !userId) return { success: true };
  return fetchAPI('/push/register', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId, platform: Platform.OS }),
  });
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

export async function getLastNotificationResponse() {
  if (!Notifications) return null;
  return Notifications.getLastNotificationResponseAsync();
}

export async function clearLastNotificationResponse() {
  if (!Notifications?.clearLastNotificationResponseAsync) return;
  await Notifications.clearLastNotificationResponseAsync();
}
