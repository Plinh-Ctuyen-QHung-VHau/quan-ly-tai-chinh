import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { getMyProfile, updateMyProfile } from "../../services/identityApi";
import { UserProfile } from "../../types/user";

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyProfile();
      setProfile(result);
      setFullName(result.fullName ?? "");
      setAvatarUrl(result.avatarUrl ?? "");
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
    setSaving(true);
    try {
      const result = await updateMyProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      setProfile(result);
      Alert.alert("Đã lưu", "Hồ sơ đã được cập nhật.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Hồ sơ người dùng</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppInput
          label="fullName"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Họ và tên"
        />
        <AppInput
          label="avatarUrl"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
        />
        <AppButton
          title="Lưu hồ sơ"
          onPress={() => void handleSave()}
          loading={saving}
        />
        {profile ? (
          <Text style={styles.meta}>User ID: {profile.id}</Text>
        ) : null}
        {loading ? <Text style={styles.meta}>Đang tải...</Text> : null}
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
    marginBottom: 12,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 10,
  },
  meta: {
    marginTop: 8,
    color: "#64748b",
  },
});
