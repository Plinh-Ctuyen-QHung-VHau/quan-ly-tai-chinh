import "react-native-url-polyfill/auto";

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AppNavigator } from "./src/app/AppNavigator";
import { ChatBubble } from "./src/components/ChatBubble";
import { useAuthStore } from "./src/store/authStore";

function AppContent() {
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = Boolean(session?.access_token);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
      {isAuthenticated && <ChatBubble />}
    </SafeAreaProvider>
  );
}

export default function App() {
  return <AppContent />;
}
