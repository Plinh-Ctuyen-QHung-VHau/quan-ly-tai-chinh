import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  NavigationContainerRefWithCurrent,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import { AddTransactionScreen } from "../screens/transactions/AddTransactionScreen";
import { TransactionConfirmScreen } from "../screens/transactions/TransactionConfirmScreen";
import { TransactionDetailScreen } from "../screens/transactions/TransactionDetailScreen";
import { TransactionEditScreen } from "../screens/transactions/TransactionEditScreen";
import { BudgetFormScreen } from "../screens/budget/BudgetFormScreen";
import { ProfileScreen } from "../screens/settings/ProfileScreen";
import { NotificationSettingsScreen } from "../screens/settings/NotificationSettingsScreen";
import { LoadingView } from "../components/LoadingView";
import { supabase } from "../services/supabaseClient";
import { getSession, signOut } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { setUnauthorizedHandler } from "../services/apiClient";
import { useNotificationStore } from "../store/notificationStore";
import { Budget } from "../types/budget";

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  AddTransaction: undefined;
  TransactionConfirm: undefined;
  TransactionDetail: { transactionId: string };
  TransactionEdit: { transactionId: string };
  BudgetForm: { mode?: "create" | "edit"; budget?: Budget } | undefined;
  Profile: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const isReady = useAuthStore((state) => state.isReady);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const currentSession = await getSession();
      setSession(currentSession);
      setReady(true);
      setBootstrapped(true);
    };

    bootstrap().catch((error) => {
      console.error("Failed to bootstrap session", error);
      setReady(true);
      setBootstrapped(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setBootstrapped(true);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [setReady, setSession]);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      try {
        await signOut();
      } catch (error) {
        console.warn("Unable to sign out after 401", error);
      }
      Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại.");
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const user_id = session?.user.id;
    const notificationStore = useNotificationStore.getState();

    if (!user_id) {
      void notificationStore.stopRealtime();
      return;
    }

    void notificationStore.startRealtime(user_id);
    return () => {
      void notificationStore.stopRealtime();
    };
  }, [session?.user.id]);

  const isAuthenticated = Boolean(session?.access_token);

  if (!bootstrapped || !isReady) {
    return <LoadingView label="Khởi tạo phiên đăng nhập..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
            />
            <Stack.Screen
              name="TransactionConfirm"
              component={TransactionConfirmScreen}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
            />
            <Stack.Screen
              name="TransactionEdit"
              component={TransactionEditScreen}
            />
            <Stack.Screen name="BudgetForm" component={BudgetFormScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
