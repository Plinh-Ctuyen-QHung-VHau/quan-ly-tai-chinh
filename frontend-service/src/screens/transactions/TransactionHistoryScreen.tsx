import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  View,
} from "react-native";
import {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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

function parseInputDate(value: string) {
  if (!value) return new Date();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

function openHistoryDatePicker(
  field: DateField,
  fromDate: string,
  toDate: string,
  setShowIosPicker: (
    value: DateField | null | ((current: DateField | null) => DateField | null),
  ) => void,
  setDateValue: (field: DateField, date: Date) => void,
) {
  const currentValue = field === "from" ? fromDate : toDate;
  const currentDate = parseInputDate(currentValue);

  if (Platform.OS === "android") {
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: "date",
      display: "calendar",
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "dismissed" || !selectedDate) return;
        setDateValue(field, selectedDate);
      },
    });

    return;
  }

  setShowIosPicker((current) => (current === field ? null : field));
}

function handleHistoryIosDateChange(
  event: DateTimePickerEvent,
  selectedDate: Date | undefined,
  showIosPicker: DateField | null,
  setShowIosPicker: (value: DateField | null) => void,
  setDateValue: (field: DateField, date: Date) => void,
) {
  if (event.type === "dismissed" || !selectedDate || !showIosPicker) {
    setShowIosPicker(null);
    return;
  }

  setDateValue(showIosPicker, selectedDate);
}

export function TransactionHistoryScreen() {
  const navigation = useNavigation<any>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const filters: TransactionFilters = {
        page,
        limit: Number(limit) || 10,
        type,
        category_id: category_id || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const result = await getTransactions(filters);

      setTransactions(Array.isArray(result.data) ? result.data : []);
      setTotalPages(Math.max(1, result.meta?.totalPages ?? 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch.",
      );
    } finally {
      setLoading(false);
    }
  }, [category_id, fromDate, limit, page, toDate, type]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadTransactions();
    }, [loadCategories, loadTransactions]),
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const setDateValue = useCallback((field: DateField, date: Date) => {
    setHistoryDate(field, date, setFromDate, setToDate, setRangePreset);
  }, []);

  const openDatePicker = useCallback(
    (field: DateField) => {
      openHistoryDatePicker(
        field,
        fromDate,
        toDate,
        setShowIosPicker,
        setDateValue,
      );
    },
    [fromDate, setDateValue, toDate],
  );

  const handleIosDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      handleHistoryIosDateChange(
        event,
        selectedDate,
        showIosPicker,
        setShowIosPicker,
        setDateValue,
      );
    },
    [setDateValue, showIosPicker],
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
        onCloseIosPicker={() => setShowIosPicker(null)}
        onOpenDatePicker={openDatePicker}
        onIosDateChange={handleIosDateChange}
        limit={limit}
        setLimit={setLimit}
        page={page}
        totalPages={safeTotalPages}
        loading={loading}
        onLoadTransactions={() => {
          setPage(1);
          void loadTransactions();
        }}
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
        safeTransactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            onPress={() =>
              navigation.navigate("TransactionDetail", {
                transaction_id: transaction.id,
              })
            }
          />
        ))
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
});