import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import { COLORS, shadow } from "../../constants/ui";
import { getCurrentBudget, getCurrentBudgetStatus } from "../../services/budgetApi";
import { useBudgetStore } from "../../store/budgetStore";
import { BudgetStatus } from "../../types/budget";
import { formatCurrency } from "../../utils/formatCurrency";

function clampPercent(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getProgressColor(percent: number) {
  if (percent >= 90) return COLORS.expense;
  if (percent >= 70) return "#D97706";
  return COLORS.income;
}

export function BudgetScreen() {
  const navigation = useNavigation<any>();

  const budgetStatus = useBudgetStore((state) => state.currentBudgetStatus);
  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );

  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  const loadBudgetStatus = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getCurrentBudgetStatus();
      setCurrentBudgetStatus(result);
    } catch {
      setCurrentBudgetStatus(null);
    } finally {
      setLoading(false);
    }
  }, [setCurrentBudgetStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadBudgetStatus();
    }, [loadBudgetStatus]),
  );

  const hasBudget = Boolean(
    budgetStatus && budgetStatus.status !== "no-budget",
  );

  const budget_amount = Number(budgetStatus?.budget_amount ?? 0);
  const spent_amount = Number(budgetStatus?.spent_amount ?? 0);
  const remaining_amount = Number(
    budgetStatus?.remaining_amount ?? Math.max(0, budget_amount - spent_amount),
  );

  const budgetPercent = useMemo(() => {
    if (!hasBudget || budget_amount <= 0) return 0;

    const percent =
      typeof budgetStatus?.percent_used === "number"
        ? budgetStatus.percent_used
        : (spent_amount / budget_amount) * 100;

    return clampPercent(percent);
  }, [budget_amount, budgetStatus?.percent_used, hasBudget, spent_amount]);

  if (loading) {
    return <LoadingView label="Đang tải ngân sách..." />;
  }

  const openEditBudget = async () => {
    setEditLoading(true);

    try {
      const currentBudget = await getCurrentBudget();

      if (!currentBudget) {
        Alert.alert(
          "Không tìm thấy ngân sách",
          "Ngân sách hiện tại không còn tồn tại. Vui lòng tạo lại ngân sách.",
        );
        return;
      }

      navigation.navigate("BudgetForm", {
        mode: "edit",
        budget: currentBudget,
      });
    } catch (error) {
      Alert.alert(
        "Không thể tải ngân sách",
        error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const showCentered = !hasBudget;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={showCentered ? [styles.container, styles.centered] : styles.container}
    >
      <ScreenHero
        kicker="Ngân sách"
        title="Ngân sách hiện tại"
        subtitle="Theo dõi chi tiêu, phần trăm sử dụng và trạng thái ngân sách theo kỳ."
      />

      <AppCard style={showCentered ? [styles.card, styles.centerCard] : styles.card}>
        <SectionHeader
          title="Chi tiết ngân sách"
          subtitle="Theo dõi hạn mức chi tiêu trong kỳ hiện tại."
          rightSlot={
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {hasBudget ? "Đang theo dõi" : "Chưa tạo"}
              </Text>
            </View>
          }
        />

        {hasBudget ? (
          <>
            <Text style={styles.label}>Đã sử dụng</Text>

            <View style={styles.progressRow}>
              <Text style={styles.percent}>{Math.round(budgetPercent)}%</Text>
              <Text style={styles.percentHint}>ngân sách</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: getProgressColor(budgetPercent),
                  },
                ]}
              />
            </View>

            <View style={styles.moneyRow}>
              <View style={styles.moneyBox}>
                <Text style={styles.moneyLabel}>Ngân sách</Text>
                <Text style={styles.moneyValue} numberOfLines={1}>
                  {formatCurrency(budget_amount)}
                </Text>
              </View>

              <View style={styles.moneyBox}>
                <Text style={styles.moneyLabel}>Đã chi</Text>
                <Text
                  style={[styles.moneyValue, styles.expense]}
                  numberOfLines={1}
                >
                  {formatCurrency(spent_amount)}
                </Text>
              </View>
            </View>

            <View style={styles.moneyBoxWide}>
              <Text style={styles.moneyLabel}>Còn lại</Text>
              <Text style={[styles.moneyValue, styles.income]} numberOfLines={1}>
                {formatCurrency(remaining_amount)}
              </Text>
            </View>

            <AppButton
              title="Sửa ngân sách"
              onPress={() => void openEditBudget()}
              loading={editLoading}
            />
          </>
        ) : (
          <EmptyState
            icon="₫"
            title="Bạn chưa có ngân sách cho kỳ hiện tại"
            description="Tạo ngân sách để theo dõi hạn mức chi tiêu và kiểm soát tài chính tốt hơn."
            actionLabel="Tạo ngân sách"
            onAction={() => navigation.navigate("BudgetForm", { mode: "create" })}
          />
        )}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 120, backgroundColor: COLORS.bg },
  card: { ...shadow, padding: 20, borderRadius: 28, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.blueLight },
  statusText: { color: COLORS.blue, fontSize: 12, fontWeight: "900" },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4, marginBottom: 10 },
  percent: { color: COLORS.text, fontSize: 38, fontWeight: "900" },
  percentHint: { marginLeft: 8, color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: "#E2E8F0", overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 999 },
  moneyRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  moneyBox: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  moneyBoxWide: { padding: 14, borderRadius: 18, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: COLORS.incomeBorder, marginBottom: 16 },
  moneyLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800", marginBottom: 5 },
  moneyValue: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
  income: { color: COLORS.income },
  expense: { color: COLORS.expense },
  centered: { justifyContent: "center" },
  centerCard: { alignSelf: "center", width: "92%" },
});