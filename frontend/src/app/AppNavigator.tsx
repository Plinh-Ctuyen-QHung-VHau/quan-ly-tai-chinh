import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { setupPushNotifications } from "../utils/notificationHandler";
import { useAppDataStore } from "../store/appDataStore";
import { dataInvalidation } from "../utils/dataInvalidation";
import * as Notifications from "expo-notifications";

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  AddTransaction: undefined;
  TransactionConfirm: undefined;
  TransactionDetail: { transaction_id: string };
  TransactionEdit: { transaction_id: string };
  BudgetForm: { mode?: "create" | "edit"; budget_id?: string } | undefined;
  Profile: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const safeContentStyle = { paddingTop: insets.top } as const;
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const is_ready = useAuthStore((state) => state.is_ready);
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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        // Đang trong flow reset password — KHÔNG navigate vào app
        // ForgotPasswordScreen sẽ tự gọi setSession sau khi đổi mật khẩu xong
        return;
      }
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

  // Listener: user tap notification -> navigate đến tab Notifications
  // Listener: foreground nhận push -> realtime đã tự prepend, không cần thêm
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      setTimeout(() => {
        // NavigationContainer chưa expose ref trực tiếp ở đây,
        // realtime store sẽ prepend notification tự động
      }, 300);
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    const user_id = session?.user.id;
    console.log("[AppNavigator] useEffect push notification triggered. user_id:", user_id);
    const notificationStore = useNotificationStore.getState();

    if (!user_id) {
      void notificationStore.stopRealtime();
      return;
    }

    void notificationStore.startRealtime(user_id);
    void setupPushNotifications(user_id);
    return () => {
      console.log("[AppNavigator] useEffect push notification cleanup!");
      void notificationStore.stopRealtime();
    };
  }, [session?.user.id]);

  const isAuthenticated = Boolean(session?.access_token);

  useEffect(() => {
    if (isAuthenticated) {
      void useAppDataStore.getState().initialize();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = dataInvalidation.subscribe((key) => {
      // Logic refresh đã được chuyển vào hàm invalidateData trung tâm để có delay chuẩn
      console.log(`[AppNavigator] Data invalidation event received: ${key}`);
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated]);

  if (!bootstrapped || !is_ready) {
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
              options={{ contentStyle: safeContentStyle }}
            />
            <Stack.Screen
              name="TransactionConfirm"
              component={TransactionConfirmScreen}
              options={{ contentStyle: safeContentStyle }}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ contentStyle: safeContentStyle }}
            />
            <Stack.Screen
              name="TransactionEdit"
              component={TransactionEditScreen}
              options={{ contentStyle: safeContentStyle }}
            />
            <Stack.Screen name="BudgetForm" component={BudgetFormScreen} options={{ contentStyle: safeContentStyle }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ contentStyle: safeContentStyle }} />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ contentStyle: safeContentStyle }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
