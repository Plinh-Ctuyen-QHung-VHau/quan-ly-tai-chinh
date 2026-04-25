import React, { useCallback, useState } from "react";
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

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [summaryResult, budgetResult] = await Promise.all([
        getTransactionSummary(),
        getCurrentBudgetStatus(),
      ]);
      setSummary(summaryResult);
      setBudgetStatus(budgetResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải dữ liệu tổng quan.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  if (loading) {
    return <LoadingView label="Đang tải tổng quan..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadData();
          }}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Tổng quan</Text>
        <Text style={styles.subtitle}>
          Theo dõi thu, chi, số dư và ngân sách hiện tại.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <AppButton
          title="Thêm giao dịch"
          onPress={() => navigation.navigate("AddTransaction")}
        />
      </View>

      <AppCard>
        <Text style={styles.cardTitle}>Thống kê giao dịch</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tổng thu</Text>
          <Text style={styles.statValueIncome}>
            {formatCurrency(summary?.totalIncome ?? 0)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tổng chi</Text>
          <Text style={styles.statValueExpense}>
            {formatCurrency(summary?.totalExpense ?? 0)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Số dư</Text>
          <Text style={styles.statValueBalance}>
            {formatCurrency(summary?.balance ?? 0)}
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Ngân sách hiện tại</Text>
        {budgetStatus?.status === "no-budget" ? (
          <Text style={styles.muted}>Chưa có ngân sách.</Text>
        ) : (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Ngân sách</Text>
              <Text style={styles.statValue}>
                {formatCurrency(budgetStatus?.budgetAmount ?? 0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Đã chi</Text>
              <Text style={styles.statValueExpense}>
                {formatCurrency(budgetStatus?.spentAmount ?? 0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Còn lại</Text>
              <Text style={styles.statValueIncome}>
                {formatCurrency(budgetStatus?.remainingAmount ?? 0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Trạng thái</Text>
              <Text style={styles.statValue}>
                {budgetStatus?.status ?? "-"}
              </Text>
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
  hero: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    color: "#475569",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
  actions: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    color: "#475569",
  },
  statValue: {
    fontWeight: "700",
    color: "#0f172a",
  },
  statValueIncome: {
    fontWeight: "700",
    color: "#15803d",
  },
  statValueExpense: {
    fontWeight: "700",
    color: "#b91c1c",
  },
  statValueBalance: {
    fontWeight: "700",
    color: "#0f172a",
  },
  muted: {
    color: "#64748b",
  },
});
