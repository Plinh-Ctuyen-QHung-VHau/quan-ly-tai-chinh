import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { HomeScreen } from "../screens/home/HomeScreen";
import { TransactionHistoryScreen } from "../screens/transactions/TransactionHistoryScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Budget: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Tổng quan" }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionHistoryScreen}
        options={{ title: "Giao dịch" }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ title: "Ngân sách" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Thông báo" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Cài đặt" }}
      />
    </Tab.Navigator>
  );
}
