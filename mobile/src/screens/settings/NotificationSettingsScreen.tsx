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
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../services/notificationApi";
import { NotificationSettings } from "../../types/notification";

const defaultSettings: NotificationSettings = {
  enableAll: true,
  enableBudgetAlert: true,
  enableAnomalyAlert: true,
  enableDailyReminder: false,
  reminderTime: "08:00",
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
      <AppCard>
        <Text style={styles.title}>Cài đặt thông báo</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Row
          label="enableAll"
          value={settings.enableAll}
          onChange={(value) =>
            setSettings((current) => ({ ...current, enableAll: value }))
          }
        />
        <Row
          label="enableBudgetAlert"
          value={settings.enableBudgetAlert}
          onChange={(value) =>
            setSettings((current) => ({ ...current, enableBudgetAlert: value }))
          }
        />
        <Row
          label="enableAnomalyAlert"
          value={settings.enableAnomalyAlert}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              enableAnomalyAlert: value,
            }))
          }
        />
        <Row
          label="enableDailyReminder"
          value={settings.enableDailyReminder}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              enableDailyReminder: value,
            }))
          }
        />
        <AppInput
          label="reminderTime"
          value={settings.reminderTime}
          onChangeText={(value) =>
            setSettings((current) => ({ ...current, reminderTime: value }))
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
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
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
