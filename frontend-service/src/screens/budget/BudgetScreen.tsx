import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { deleteBudget, getCurrentBudgetStatus } from "../../services/budgetApi";
import { useBudgetStore } from "../../store/budgetStore";
import { Budget, BudgetStatus } from "../../types/budget";
import { formatCurrency } from "../../utils/formatCurrency";

export function BudgetScreen() {
  const navigation = useNavigation<any>();
  const currentStatus = useBudgetStore((state) => state.currentBudgetStatus);
  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const status = await getCurrentBudgetStatus();
      setCurrentBudgetStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ngân sách.");
    } finally {
      setLoading(false);
    }
  }, [setCurrentBudgetStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const handleDelete = () => {
    const budgetId = currentStatus?.id;
    if (!budgetId) {
      return;
    }

    Alert.alert("Xác nhận xóa", "Bạn chắc chắn muốn xóa ngân sách hiện tại?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteBudget(budgetId);
            await loadStatus();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingView label="Đang tải ngân sách..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Ngân sách hiện tại</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!currentStatus || currentStatus.status === "no-budget" ? (
          <EmptyState
            title="Bạn chưa có ngân sách cho kỳ hiện tại"
            description="Hãy tạo ngân sách để theo dõi chi tiêu trong kỳ này."
            actionLabel="Tạo ngân sách"
            onAction={() =>
              navigation.navigate("BudgetForm", { mode: "create" })
            }
          />
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Budget</Text>
              <Text style={styles.value}>
                {formatCurrency(currentStatus.budget_amount)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Đã chi</Text>
              <Text style={styles.valueExpense}>
                {formatCurrency(currentStatus.spent_amount)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Còn lại</Text>
              <Text style={styles.valueIncome}>
                {formatCurrency(currentStatus.remaining_amount)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Đã dùng</Text>
              <Text style={styles.value}>
                {`${Math.round(currentStatus.percent_used)}%`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Trạng thái</Text>
              <Text style={styles.value}>{currentStatus.status}</Text>
            </View>
            <View style={styles.actions}>
              <AppButton
                title="Sửa budget"
                onPress={() =>
                  navigation.navigate("BudgetForm", {
                    mode: "edit",
                    budget: currentStatus,
                  })
                }
              />
              <AppButton
                title="Xóa budget"
                variant="danger"
                onPress={handleDelete}
                loading={deleting}
              />
            </View>
          </>
        )}
      </AppCard>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    color: "#64748b",
  },
  value: {
    fontWeight: "700",
    color: "#0f172a",
  },
  valueIncome: {
    fontWeight: "700",
    color: "#15803d",
  },
  valueExpense: {
    fontWeight: "700",
    color: "#b91c1c",
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
});
