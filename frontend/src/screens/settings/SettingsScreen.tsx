import React from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { ScreenHero } from "../../components/ScreenHero";
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
      <ScreenHero
        kicker="Cài đặt"
        title="Trung tâm thiết lập"
        subtitle="Quản lý hồ sơ, thông báo và bảo mật tài khoản của bạn."
      />

      <AppCard style={styles.card}>
        <Text style={styles.title}>Tùy chọn tài khoản</Text>
        <AppButton
          title="Hồ sơ"
          variant="secondary"
          onPress={() => navigation.navigate("Profile")}
        />
        <Text style={styles.spacer} />
        <AppButton
          title="Thiết lập ngân sách"
          variant="secondary"
          onPress={() => navigation.navigate("Budget")}
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
    padding: 16,
    backgroundColor: "#EEF2F7",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DCE4EE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 14,
  },
  spacer: {
    height: 10,
  },
});
