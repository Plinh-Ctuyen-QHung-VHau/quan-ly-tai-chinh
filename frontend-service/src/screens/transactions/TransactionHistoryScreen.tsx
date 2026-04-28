import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { TransactionItem } from "../../components/TransactionItem";
import { ScreenHero } from "../../components/ScreenHero";
import { TransactionHistoryFiltersCard } from "../../components/TransactionHistoryFiltersCard";
import { COLORS, shadow } from "../../constants/ui";
import { getCategories, getTransactions } from "../../services/transactionApi";
import { Category, TransactionType } from "../../types/category";
import { Transaction, TransactionFilters } from "../../types/transaction";

type DateField = "from" | "to";
type RangePreset = "today" | "7days" | "month" | "custom";

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: formatInputDate(start),
    to: formatInputDate(end),
  };
}

function getLast7DaysRange() {
  const end = new Date();
  const start = new Date();

  start.setDate(end.getDate() - 6);

  return {
    from: formatInputDate(start),
    to: formatInputDate(end),
  };
}

function getTodayRange() {
  const today = formatInputDate(new Date());

  return {
    from: today,
    to: today,
  };
}

function getTypeLabel(type: TransactionType) {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

async function loadHistoryCategories(type: TransactionType, category_id: string) {
  if (type !== "income" && type !== "expense") {
    return { safeList: [], nextcategory_id: "" };
  }

  const data = await getCategories(type);
  const safeList = Array.isArray(data) ? data : [];

  return {
    safeList,
    nextcategory_id: safeList.some((item) => item.id === category_id)
      ? category_id
      : "",
  };
}

function applyRangePresetValue(preset: RangePreset) {
  if (preset === "today") return getTodayRange();
  if (preset === "7days") return getLast7DaysRange();
  if (preset === "month") return getMonthRange();

  return { from: "", to: "" };
}

function setHistoryDate(
  field: DateField,
  date: Date,
  setFromDate: (value: string) => void,
  setToDate: (value: string) => void,
  setRangePreset: (value: RangePreset) => void,
) {
  const formatted = formatInputDate(date);

  if (field === "from") {
    setFromDate(formatted);
  } else {
    setToDate(formatted);
  }

  setRangePreset("custom");
}

export function TransactionHistoryScreen() {
  const navigation = useNavigation<any>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("10");
  const [type, setType] = useState<TransactionType>("expense");
  const [category_id, setcategory_id] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("custom");
  const [showIosPicker, setShowIosPicker] = useState<DateField | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);

  const visibleIncome = useMemo(() => {
    return safeTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [safeTransactions]);

  const visibleExpense = useMemo(() => {
    return safeTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [safeTransactions]);

  const netCashFlow = visibleIncome - visibleExpense;

  const loadCategories = useCallback(async () => {
    try {
      const { safeList, nextcategory_id } = await loadHistoryCategories(
        type,
        category_id,
      );

      setCategories(safeList);

      if (nextcategory_id !== category_id) {
        setcategory_id(nextcategory_id);
      }
    } catch (error) {
      console.log("Load categories error:", error);
      setCategories([]);
    }
  }, [category_id, type]);

  const loadTransactions = useCallback(async (nextPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const filters: TransactionFilters = {
        page: nextPage,
        limit: Number(limit) || 10,
        type,
        category_id: category_id || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const result = await getTransactions(filters);
      const incoming = Array.isArray(result.data) ? result.data : [];

      setTransactions((prev) => {
        if (!append) return incoming;
        const merged = [...prev, ...incoming];
        const uniqueMap = new Map(merged.map((item) => [item.id, item]));
        return Array.from(uniqueMap.values());
      });
      setPage(nextPage);
      setTotalPages(Math.max(1, result.meta?.totalPages ?? 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch.",
      );
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [category_id, fromDate, limit, toDate, type]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadTransactions(1);
    }, [loadCategories, loadTransactions]),
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Auto-reload khi filter thay đổi
  useEffect(() => {
    void loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, category_id, fromDate, toDate, limit]);

  const setDateValue = useCallback((field: DateField, date: Date) => {
    setHistoryDate(field, date, setFromDate, setToDate, setRangePreset);
  }, []);

  const openDatePicker = useCallback(
    (field: DateField) => {
      setShowIosPicker(field);
    },
    [],
  );

  const applyPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    setShowIosPicker(null);

    const range = applyRangePresetValue(preset);
    setFromDate(range.from);
    setToDate(range.to);
    setPage(1);
  };

  const clearFilters = () => {
    setType("expense");
    setcategory_id("");
    setFromDate("");
    setToDate("");
    setLimit("10");
    setPage(1);
    setRangePreset("custom");
    setShowIosPicker(null);
  };

  if (loading && !safeTransactions.length) {
    return <LoadingView label="Đang tải giao dịch..." />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Giao dịch"
        title="Lịch sử giao dịch"
        subtitle="Theo dõi các khoản thu chi và lọc nhanh theo thời gian, danh mục."
        rightSlot={
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getTypeLabel(type)}</Text>
          </View>
        }
      />

      <View style={styles.heroStatsRow}>
        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>Giao dịch</Text>
          <Text style={styles.heroStatValueDark}>{safeTransactions.length}</Text>
        </View>

        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>Dòng tiền</Text>
          <Text
            style={[
              styles.heroStatValueDark,
              { color: netCashFlow >= 0 ? COLORS.income : COLORS.expense },
            ]}
            numberOfLines={1}
          >
            {formatCurrency(netCashFlow)}
          </Text>
        </View>
      </View>

      <TransactionHistoryFiltersCard
        type={type}
        setType={setType}
        category_id={category_id}
        setcategory_id={setcategory_id}
        categories={safeCategories}
        fromDate={fromDate}
        toDate={toDate}
        rangePreset={rangePreset}
        showIosPicker={showIosPicker}
        onApplyPreset={applyPreset}
        onClearDates={() => {
          setFromDate("");
          setToDate("");
          setRangePreset("custom");
          setShowIosPicker(null);
        }}
        onCloseDatePicker={() => setShowIosPicker(null)}
        onOpenDatePicker={openDatePicker}
        onConfirmDate={setDateValue}
        limit={limit}
        setLimit={setLimit}
        page={page}
        totalPages={safeTotalPages}
        loading={loading}
        onLoadTransactions={() => void loadTransactions(1)}
        onClearFilters={clearFilters}
        onSetPage={setPage}
      />

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Danh sách giao dịch</Text>
          <Text style={styles.listSubtitle}>
            {safeTransactions.length
              ? `${safeTransactions.length} giao dịch đang hiển thị`
              : "Chưa có giao dịch phù hợp"}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("AddTransaction")}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {safeTransactions.length ? (
        <>
          {safeTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onPress={() =>
                navigation.navigate("TransactionDetail", {
                  transaction_id: transaction.id,
                })
              }
            />
          ))}

          {page < safeTotalPages ? (
            <Pressable
              onPress={() => void loadTransactions(page + 1, true)}
              disabled={loadingMore}
              style={({ pressed }) => [
                styles.loadMoreButton,
                (pressed || loadingMore) && styles.loadMoreButtonPressed,
              ]}
            >
              <Text style={styles.loadMoreButtonText}>
                {loadingMore ? "Đang tải..." : "Xem thêm giao dịch"}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Chưa có giao dịch nào"
          description="Hãy thêm giao dịch đầu tiên của bạn"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 130, backgroundColor: COLORS.bg },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.blue },
  typeBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  heroStatsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  heroStatBox: { ...shadow, flex: 1, padding: 14, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  heroStatLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  heroStatValueDark: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 },
  listTitle: { color: COLORS.text, fontSize: 19, fontWeight: "900" },
  listSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  addButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.dark },
  addButtonText: { color: COLORS.white, fontWeight: "900", fontSize: 13 },
  error: { color: COLORS.expense, backgroundColor: COLORS.expenseSoft, padding: 12, borderRadius: 14, marginBottom: 10, fontWeight: "700" },
  loadMoreButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", marginTop: 6 },
  loadMoreButtonPressed: { opacity: 0.75 },
  loadMoreButtonText: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
});