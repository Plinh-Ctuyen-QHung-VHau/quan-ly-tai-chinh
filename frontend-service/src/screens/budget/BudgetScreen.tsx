import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { SectionHeader } from "../../components/SectionHeader";
import { COLORS, shadow } from "../../constants/ui";
import {
  deleteBudget,
  getCurrentBudget,
  getCurrentBudgetStatus,
} from "../../services/budgetApi";
import { useBudgetStore } from "../../store/budgetStore";
import { BudgetStatus } from "../../types/budget";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";

// BudgetStatus.status từ API: "healthy" | "warning" | "danger" | "no-budget"
function getProgressColor(percent: number) {
  if (percent >= 90) return COLORS.expense;
  if (percent >= 70) return "#D97706";
  return COLORS.income;
}

function getBudgetStatusTheme(status?: BudgetStatus["status"] | null) {
  if (status === "danger") return { label: "Vượt ngưỡng", color: COLORS.expense, bg: COLORS.expenseSoft };
  if (status === "warning") return { label: "Cần chú ý", color: "#D97706", bg: "#FEF3C7" };
  if (status === "healthy") return { label: "Đang theo dõi", color: COLORS.income, bg: COLORS.incomeSoft };
  return { label: "Chưa có", color: COLORS.muted, bg: "#F1F5F9" };
}

export function BudgetScreen() {
  const navigation = useNavigation<any>();

  const budgetStatus = useBudgetStore((state) => state.currentBudgetStatus);
  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );

  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

    const raw =
      typeof budgetStatus?.percent_used === "number"
        ? budgetStatus.percent_used
        : (spent_amount / budget_amount) * 100;

    if (!Number.isFinite(raw) || Number.isNaN(raw)) return 0;
    return Math.min(100, Math.max(0, raw));
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

  // Tạo ngân sách MỚI SONG SONG — không xóa ngân sách cũ
  const openCreateBudget = () => {
    navigation.navigate("BudgetForm", { mode: "create" });
  };

  const executeDeleteBudget = async () => {
    setDeleteLoading(true);
    try {
      const idFromStatus = budgetStatus?.id;
      const currentBudget = idFromStatus ? null : await getCurrentBudget();
      const budget_id = idFromStatus || currentBudget?.id;

      if (!budget_id) {
        setCurrentBudgetStatus(null);
        Alert.alert("Đã xóa", "Ngân sách hiện tại không còn tồn tại.");
        return;
      }

      await deleteBudget(budget_id);
      setCurrentBudgetStatus(null);
      Alert.alert("Đã xóa", "Ngân sách đã được xóa thành công.");
    } catch (error: any) {
      const status = error?.statusCode ?? error?.response?.status;
      if (status === 404) {
        setCurrentBudgetStatus(null);
        Alert.alert("Đã xóa", "Ngân sách hiện tại không còn tồn tại.");
        return;
      }

      Alert.alert(
        "Không thể xóa",
        error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteBudget = () => {
    Alert.alert("Xóa ngân sách?", "Bạn có chắc muốn xóa ngân sách hiện tại?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => void executeDeleteBudget(),
      },
    ]);
  };

  const openBudgetActions = () => {
    Alert.alert("Tùy chọn ngân sách", "Chọn thao tác bạn muốn thực hiện.", [
      { text: "Hủy", style: "cancel" },
      { text: "Sửa ngân sách hiện tại", onPress: () => void openEditBudget() },
      {
        text: "Xóa ngân sách hiện tại",
        style: "destructive",
        onPress: () => void handleDeleteBudget(),
      },
    ]);
  };

  const progressColor = getProgressColor(budgetPercent);
  const statusTheme = getBudgetStatusTheme(budgetStatus?.status);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Ngân sách"
        title="Ngân sách hiện tại"
        subtitle="Theo dõi chi tiêu, phần trăm sử dụng và trạng thái ngân sách theo kỳ."
      />

      <AppCard style={styles.card}>
        <SectionHeader
          title="Chi tiết ngân sách"
          subtitle="Theo dõi hạn mức chi tiêu trong kỳ hiện tại."
          rightSlot={
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
                <Text style={[styles.statusText, { color: statusTheme.color }]}>
                  {hasBudget ? statusTheme.label : "Chưa tạo"}
                </Text>
              </View>
              {hasBudget ? (
                <Pressable
                  onPress={openBudgetActions}
                  style={({ pressed }) => [
                    styles.menuButton,
                    pressed && styles.menuButtonPressed,
                  ]}
                >
                  <Text style={styles.menuButtonText}>⋯</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />

        {hasBudget ? (
          <>
            {/* Period dates */}
            {budgetStatus?.start_date && budgetStatus?.end_date ? (
              <View style={styles.periodRow}>
                <Text style={styles.periodText}>
                  {formatDate(budgetStatus.start_date)} - {formatDate(budgetStatus.end_date)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Đã sử dụng</Text>

            <View style={styles.progressRow}>
              <Text style={[styles.percent, { color: progressColor }]}>
                {Math.round(budgetPercent)}%
              </Text>
              <Text style={styles.percentHint}>ngân sách</Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: statusTheme.bg }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: progressColor,
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

              <View style={[styles.moneyBox, styles.moneyBoxExpense]}>
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

            {/* Divider */}
            <View style={styles.divider} />


          </>
        ) : (
          <EmptyState
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "900" },
  menuButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  menuButtonPressed: { opacity: 0.78 },
  menuButtonText: { color: COLORS.text, fontSize: 20, lineHeight: 20, fontWeight: "900", marginTop: -4 },
  periodRow: { marginBottom: 14, padding: 10, borderRadius: 14, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft },
  periodText: { color: COLORS.blue, fontSize: 13, fontWeight: "800" },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4, marginBottom: 10 },
  percent: { fontSize: 38, fontWeight: "900" },
  percentHint: { marginLeft: 8, color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 14, borderRadius: 999, overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 999 },
  moneyRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  moneyBox: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  moneyBoxExpense: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  moneyBoxWide: { padding: 14, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  moneyLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800", marginBottom: 5 },
  moneyValue: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 16 },
  income: { color: COLORS.income },
  expense: { color: COLORS.expense },
});