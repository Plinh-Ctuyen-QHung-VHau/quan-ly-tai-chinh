import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenHero } from "../../components/ScreenHero";
import { signOut } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { COLORS, shadow } from "../../constants/ui";

interface SettingItemProps {
  icon: keyof typeof Ionicons.prototype.allNames | string;
  label: string;
  onPress: () => void;
  color?: string;
  rightLabel?: string;
  isLast?: boolean;
}

function SettingItem({ icon, label, onPress, color = COLORS.dark, rightLabel, isLast }: SettingItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        !isLast && styles.itemBorder,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
      <View style={styles.itemRight}>
        {rightLabel ? <Text style={styles.itemRightLabel}>{rightLabel}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted2} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert(
              "Không thể đăng xuất",
              error instanceof Error ? error.message : "Đã xảy ra lỗi.",
            );
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Cài đặt"
        title="Thiết lập"
        subtitle="Quản lý tài khoản và ứng dụng"
      />

      {/* Profile Summary */}
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() || "U"}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
        </View>

      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <View style={styles.group}>
          <SettingItem
            icon="person-outline"
            label="Hồ sơ cá nhân"
            onPress={() => navigation.navigate("Profile")}
            color={COLORS.blue}
          />
          <SettingItem
            icon="notifications-outline"
            label="Thông báo"
            onPress={() => navigation.navigate("NotificationSettings")}
            color="#D97706"
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Bảo mật"
            onPress={() => { }}
            color={COLORS.income}
            isLast
          />
        </View>
      </View>



      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.itemPressed,
          ]}
          onPress={() => void handleLogout()}
        >
          <View style={[styles.iconBox, { backgroundColor: COLORS.expenseSoft }]}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.expense} />
          </View>
          <Text style={[styles.itemLabel, { color: COLORS.expense }]}>Đăng xuất</Text>
        </Pressable>
      </View>

      <Text style={styles.versionText}>Phiên bản 1.0.0 (Stable)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 40,
    paddingBottom: 100,
    backgroundColor: COLORS.bg,
  },
  profileCard: {
    ...shadow,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 2,
  },
  profileStatus: {
    fontSize: 12,
    color: COLORS.income,
    fontWeight: "700",
  },
  editProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.blueLight,
    borderRadius: 999,
  },
  editProfileText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: "900",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 10,
  },
  group: {
    ...shadow,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  itemPressed: {
    backgroundColor: "#F8FAFC",
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemRightLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginRight: 8,
    fontWeight: "600",
  },
  logoutBtn: {
    ...shadow,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  versionText: {
    textAlign: "center",
    color: COLORS.muted2,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
});
