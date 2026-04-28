import { create } from "zustand";

import { supabase } from "../services/supabaseClient";
import { Notification } from "../types/notification";

interface NotificationState {
  notifications: Notification[];
  realtimeChannelActive: boolean;
  setNotifications: (items: Notification[]) => void;
  prependNotification: (item: Notification) => void;
  updateNotificationReadState: (id: string, readAt?: string | null) => void;
  startRealtime: (user_id: string) => Promise<void>;
  stopRealtime: () => Promise<void>;
}

let channel: ReturnType<typeof supabase.channel> | null = null;

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  realtimeChannelActive: false,
  setNotifications: (notifications: Notification[]) => set({ notifications }),
  prependNotification: (item: Notification) =>
    set((state) => ({
      notifications: [item, ...state.notifications],
    })),
  updateNotificationReadState: (id: string, _readAt?: string | null) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    })),
  startRealtime: async (user_id: string) => {
    if (get().realtimeChannelActive) {
      return;
    }

    channel = supabase
      .channel("budget.notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user_id}`,
        },
        (payload: { new: unknown }) => {
          const record = payload.new as Notification;
          set((state) => ({ notifications: [record, ...state.notifications] }));
        },
      )
      .subscribe();

    set({ realtimeChannelActive: true });
  },
  stopRealtime: async () => {
    if (channel) {
      await supabase.removeChannel(channel);
      channel = null;
    }

    set({ realtimeChannelActive: false });
  },
}));
