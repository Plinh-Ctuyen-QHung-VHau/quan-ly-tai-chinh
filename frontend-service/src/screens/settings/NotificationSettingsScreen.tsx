import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../services/notificationApi";
import { NotificationSettings } from "../../types/notification";

const defaultSettings: NotificationSettings = {
  enable_all: true,
  enable_budget_alert: true,
  alert_80_sent: false,
  alert_100_sent: false,
  enable_anomaly_alert: true,
  enable_daily_reminder: false,
  reminder_time: "08:00",
};

export function NotificationSettingsScreen() {
  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotificationSettings();
      setSettings({ ...defaultSettings, ...result });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải cài đặt thông báo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateNotificationSettings(settings);
      setSettings({ ...defaultSettings, ...result });
      Alert.alert("Đã lưu", "Cài đặt thông báo đã được cập nhật.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể lưu cài đặt thông báo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHero
        kicker="Cài đặt"
        title="Thông báo"
        subtitle="Bật tắt cảnh báo ngân sách, bất thường và nhắc nhở hàng ngày."
      />

      <AppCard style={styles.card}>
        <SectionHeader
          title="Tùy chọn thông báo"
          subtitle="Chọn những thông báo bạn muốn hệ thống gửi về."
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Row
          label="Bật tất cả"
          value={settings.enable_all}
          onChange={(value) =>
            setSettings((current) => ({ ...current, enable_all: value }))
          }
        />
        <Row
          label="Cảnh báo ngân sách"
          value={settings.enable_budget_alert}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              enable_budget_alert: value,
            }))
          }
        />
        <Row
          label="Cảnh báo bất thường"
          value={settings.enable_anomaly_alert}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              enable_anomaly_alert: value,
            }))
          }
        />
        <Row
          label="Nhắc nhở hàng ngày"
          value={settings.enable_daily_reminder}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              enable_daily_reminder: value,
            }))
          }
        />
        <AppInput
          label="Thời gian nhắc nhở"
          value={settings.reminder_time}
          onChangeText={(value) =>
            setSettings((current) => ({ ...current, reminder_time: value }))
          }
          placeholder="08:00"
        />

        <AppButton
          title="Lưu cài đặt"
          onPress={() => void handleSave()}
          loading={saving}
        />
        {loading ? <Text style={styles.meta}>Đang tải...</Text> : null}
      </AppCard>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}>) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchLabel: {
    color: "#0f172a",
    fontWeight: "600",
    flex: 1,
    paddingRight: 12,
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
