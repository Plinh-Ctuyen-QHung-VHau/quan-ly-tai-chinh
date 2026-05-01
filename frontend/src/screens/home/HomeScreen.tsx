import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { useAppDataStore } from "../../store/appDataStore";
import { BudgetStatus } from "../../types/budget";
import { TransactionSummary } from "../../types/transaction";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { StatTile } from "../../components/MetricTiles";
import { COLORS, shadow } from "../../constants/ui";

const EMPTY_SUMMARY: TransactionSummary = {
  total_income: 0,
  total_expense: 0,
  balance: 0,
};

// colors and shadow imported from constants to reduce file size

// Helper removed: inline check used for error status codes where needed

function clampPercent(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getBudgetTheme(status?: BudgetStatus["status"]) {
  if (status === "healthy") {
    return { label: "An toàn", color: COLORS.income, bg: COLORS.incomeSoft };
  }

  if (status === "warning") {
    return { label: "Cần chú ý", color: "#D97706", bg: "#FEF3C7" };
  }

  if (status === "danger" || status === "exceeded") {
    return { label: "Đã vượt ngân sách", color: COLORS.expense, bg: COLORS.expenseSoft };
  }

  return { label: "" };
}

// StatTile and SmallMetric are provided by ../../components/MetricTiles

export function HomeScreen() {
  const navigation = useNavigation<any>();

  const appData = useAppDataStore();
  const summary = appData.summary || EMPTY_SUMMARY;
  const budgetStatus = appData.budgetStatus;

  const loading = appData.isInitializing;
  const refreshing = appData.isRefreshing;

  const refresh = useCallback(() => {
    void appData.refresh();
  }, [appData]);

  const income = Number(summary.total_income ?? 0);
  const expense = Number(summary.total_expense ?? 0);
  const balance = Number(summary.balance ?? 0);
  const netCashFlow = income - expense;

  const hasBudget = Boolean(budgetStatus && budgetStatus.status !== "no-budget");

  const budget_amount = Number(budgetStatus?.budget_amount ?? 0);
  const spent_amount = Number(budgetStatus?.spent_amount ?? 0);
  const remaining_amount = Number(
    budgetStatus?.remaining_amount ?? Math.max(0, budget_amount - spent_amount),
  );

  const budgetTheme = getBudgetTheme(budgetStatus?.status);

  const budgetPercent = useMemo(() => {
    if (!hasBudget || budget_amount <= 0) return 0;
    const raw =
      typeof budgetStatus?.percent_used === "number"
        ? budgetStatus.percent_used
        : (spent_amount / budget_amount) * 100;
    return clampPercent(raw);
  }, [budget_amount, budgetStatus?.percent_used, hasBudget, spent_amount]);

  if (loading && !refreshing) return <LoadingView label="Đang tải tổng quan..." />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={COLORS.blue}
          onRefresh={refresh}
        />
      }
    >
      <ScreenHero
        kicker="Tổng quan"
        title="Số dư hiện tại"
        subtitle={formatShortDate(new Date())}
        rightSlot={
          <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>VND</Text></View>
        }
      >
        <Text style={styles.heroBalance} numberOfLines={1}>
          {formatCurrency(balance)}
        </Text>
      </ScreenHero>

      <View style={styles.quickActionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionPrimary,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("AddTransaction")}
        >
          <Text style={styles.quickActionIcon}>＋</Text>
          <Text style={styles.quickActionPrimaryText}>Thêm giao dịch</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickActionSecondary,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("MainTabs", { screen: "Budget" })}
        >
          <Text style={styles.quickActionSecondaryIcon}>◎</Text>
          <Text style={styles.quickActionSecondaryText}>Ngân sách</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dòng tiền</Text>
      </View>

      <View style={styles.cashFlowGrid}>
        <StatTile
          label="Tổng thu"
          value={income}
          hint="Tiền vào trong kỳ"
          color={COLORS.income}
          bg={COLORS.white}
          border={COLORS.border}
          arrow="up"
        />

        <StatTile
          label="Tổng chi"
          value={expense}
          hint="Tiền ra trong kỳ"
          color={COLORS.expense}
          bg={COLORS.white}
          border={COLORS.border}
          arrow="down"
        />
      </View>

      <View style={styles.netCard}>
        <View>
          <Text style={styles.netLabel}>Dòng tiền ròng</Text>
          <Text style={styles.netHint}>
            {netCashFlow >= 0 ? "Thu nhập trừ chi tiêu" : "Chi tiêu đang vượt thu nhập"}
          </Text>
        </View>

        <Text
          style={[
            styles.netValue,
            { color: netCashFlow >= 0 ? COLORS.blue : COLORS.expense },
          ]}
          numberOfLines={1}
        >
          {netCashFlow >= 0 ? "+" : ""}
          {formatCurrency(netCashFlow)}
        </Text>
      </View>

      <Pressable

        onPress={() => navigation.navigate("MainTabs", { screen: "Budget" })}
      ><View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ngân sách kỳ này</Text>

        </View>

        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.budgetCardTitle}>Tiến độ ngân sách</Text>
              {budgetStatus?.start_date && budgetStatus?.end_date ? (
                <Text style={styles.budgetPeriodText}>
                  {formatDate(budgetStatus.start_date)} – {formatDate(budgetStatus.end_date)}
                </Text>
              ) : null}
            </View>
            <View style={[styles.budgetStatusChip, { backgroundColor: budgetTheme.bg }]}>
              <Text style={[styles.budgetStatusText, { color: budgetTheme.color }]}>
                {budgetTheme.label}
              </Text>
            </View>
          </View>

          {hasBudget ? (
            <>
              <View style={styles.budgetProgressRow}>
                <Text style={styles.budgetUsedText}>Đã chi </Text>

                <Text style={[styles.budgetPercent, { color: budgetTheme.color }]}>{Math.round(budgetPercent)}%</Text>
                <Text style={styles.budgetUsedText}> ngân sách</Text>
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

              <View style={styles.budgetMetricRow}>
                <View style={styles.budgetStatCol}>
                  <Text style={styles.budgetStatLabel}>Ngân sách</Text>
                  <Text style={styles.budgetStatValue} numberOfLines={1}>{formatCurrency(budget_amount)}</Text>
                </View>
                <View style={styles.budgetStatDivider} />
                <View style={styles.budgetStatCol}>
                  <Text style={styles.budgetStatLabel}>Đã chi</Text>
                  <Text style={styles.budgetStatValue} numberOfLines={1}>{formatCurrency(spent_amount)}</Text>
                </View>
                <View style={styles.budgetStatDivider} />
                <View style={styles.budgetStatCol}>
                  <Text style={styles.budgetStatLabel}>Còn lại</Text>
                  <Text style={[styles.budgetStatValue, remaining_amount < 0 && { color: COLORS.expense }]} numberOfLines={1}>{formatCurrency(remaining_amount)}</Text>
                </View>
              </View>


            </>
          ) : (
            <View style={styles.emptyBudgetBox}>
              <Text style={styles.emptyBudgetTitle}>Chưa có ngân sách</Text>
              <Text style={styles.emptyBudgetText}>
                Tạo ngân sách để kiểm soát chi tiêu tốt hơn.
              </Text>

              {/* <Pressable
                style={({ pressed }) => [
                  styles.createBudgetButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigation.navigate("BudgetForm", { mode: "create" })}
              >
                <Text style={styles.createBudgetButtonText}>Tạo ngân sách</Text>
              </Pressable> */}
            </View>
          )}
        </View>
      </Pressable>

    </ScrollView >
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 40, paddingBottom: 120, backgroundColor: COLORS.bg },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  currencyBadge: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  currencyBadgeText: { color: "#E2E8F0", fontSize: 12, fontWeight: "900" },
  heroBalance: { color: COLORS.white, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -0.8, marginBottom: 4 },
  quickActionRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  quickActionPrimary: { ...shadow, flex: 1, height: 66, borderRadius: 16, backgroundColor: COLORS.dark, alignItems: "center", justifyContent: "center" },
  quickActionSecondary: { ...shadow, flex: 1, height: 66, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  quickActionIcon: { color: COLORS.white, fontSize: 20, fontWeight: "900", marginBottom: 4 },
  quickActionPrimaryText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  quickActionSecondaryIcon: { color: COLORS.blue, fontSize: 18, fontWeight: "900", marginBottom: 5 },
  quickActionSecondaryText: { color: COLORS.dark, fontSize: 14, fontWeight: "900" },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  cashFlowGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statTile: { flex: 1, minHeight: 112, borderRadius: 18, padding: 14, borderWidth: 1 },
  statArrow: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  statLabel: { color: COLORS.text, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: "900", marginBottom: 4 },
  statHint: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
  netCard: { ...shadow, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 18, padding: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  netLabel: { color: COLORS.text, fontSize: 14, fontWeight: "900", marginBottom: 3 },
  netHint: { color: COLORS.muted, fontSize: 12 },
  netValue: { maxWidth: "48%", fontSize: 17, fontWeight: "900" },
  budgetCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  budgetPeriodText: { color: COLORS.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  budgetCardTitle: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
  budgetStatusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  budgetStatusText: { fontSize: 12, fontWeight: "900" },
  budgetProgressRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 },
  budgetPercent: { color: COLORS.text, fontSize: 30, lineHeight: 36, fontWeight: "900" },
  budgetUsedText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "#E5EAF0", overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 999 },
  budgetMetricRow: { flexDirection: "row", alignItems: "stretch", borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 14 },
  budgetStatCol: { flex: 1, paddingHorizontal: 4 },
  budgetStatDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  budgetStatLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "500", marginBottom: 5, letterSpacing: 0.2 },
  budgetStatValue: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  smallMetric: { flex: 1, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  smallMetricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  smallMetricValue: { fontSize: 12, fontWeight: "900" },
  budgetFooterText: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  emptyBudgetBox: { padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border },
  emptyBudgetTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", marginBottom: 6 },

  emptyBudgetText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  createBudgetButton: {
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
  },

  createBudgetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  footerNote: {
    color: COLORS.muted2,
    textAlign: "center",
    fontSize: 11,
    marginTop: 18,
  },
});