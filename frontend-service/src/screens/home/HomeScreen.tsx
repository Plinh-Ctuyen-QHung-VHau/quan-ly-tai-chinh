import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { LoadingView } from "../../components/LoadingView";
import { getCurrentBudgetStatus } from "../../services/budgetApi";
import { getTransactionSummary } from "../../services/transactionApi";
import { BudgetStatus } from "../../types/budget";
import { TransactionSummary } from "../../types/transaction";
import { formatCurrency } from "../../utils/formatCurrency";

const EMPTY_SUMMARY: TransactionSummary = {
  total_income: 0,
  total_expense: 0,
  balance: 0,
};

const COLORS = {
  bg: "#F6F8FB",
  surface: "#FFFFFF",
  soft: "#F1F5F9",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  muted2: "#94A3B8",
  primary: "#2563EB",
  dark: "#111827",
  income: "#16A34A",
  incomeBg: "#DCFCE7",
  expense: "#DC2626",
  expenseBg: "#FEE2E2",
  warning: "#D97706",
  warningBg: "#FEF3C7",
};

const shadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 4,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Không thể tải dữ liệu tổng quan.";
}

function getStatusCode(error: unknown) {
  return (error as { statusCode?: number })?.statusCode;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getBudgetTheme(status?: BudgetStatus["status"]) {
  if (status === "healthy") {
    return { label: "An toàn", color: COLORS.income, bg: COLORS.incomeBg };
  }

  if (status === "warning") {
    return { label: "Cần chú ý", color: COLORS.warning, bg: COLORS.warningBg };
  }

  if (status === "danger") {
    return { label: "Vượt ngưỡng", color: COLORS.expense, bg: COLORS.expenseBg };
  }

  return { label: "Chưa có", color: COLORS.muted, bg: COLORS.soft };
}

type MetricProps = {
  label: string;
  value: number;
  color?: string;
  sign?: string;
};

function Metric({ label, value, color = COLORS.text, sign = "" }: MetricProps) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>
        {sign}
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

type SummaryBoxProps = {
  label: string;
  value: number;
  color?: string;
};

function SummaryBox({ label, value, color = COLORS.text }: SummaryBoxProps) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<TransactionSummary>(EMPTY_SUMMARY);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");

    const [summaryResult, budgetResult] = await Promise.allSettled([
      getTransactionSummary(),
      getCurrentBudgetStatus(),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value ?? EMPTY_SUMMARY);
    } else if (getStatusCode(summaryResult.reason) === 404) {
      setSummary(EMPTY_SUMMARY);
    } else {
      setError(
        `Không thể tải dữ liệu giao dịch. ${getErrorMessage(summaryResult.reason)}`,
      );
    }

    if (budgetResult.status === "fulfilled") {
      setBudgetStatus(budgetResult.value);
    } else if (getStatusCode(budgetResult.reason) === 404) {
      setBudgetStatus(null);
    } else {
      setError((prev) => {
        const message = `Không thể tải trạng thái ngân sách. ${getErrorMessage(
          budgetResult.reason,
        )}`;

        return prev ? `${prev}\n${message}` : message;
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const budgetTheme = getBudgetTheme(budgetStatus?.status);
  const hasBudget = Boolean(budgetStatus && budgetStatus.status !== "no-budget");

  const budgetPercent = useMemo(() => {
    if (!hasBudget) return 0;

    const budgetAmount = budgetStatus?.budget_amount ?? 0;
    const spentAmount = budgetStatus?.spent_amount ?? 0;

    if (budgetAmount <= 0) return 0;

    return clampPercent((spentAmount / budgetAmount) * 100);
  }, [budgetStatus, hasBudget]);

  const cashFlow = (summary.total_income ?? 0) - (summary.total_expense ?? 0);
  const remainingPercent = 100 - budgetPercent;

  if (loading) {
    return <LoadingView label="Đang tải tổng quan..." />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={COLORS.primary}
          onRefresh={refresh}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Hôm nay</Text>
          <Text style={styles.title}>Tổng quan</Text>
        </View>

        <View style={styles.datePill}>
          <Text style={styles.datePillText}>{formatShortDate(new Date())}</Text>
        </View>
      </View>

      {error ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Không thể tải một số dữ liệu</Text>
          <Text style={styles.errorText}>{error}</Text>

          <View style={styles.retryWrap}>
            <AppButton title="Thử lại" variant="ghost" onPress={refresh} />
          </View>
        </AppCard>
      ) : null}

      <AppCard style={styles.walletCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.walletLabel}>Ví của bạn</Text>
            <Text style={styles.walletHint}>Số dư hiện tại</Text>
          </View>

          <View style={styles.walletBadge}>
            <Text style={styles.walletBadgeText}>VND</Text>
          </View>
        </View>

        <Text style={styles.balanceValue} numberOfLines={1}>
          {formatCurrency(summary.balance ?? 0)}
        </Text>

        <View style={styles.darkDivider} />

        <View style={styles.row}>
          <Metric
            label="Thu vào"
            value={summary.total_income ?? 0}
            color="#86EFAC"
            sign="+"
          />

          <View style={styles.darkSeparator} />

          <Metric
            label="Chi ra"
            value={summary.total_expense ?? 0}
            color="#FCA5A5"
            sign="-"
          />
        </View>
      </AppCard>

      <View style={styles.actionRow}>
        <AppButton
          title="+ Thêm giao dịch"
          onPress={() => navigation.navigate("AddTransaction")}
          style={styles.actionButton}
        />

        <AppButton
          title="Ngân sách"
          variant="ghost"
          onPress={() => navigation.navigate("BudgetForm", { mode: "create" })}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dòng tiền tháng này</Text>

        <Text
          style={[
            styles.cashFlowText,
            { color: cashFlow >= 0 ? COLORS.income : COLORS.expense },
          ]}
        >
          {cashFlow >= 0 ? "+" : ""}
          {formatCurrency(cashFlow)}
        </Text>
      </View>

      <AppCard style={styles.metricsCard}>
        <SummaryBox
          label="Tổng thu"
          value={summary.total_income ?? 0}
          color={COLORS.income}
        />

        <View style={styles.lightSeparator} />

        <SummaryBox
          label="Tổng chi"
          value={summary.total_expense ?? 0}
          color={COLORS.expense}
        />

        <View style={styles.lightSeparator} />

        <SummaryBox label="Số dư" value={summary.balance ?? 0} />
      </AppCard>

      <AppCard style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Ngân sách hiện tại</Text>
            <Text style={styles.cardSubtitle}>
              Kiểm soát mức chi tiêu của kỳ này
            </Text>
          </View>

          <View style={[styles.statusChip, { backgroundColor: budgetTheme.bg }]}>
            <Text style={[styles.statusChipText, { color: budgetTheme.color }]}>
              {budgetTheme.label}
            </Text>
          </View>
        </View>

        {!hasBudget ? (
          <View style={styles.emptyBudget}>
            <View style={styles.emptyCircle}>
              <Text style={styles.emptyCircleText}>%</Text>
            </View>

            <Text style={styles.emptyTitle}>Chưa có ngân sách</Text>

            <Text style={styles.emptyText}>
              Tạo ngân sách để app nhắc bạn khi chi tiêu gần vượt giới hạn.
            </Text>

            <View style={styles.emptyButtonWrap}>
              <AppButton
                title="Tạo ngân sách ngay"
                onPress={() => navigation.navigate("BudgetForm", { mode: "create" })}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>
                {Math.round(budgetPercent)}%
              </Text>

              <Text style={styles.progressCaption}>đã sử dụng</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetTheme.color,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetSummaryRow}>
              <SummaryBox
                label="Ngân sách"
                value={budgetStatus?.budget_amount ?? 0}
              />

              <SummaryBox
                label="Đã chi"
                value={budgetStatus?.spent_amount ?? 0}
                color={COLORS.expense}
              />

              <SummaryBox
                label="Còn lại"
                value={budgetStatus?.remaining_amount ?? 0}
                color={COLORS.income}
              />
            </View>

            <Text style={styles.progressHint}>
              Còn lại khoảng {Math.round(remainingPercent)}% ngân sách cho kỳ hiện tại.
            </Text>
          </>
        )}
      </AppCard>

      <Text style={styles.footerNote}>Kéo xuống để làm mới dữ liệu</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    backgroundColor: COLORS.bg,
  },

  flex1: {
    flex: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  kicker: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  title: {
    color: COLORS.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 2,
  },

  datePill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  datePillText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  errorCard: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 6,
  },

  errorText: {
    color: "#B91C1C",
    lineHeight: 20,
  },

  retryWrap: {
    marginTop: 10,
  },

  walletCard: {
    ...shadow,
    backgroundColor: COLORS.dark,
    borderColor: COLORS.dark,
    borderRadius: 30,
    padding: 22,
    marginBottom: 14,
  },

  walletLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  walletHint: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 4,
  },

  walletBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  walletBadgeText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
  },

  balanceValue: {
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 18,
  },

  darkDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 18,
  },

  darkSeparator: {
    width: 1,
    height: 38,
    marginHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  actionButton: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },

  cashFlowText: {
    fontSize: 14,
    fontWeight: "900",
  },

  metricsCard: {
    ...shadow,
    flexDirection: "row",
    borderRadius: 24,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  metricItem: {
    flex: 1,
    minWidth: 0,
  },

  metricLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 4,
  },

  metricValue: {
    fontSize: 16,
    fontWeight: "900",
  },

  lightSeparator: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },

  budgetCard: {
    ...shadow,
    borderRadius: 26,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },

  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },

  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyBudget: {
    alignItems: "center",
    paddingVertical: 8,
  },

  emptyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyCircleText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "900",
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },

  emptyText: {
    color: COLORS.muted,
    lineHeight: 20,
    fontSize: 14,
    textAlign: "center",
  },

  emptyButtonWrap: {
    alignSelf: "stretch",
    marginTop: 16,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 10,
  },

  progressPercent: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
  },

  progressCaption: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.soft,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  budgetSummaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },

  summaryBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.soft,
    borderRadius: 16,
    padding: 12,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 5,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  progressHint: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  footerNote: {
    textAlign: "center",
    color: COLORS.muted2,
    marginTop: 4,
    fontSize: 12,
  },
});