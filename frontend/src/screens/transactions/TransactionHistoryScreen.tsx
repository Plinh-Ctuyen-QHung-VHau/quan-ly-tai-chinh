import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { EmptyState } from "../../components/EmptyState";
import { LoadingView } from "../../components/LoadingView";
import { TransactionItem } from "../../components/TransactionItem";
import { ScreenHero } from "../../components/ScreenHero";
import { TransactionHistoryFiltersCard } from "../../components/TransactionHistoryFiltersCard";
import { COLORS, shadow } from "../../constants/ui";
import { TransactionType } from "../../types/category";
import { useAppDataStore } from "../../store/appDataStore";

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

  const allTransactions = useAppDataStore((state) => state.transactions);
  const expenseCategories = useAppDataStore((state) => state.expenseCategories);
  const incomeCategories = useAppDataStore((state) => state.incomeCategories);
  const loading = useAppDataStore((state) => state.isInitializing || state.isRefreshing);
  const error = useAppDataStore((state) => state.error);

  const [type, setType] = useState<TransactionType | null>(null);
  const [category_id, setcategory_id] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("custom");
  const [showIosPicker, setShowIosPicker] = useState<DateField | null>(null);


  const categories = type === "income" ? incomeCategories : expenseCategories;
  const safeCategories = (() => {
    if (type === null) return [];
    return Array.isArray(categories) ? categories : [];
  })();

  const safeTransactions = useMemo(() => {
    return (Array.isArray(allTransactions) ? allTransactions : []).filter(item => {
      if (type !== null && item.type !== type) return false;
      if (category_id && item.category_id !== category_id) return false;
      if (fromDate) {
        const itemDateStr = (item.transaction_date || "").substring(0, 10);
        if (itemDateStr < fromDate) return false;
      }
      if (toDate) {
        const itemDateStr = (item.transaction_date || "").substring(0, 10);
        if (itemDateStr > toDate) return false;
      }
      return true;
    });
  }, [allTransactions, type, category_id, fromDate, toDate]);

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
  };

  const clearFilters = () => {
    setType(null);
    setcategory_id("");
    setFromDate("");
    setToDate("");
    setRangePreset("custom");
    setShowIosPicker(null);
  };


  if (loading && !safeTransactions.length) {
    return <LoadingView label="Đang tải giao dịch..." />;
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHero
        kicker="Giao dịch"
        title="Lịch sử giao dịch"
        subtitle="Theo dõi các khoản thu chi và lọc nhanh theo thời gian, danh mục."
        rightSlot={
          type ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{getTypeLabel(type)}</Text>
            </View>
          ) : undefined
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
        onClearFilters={clearFilters}
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
          <Text style={styles.addButtonText}>Thêm</Text>
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
        </>
      ) : (
        <EmptyState
          title="Chưa có giao dịch nào"
          description="Hãy thêm giao dịch đầu tiên của bạn"
        />
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 40, paddingBottom: 60, backgroundColor: COLORS.bg },
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