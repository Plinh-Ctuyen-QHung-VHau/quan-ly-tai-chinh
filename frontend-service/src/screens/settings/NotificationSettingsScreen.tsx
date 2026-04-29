import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { ScreenHero } from "../../components/ScreenHero";
import { COLORS, shadow } from "../../constants/ui";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../../services/notificationApi";
import { NotificationSettings } from "../../types/notification";

const DEFAULT: NotificationSettings = {
  enable_all: true,
  enable_budget_alert: true,
  enable_anomaly_alert: true,
  enable_daily_reminder: false,
  reminder_time: "20:00:00",
};

/** Chuyển "HH:mm:ss" hoặc "HH:mm" thành Date object (hôm nay) */
function timeStringToDate(timeStr: string | null | undefined): Date {
  const d = new Date();
  const parts = (timeStr || "20:00:00").split(":");
  d.setHours(Number(parts[0] ?? 20), Number(parts[1] ?? 0), 0, 0);
  return d;
}

/** Chuyển Date thành "HH:mm:ss" */
function dateToTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

/** Hiển thị "HH:mm" thân thiện */
function formatDisplayTime(timeStr: string | null | undefined): string {
  const parts = (timeStr || "20:00:00").split(":");
  return `${parts[0]}:${parts[1]}`;
}

export function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotificationSettings();
      setSettings({ ...DEFAULT, ...result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cài đặt.");
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
      const payload = {
        ...settings,
        reminder_time: settings.reminder_time?.length === 5
          ? settings.reminder_time + ":00"
          : settings.reminder_time,
      };
      const result = await updateNotificationSettings(payload);
      setSettings({ ...DEFAULT, ...result });
      Alert.alert("Đã lưu", "Cài đặt thông báo đã được cập nhật.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selected) {
      setSettings((s) => ({ ...s, reminder_time: dateToTimeString(selected) }));
    }
  };

  const toggle = (field: keyof NotificationSettings) => (value: boolean) =>
    setSettings((s) => ({ ...s, [field]: value }));

  const isDisabled = !settings.enable_all;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Cài đặt"
        title="Thông báo"
        subtitle="Bật tắt cảnh báo ngân sách, bất thường và nhắc nhở hàng ngày."
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Master toggle */}
      <View style={styles.card}>
        <View style={styles.masterRow}>
          <View style={styles.masterLeft}>
            <Text style={styles.masterIcon}>🔔</Text>
            <View>
              <Text style={styles.masterLabel}>Bật thông báo</Text>
              <Text style={styles.masterSub}>
                {settings.enable_all ? "Đang bật" : "Đã tắt tất cả"}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.enable_all}
            onValueChange={toggle("enable_all")}
            trackColor={{ true: COLORS.blue, false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      {/* Các toggle chi tiết */}
      <View style={[styles.card, isDisabled && styles.cardDisabled]}>
        <Text style={styles.groupLabel}>Loại thông báo</Text>

        <ToggleRow
          icon="💰"
          label="Cảnh báo ngân sách"
          sub="Khi chi tiêu vượt 80% hoặc 100%"
          value={settings.enable_budget_alert}
          onChange={toggle("enable_budget_alert")}
          disabled={isDisabled}
        />

        <View style={styles.divider} />

        <ToggleRow
          icon="⚠️"
          label="Giao dịch bất thường"
          sub="Khi phát hiện chi tiêu bất thường"
          value={settings.enable_anomaly_alert}
          onChange={toggle("enable_anomaly_alert")}
          disabled={isDisabled}
        />

        <View style={styles.divider} />

        <ToggleRow
          icon="📅"
          label="Nhắc nhở hàng ngày"
          sub="Nhắc cập nhật giao dịch mỗi ngày"
          value={settings.enable_daily_reminder}
          onChange={toggle("enable_daily_reminder")}
          disabled={isDisabled}
        />
      </View>

      {/* Time picker */}
      {settings.enable_daily_reminder && settings.enable_all && (
        <View style={styles.card}>
          <Text style={styles.groupLabel}>Thời gian nhắc nhở</Text>

          <Pressable
            style={({ pressed }) => [
              styles.timeRow,
              pressed && styles.timeRowPressed,
            ]}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.timeLeft}>
              <Text style={styles.timeIcon}>🕐</Text>
              <View>
                <Text style={styles.timeLabel}>Giờ nhắc nhở</Text>
                <Text style={styles.timeSub}>Nhấn để thay đổi</Text>
              </View>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>
                {formatDisplayTime(settings.reminder_time)}
              </Text>
            </View>
          </Pressable>

          {/* Inline picker trên iOS */}
          {showTimePicker && Platform.OS === "ios" && (
            <View style={styles.inlinePicker}>
              <DateTimePicker
                mode="time"
                value={timeStringToDate(settings.reminder_time)}
                onChange={onTimeChange}
                display="spinner"
                locale="vi-VN"
              />
              <Pressable
                style={styles.doneBtn}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.doneBtnText}>Xong</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Android time picker (modal) */}
      {showTimePicker && Platform.OS === "android" && (
        <DateTimePicker
          mode="time"
          value={timeStringToDate(settings.reminder_time)}
          onChange={onTimeChange}
          display="default"
        />
      )}

      <AppButton
        title={loading ? "Đang tải..." : "Lưu cài đặt"}
        onPress={() => void handleSave()}
        loading={saving}
        disabled={loading}
      />

      <Text style={styles.footer}>
        Cài đặt sẽ áp dụng cho tất cả thông báo từ hệ thống.
      </Text>
    </ScrollView>
  );
}

type ToggleRowProps = {
  icon: string;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({ icon, label, sub, value, onChange, disabled }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, disabled && styles.textDisabled]}>
          {label}
        </Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: COLORS.blue, false: COLORS.border }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },

  errorBanner: {
    backgroundColor: COLORS.expenseSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.expenseBorder,
  },
  errorText: { color: COLORS.expense, fontWeight: "700", fontSize: 13 },

  card: {
    ...shadow,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  cardDisabled: { opacity: 0.5 },

  // Master toggle
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  masterLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  masterIcon: { fontSize: 28 },
  masterLabel: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  masterSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  groupLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },

  // Toggle row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleIcon: { fontSize: 22, marginRight: 14 },
  toggleText: { flex: 1 },
  toggleLabel: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  toggleSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  textDisabled: { color: COLORS.muted },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginLeft: 36,
  },

  // Time picker row
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  timeRowPressed: { opacity: 0.75 },
  timeLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  timeIcon: { fontSize: 22 },
  timeLabel: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  timeSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  timeBadge: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.blueSoft,
  },
  timeBadgeText: {
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // iOS inline picker
  inlinePicker: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  doneBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    marginTop: 8,
  },
  doneBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 14 },

  footer: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});
