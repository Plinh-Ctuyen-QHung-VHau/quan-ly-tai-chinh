import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { HomeScreen } from "../screens/home/HomeScreen";
import { TransactionHistoryScreen } from "../screens/transactions/TransactionHistoryScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { COLORS, shadow } from "../constants/ui";

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
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { fontWeight: "900", color: COLORS.dark, fontSize: 18 },
        tabBarActiveTintColor: COLORS.blue,
        tabBarInactiveTintColor: COLORS.muted2,
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 12,
          right: 12,
          height: 64,
          borderRadius: 24,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          paddingBottom: 12,
          paddingTop: 12,
          ...shadow,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "800",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Transactions") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else if (route.name === "Budget") {
            iconName = focused ? "pie-chart" : "pie-chart-outline";
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Tổng quan", headerShown: false }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionHistoryScreen}
        options={{ title: "Giao dịch", headerShown: false }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ title: "Ngân sách", headerShown: false }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Thông báo", headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Cài đặt", headerShown: false }}
      />
    </Tab.Navigator>
  );
}
