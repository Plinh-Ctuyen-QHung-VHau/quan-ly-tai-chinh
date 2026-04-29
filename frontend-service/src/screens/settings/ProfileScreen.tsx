import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import { getMyProfile, updateMyProfile } from "../../services/identityApi";
import { UserProfile } from "../../types/user";

function getInitials(name: string) {
  const text = name.trim() || "U";

  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [full_name, setfull_name] = useState("");
  const [avatar_url, setavatar_url] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMyProfile();

      setProfile(result);
      setfull_name(result.full_name ?? "");
      setavatar_url(result.avatar_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const result = await updateMyProfile({
        fullName: full_name.trim(),
        avatarUrl: avatar_url.trim() || undefined,
      });

      setProfile(result);
      Alert.alert("Đã lưu", "Hồ sơ đã được cập nhật.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Hồ sơ"
        title="Thông tin tài khoản"
        subtitle="Cập nhật tên, ảnh đại diện và thông tin hiển thị của bạn."
      />

      <AppCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(full_name)}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {full_name || "Người dùng"}
            </Text>
          </View>
        </View>

        {profile ? (
          <Text style={styles.user_id} numberOfLines={1}>
            Mã người dùng: {profile.id}
          </Text>
        ) : null}
      </AppCard>

      <AppCard style={styles.card}>
        <SectionHeader
          title="Thông tin hồ sơ"
          subtitle="Các trường này sẽ được dùng ở tài khoản của bạn."
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppInput
          label="Họ và tên"
          value={full_name}
          onChangeText={setfull_name}
          placeholder="VD: Nguyễn Văn A"
        />

        <AppInput
          label="Ảnh đại diện"
          value={avatar_url}
          onChangeText={setavatar_url}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <AppButton
          title={saving ? "Đang lưu..." : "Lưu hồ sơ"}
          onPress={() => void handleSave()}
          loading={saving}
        />

        {loading ? <Text style={styles.meta}>Đang tải hồ sơ...</Text> : null}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 12,
    paddingBottom: 120,
    backgroundColor: "#EEF4FA",
  },

  profileCard: {
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D9E3EE",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#2563EB",
    fontSize: 24,
    fontWeight: "900",
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  username: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },

  user_id: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },

  card: {
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D9E3EE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },

  error: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    fontWeight: "700",
  },

  meta: {
    marginTop: 10,
    color: "#64748B",
    textAlign: "center",
  },
});