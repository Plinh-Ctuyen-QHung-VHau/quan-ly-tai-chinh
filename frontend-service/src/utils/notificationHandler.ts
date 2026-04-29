import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { updateNotificationSettings } from "../services/notificationApi";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Failed to get push token for push notification!");
      return;
    }

    // Get projectId from constants
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId || 
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("No projectId found. Please run 'npx eas project:init' or set it in app.json");
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
      console.log("Push Token:", token);
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    console.warn("Must use physical device for Push Notifications");
  }

  return token;
}

export async function setupPushNotifications(userId: string) {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await updateNotificationSettings({
        push_token: token,
      } as any);
    }
  } catch (error) {
    console.error("Error setting up push notifications:", error);
  }
}
