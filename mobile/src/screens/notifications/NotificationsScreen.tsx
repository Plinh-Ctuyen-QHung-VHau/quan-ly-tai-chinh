import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
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
      <AppCard>
        <Text style={styles.title}>Thông báo</Text>
        <AppButton
          title="Đánh dấu tất cả đã đọc"
          onPress={handleReadAll}
          loading={savingId === "all"}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppCard>

      {notifications.length ? (
        notifications.map((notification) => (
          <AppCard
            key={notification.id}
            style={notification.readAt ? styles.readCard : styles.unreadCard}
          >
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.message}</Text>
            <Text style={styles.meta}>
              {formatDate(notification.createdAt)}
            </Text>
            {!notification.readAt ? (
              <AppButton
                title="Đánh dấu đã đọc"
                variant="secondary"
                onPress={() => void handleReadOne(notification)}
                loading={savingId === notification.id}
              />
            ) : (
              <Text style={styles.readLabel}>Đã đọc</Text>
            )}
          </AppCard>
        ))
      ) : (
        <EmptyState
          title="Không có thông báo"
          description="Thông báo mới sẽ hiển thị ở đây."
        />
      )}
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
