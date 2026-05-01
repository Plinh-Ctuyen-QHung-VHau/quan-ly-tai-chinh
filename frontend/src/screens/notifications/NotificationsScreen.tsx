import React, { useCallback, useState, useRef, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import { COLORS, shadow } from "../../constants/ui";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationApi";
import { useNotificationStore } from "../../store/notificationStore";
import { Notification } from "../../types/notification";
import { formatDate } from "../../utils/formatDate";
import { dataInvalidation } from "../../utils/dataInvalidation";

/** Hiển thị tên loại thông báo thân thiện */
function getTypeLabel(type: Notification["type"]) {
  switch (type) {
    case "budget_alert": return "Cảnh báo ngân sách";
    case "anomaly_alert": return "Giao dịch bất thường";
    case "reminder": return "Nhắc nhở";
    case "financial_tip": return "Mẹo tài chính";
    default: return "Thông báo";
  }
}

function getTypeColor(type: Notification["type"]) {
  switch (type) {
    case "budget_alert": return COLORS.expense;
    case "anomaly_alert": return "#D97706";
    case "financial_tip": return COLORS.blue;
    default: return COLORS.muted;
  }
}

function getTypeBg(type: Notification["type"]) {
  switch (type) {
    case "budget_alert": return COLORS.expenseSoft;
    case "anomaly_alert": return "#FEF3C7";
    case "financial_tip": return COLORS.blueLight;
    default: return "#F1F5F9";
  }
}

export function NotificationsScreen() {
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore(
    (state) => state.setNotifications,
  );
  const updateNotificationReadState = useNotificationStore(
    (state) => state.updateNotificationReadState,
  );
  // Nếu appDataStore đã tải sẵn notifications thì không loading
  const [loading, setLoading] = useState(notifications.length === 0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const lastFetchedAt = useRef<number | null>(
    notifications.length > 0 ? Date.now() : null
  );

  // is_read là boolean theo đúng DB schema (không phải read_at)
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const hasUnread = safeNotifications.some((item) => !item.is_read);
  const unreadCount = safeNotifications.filter((item) => !item.is_read).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications();
      setNotifications(Array.isArray(result) ? result : []);
      lastFetchedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, [setNotifications]);

  useFocusEffect(
    useCallback(() => {
      // Chỉ gọi API nếu chưa từng load hoặc đã quá 60s
      if (!lastFetchedAt.current || Date.now() - lastFetchedAt.current > 60_000) {
        void loadNotifications();
      }
    }, [loadNotifications]),
  );

  useEffect(() => {
    const unsubscribe = dataInvalidation.subscribe((key) => {
      if (key === "notifications") {
        lastFetchedAt.current = null;
        void loadNotifications();
      }
    });
    return unsubscribe;
  }, [loadNotifications]);

  const handleReadOne = async (notification: Notification) => {
    if (notification.is_read) return;
    setSavingId(notification.id);
    try {
      await markNotificationAsRead(notification.id);
      // Cập nhật is_read = true trong store (không dùng read_at)
      updateNotificationReadState(notification.id, new Date().toISOString());
    } catch {
      // Silent fail — sẽ sync lại khi refresh
    } finally {
      setSavingId(null);
    }
  };

  const handleReadAll = async () => {
    setSavingId("all");
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch {
      // Silent fail
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <LoadingView label="Đang tải thông báo..." />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Thông báo"
        title="Trung tâm thông báo"
        subtitle="Theo dõi cảnh báo ngân sách và cập nhật quan trọng từ hệ thống."
      />

      {safeNotifications.length > 0 && (
        <AppCard style={styles.actionCard}>
          <SectionHeader
            title="Danh sách thông báo"
            subtitle={
              hasUnread
                ? `${unreadCount} thông báo chưa đọc`
                : "Tất cả thông báo đã được đọc"
            }
          />

          <AppButton
            title="Đánh dấu tất cả đã đọc"
            onPress={() => void handleReadAll()}
            loading={savingId === "all"}
            disabled={!hasUnread || savingId !== null}
            variant={hasUnread ? "primary" : "secondary"}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>
      )}

      {safeNotifications.length ? (
        safeNotifications.map((notification) => {
          const isRead = notification.is_read;
          const typeColor = getTypeColor(notification.type);
          const typeBg = getTypeBg(notification.type);

          return (
            <Pressable
              key={notification.id}
              onPress={() => void handleReadOne(notification)}
              style={({ pressed }) => [
                styles.notifCard,
                !isRead && styles.notifCardUnread,
                pressed && styles.notifCardPressed,
              ]}
            >
              {/* Left accent bar for unread */}
              {!isRead && <View style={styles.unreadAccent} />}

              <View style={styles.notifInner}>
                {/* Type badge */}
                <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                    {getTypeLabel(notification.type)}
                  </Text>
                </View>

                <Text style={[styles.notifTitle, !isRead && styles.notifTitleUnread]}>
                  {notification.title}
                </Text>

                {/* content là field đúng theo DB schema, không phải message */}
                <Text style={styles.notifBody} numberOfLines={3}>
                  {notification.content}
                </Text>

                <View style={styles.notifFooter}>
                  <Text style={styles.notifDate}>
                    {formatDate(notification.created_at)}
                  </Text>

                  {isRead ? (
                    <View style={styles.readBadge}>
                      <Text style={styles.readBadgeText}>Đã đọc</Text>
                    </View>
                  ) : (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>Chưa đọc</Text>
                    </View>
                  )}
                </View>

                {!isRead && savingId === notification.id ? (
                  <Text style={styles.markingText}>Đang đánh dấu...</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })
      ) : (
        <EmptyState
          title="Bạn chưa có thông báo nào"
          description="Thông báo mới sẽ hiển thị ở đây."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 120, backgroundColor: COLORS.bg },

  actionCard: {
    ...shadow,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    padding: 18,
  },

  error: { color: COLORS.expense, marginTop: 10, fontWeight: "700" },

  // Notification card
  notifCard: {
    ...shadow,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  notifCardUnread: {
    borderColor: COLORS.dark,
    backgroundColor: COLORS.white,
  },
  notifCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  unreadAccent: {
    width: 4,
    backgroundColor: COLORS.dark,
  },

  notifInner: {
    flex: 1,
    padding: 16,
  },

  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "800" },

  notifTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: 6,
  },
  notifTitleUnread: { color: COLORS.text, fontWeight: "900" },

  notifBody: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  notifFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notifDate: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },

  readBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.incomeSoft,
  },
  readBadgeText: { color: COLORS.income, fontSize: 11, fontWeight: "800" },

  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadBadgeText: { color: COLORS.text, fontSize: 11, fontWeight: "800" },

  markingText: { color: COLORS.muted, fontSize: 11, marginTop: 6, fontWeight: "700" },
});
