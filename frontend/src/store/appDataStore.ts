import { create } from "zustand";
import { getTransactionSummary, getTransactions, getCategories } from "../services/transactionApi";
import { getMyProfile } from "../services/identityApi";
import { getNotificationSettings, getNotifications } from "../services/notificationApi";
import { useNotificationStore } from "./notificationStore";
import { supabase } from "../services/supabaseClient";
import { Transaction, TransactionSummary } from "../types/transaction";
import { BudgetStatus } from "../types/budget";
import { Category } from "../types/category";
import { UserProfile } from "../types/user";
import { NotificationSettings } from "../types/notification";
import { getCurrentBudgetStatus } from "../services/budgetApi";

const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  enable_all: true,
  enable_budget_alert: true,
  enable_anomaly_alert: true,
  enable_daily_reminder: false,
  reminder_time: "20:00:00",
};

interface AppDataState {
  summary: TransactionSummary | null;
  budgetStatus: BudgetStatus | null;
  transactions: Transaction[];
  expenseCategories: Category[];
  incomeCategories: Category[];

  profile: UserProfile | null;
  userEmail: string;
  emailConfirmed: string | null;
  userCreatedAt: string | null;

  notificationSettings: NotificationSettings;

  isInitializing: boolean;
  isRefreshing: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  setProfile: (profile: UserProfile) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
  summary: null,
  budgetStatus: null,
  transactions: [],
  expenseCategories: [],
  incomeCategories: [],

  profile: null,
  userEmail: "",
  emailConfirmed: null,
  userCreatedAt: null,

  notificationSettings: DEFAULT_NOTIF_SETTINGS,

  isInitializing: true,
  isRefreshing: false,
  error: null,

  initialize: async () => {
    set({ isInitializing: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const [summary, budget, txRes, expenseCats, incomeCats, profile, notifSettings, notifList] = await Promise.all([
        getTransactionSummary().catch(() => null),
        getCurrentBudgetStatus().catch(() => null),
        getTransactions({ limit: 1000 }).catch(() => ({ data: [] })),
        getCategories("expense").catch(() => []),
        getCategories("income").catch(() => []),
        getMyProfile().catch(() => null),
        getNotificationSettings().catch(() => DEFAULT_NOTIF_SETTINGS),
        getNotifications().catch(() => []),
      ]);

      useNotificationStore.getState().setNotifications(Array.isArray(notifList) ? notifList : []);

      set({
        summary,
        budgetStatus: budget,
        transactions: Array.isArray(txRes?.data) ? txRes.data : [],
        expenseCategories: expenseCats,
        incomeCategories: incomeCats,
        profile: profile,
        userEmail: user?.email ?? "",
        emailConfirmed: user?.email_confirmed_at ?? null,
        userCreatedAt: user?.created_at ?? null,
        notificationSettings: { ...DEFAULT_NOTIF_SETTINGS, ...(notifSettings || {}) },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu." });
    } finally {
      set({ isInitializing: false });
    }
  },

  refresh: async () => {
    if (get().isInitializing) return;

    set({ isRefreshing: true, error: null });
    try {
      const [summary, budgetStatus, txRes, expenseCats, incomeCats] = await Promise.all([
        getTransactionSummary(),
        getCurrentBudgetStatus().catch(() => null),
        getTransactions({ limit: 1000 }),
        getCategories("expense"),
        getCategories("income"),
      ]);

      set({
        summary,
        budgetStatus,
        transactions: Array.isArray(txRes?.data) ? txRes.data : [],
        expenseCategories: expenseCats,
        incomeCategories: incomeCats,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu." });
    } finally {
      set({ isRefreshing: false });
    }
  },

  setProfile: (profile) => set({ profile }),
  setNotificationSettings: (settings) => set({ notificationSettings: settings }),
}));
