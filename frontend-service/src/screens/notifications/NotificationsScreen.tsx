import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationApi";
import { useNotificationStore } from "../../store/notificationStore";
import { Notification } from "../../types/notification";
import { formatDate } from "../../utils/formatDate";

export function NotificationsScreen() {
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore(
    (state) => state.setNotifications,
  );
  const updateNotificationReadState = useNotificationStore(
    (state) => state.updateNotificationReadState,
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const hasUnread = safeNotifications.some((item) => !item.read_at);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications();
      setNotifications(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const handleReadOne = async (notification: Notification) => {
    setSavingId(notification.id);
    try {
      await markNotificationAsRead(notification.id);
      updateNotificationReadState(notification.id, new Date().toISOString());
    } finally {
      setSavingId(null);
    }
  };

  const handleReadAll = async () => {
    setSavingId("all");
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <LoadingView label="Đang tải thông báo..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHero
        kicker="Thông báo"
        title="Trung tâm thông báo"
        subtitle="Theo dõi cảnh báo ngân sách và cập nhật quan trọng từ hệ thống."
      />

      <AppCard style={styles.card}>
        <SectionHeader title="Danh sách thông báo" />
        <AppButton
          title="Đánh dấu tất cả đã đọc"
          onPress={handleReadAll}
          loading={savingId === "all"}
          disabled={!hasUnread || savingId !== null}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppCard>

      {safeNotifications.length ? (
        safeNotifications.map((notification) => (
          <AppCard
            key={notification.id}
            style={notification.read_at ? styles.readCard : styles.unreadCard}
          >
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.message}</Text>
            <Text style={styles.meta}>
              {formatDate(notification.created_at)}
            </Text>
            {notification.read_at ? (
              <Text style={styles.readLabel}>Đã đọc</Text>
            ) : (
              <AppButton
                title="Đánh dấu đã đọc"
                variant="secondary"
                onPress={() => void handleReadOne(notification)}
                loading={savingId === notification.id}
              />
            )}
          </AppCard>
        ))
      ) : (
        <EmptyState
          icon="🔔"
          title="Bạn chưa có thông báo nào"
          description="Thông báo mới sẽ hiển thị ở đây."
        />
      )}
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
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  notificationTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 6,
  },
  notificationBody: {
    color: "#334155",
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    color: "#64748b",
    marginBottom: 10,
    fontSize: 12,
  },
  error: {
    color: "#b91c1c",
    marginTop: 10,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#0f172a",
  },
  readCard: {
    opacity: 0.9,
  },
  readLabel: {
    color: "#15803d",
    fontWeight: "700",
  },
});
