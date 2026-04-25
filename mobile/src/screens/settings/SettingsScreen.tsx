import React from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { signOut } from "../../services/authService";

export function SettingsScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Không thể đăng xuất",
        error instanceof Error ? error.message : "Đã xảy ra lỗi.",
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Cài đặt</Text>
        <AppButton
          title="Hồ sơ"
          variant="secondary"
          onPress={() => navigation.navigate("Profile")}
        />
        <Text style={styles.spacer} />
        <AppButton
          title="Cài đặt thông báo"
          variant="secondary"
          onPress={() => navigation.navigate("NotificationSettings")}
        />
        <Text style={styles.spacer} />
        <AppButton
          title="Đăng xuất"
          variant="danger"
          onPress={() => void handleLogout()}
        />
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 14,
  },
  spacer: {
    height: 10,
  },
});
