import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { TransactionItem } from "../../components/TransactionItem";
import { getCategories, getTransactions } from "../../services/transactionApi";
import { Category, TransactionType } from "../../types/category";
import { Transaction, TransactionFilters } from "../../types/transaction";

export function TransactionHistoryScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("10");
  const [type, setType] = useState<TransactionType>("income");
  const [categoryId, setCategoryId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      if (type !== "income" && type !== "expense") {
        setCategories([]);
        return;
      }

      const data = await getCategories(type);
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load categories error:", error);
      setCategories([]);
    }
  }, [type]);
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters: TransactionFilters = {
        page,
        limit: Number(limit) || 10,
        type,
        category_id: categoryId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };
      const result = await getTransactions(filters);
      setTransactions(result.items);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch.",
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId, fromDate, limit, page, toDate, type]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadTransactions();
    }, [loadCategories, loadTransactions]),
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  if (loading && !safeTransactions.length) {
    return <LoadingView label="Đang tải giao dịch..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Lịch sử giao dịch</Text>
        <Text style={styles.subtitle}>
          Lọc theo loại, danh mục và khoảng ngày.
        </Text>

        <View style={styles.typeRow}>
          {(["income", "expense"] as const).map((value) => (
            <AppButton
              key={value}
              title={value}
              variant={type === value ? "primary" : "secondary"}
              onPress={() => setType(value)}
              style={styles.typeButton}
            />
          ))}
        </View>

        <Text style={styles.label}>Danh mục</Text>
        <CategoryPicker
          items={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />

        <AppInput
          label="Từ ngày"
          value={fromDate}
          onChangeText={setFromDate}
          placeholder="YYYY-MM-DD"
        />
        <AppInput
          label="Đến ngày"
          value={toDate}
          onChangeText={setToDate}
          placeholder="YYYY-MM-DD"
        />
        <AppInput
          label="Limit"
          value={limit}
          onChangeText={setLimit}
          keyboardType="numeric"
          placeholder="10"
        />

        <AppButton
          title="Áp dụng bộ lọc"
          onPress={() => void loadTransactions()}
          loading={loading}
        />
        <Text style={styles.pagination}>
          Trang {page} / {totalPages}
        </Text>
        <View style={styles.paginationRow}>
          <AppButton
            title="Trang trước"
            variant="secondary"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            style={styles.pageButton}
            disabled={page <= 1}
          />
          <AppButton
            title="Trang sau"
            variant="secondary"
            onPress={() => setPage((current) => current + 1)}
            style={styles.pageButton}
            disabled={page >= totalPages}
          />
        </View>
      </AppCard>

      <View style={styles.listHeader}>
        <AppButton
          title="Thêm giao dịch"
          onPress={() => navigation.navigate("AddTransaction")}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {safeTransactions.length ? (
        safeTransactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            onPress={() =>
              navigation.navigate("TransactionDetail", {
                transactionId: transaction.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          title="Không có giao dịch"
          description="Hãy thay đổi bộ lọc hoặc thêm giao dịch mới."
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
    marginBottom: 6,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  label: {
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 6,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  typeButton: {
    flexGrow: 1,
  },
  pagination: {
    textAlign: "center",
    color: "#475569",
    marginTop: 12,
    marginBottom: 8,
  },
  paginationRow: {
    flexDirection: "row",
    gap: 10,
  },
  pageButton: {
    flex: 1,
  },
  listHeader: {
    marginVertical: 12,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 8,
  },
});
