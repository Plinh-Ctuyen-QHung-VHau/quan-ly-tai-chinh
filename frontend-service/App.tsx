import "react-native-url-polyfill/auto";

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AppNavigator } from "./src/app/AppNavigator";

import { ChatBubble } from "./src/components/ChatBubble";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
      <ChatBubble />
    </SafeAreaProvider>
  );
}
