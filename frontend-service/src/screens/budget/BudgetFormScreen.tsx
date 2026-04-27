import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import {
  createBudget,
  getCurrentBudgetStatus,
  updateBudget,
} from "../../services/budgetApi";
import { useBudgetStore } from "../../store/budgetStore";
import { Budget, BudgetPeriod } from "../../types/budget";
import { isPositiveAmount, validateBudgetPeriod } from "../../utils/validators";

type DateField = "start" | "end";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function today() {
  return formatDate(new Date());
}

function endOfMonth() {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function formatVND(value: string) {
  const number = Number(value);

  if (!number) return "0 đ";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

export function BudgetFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );

  const mode = (route.params?.mode ?? "create") as "create" | "edit";
  const budget = route.params?.budget as Budget | undefined;

  const [budget_amount, setBudgetAmount] = useState(
    String(budget?.budget_amount ?? ""),
  );

  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(
    budget?.budget_period ?? "monthly",
  );

  const [start_date, setStartDate] = useState(budget?.start_date ?? today());
  const [end_date, setEndDate] = useState(budget?.end_date ?? endOfMonth());

  const [showIosPicker, setShowIosPicker] = useState<DateField | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const periodLabel = budgetPeriod === "weekly" ? "Theo tuần" : "Theo tháng";

  const dailyLimit = useMemo(() => {
    const amount = Number(budget_amount);

    if (!amount || !start_date || !end_date) return "0 đ";

    const start = new Date(start_date).getTime();
    const end = new Date(end_date).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      return "0 đ";
    }

    const days = Math.floor((end - start) / 86400000) + 1;
    return formatVND(String(Math.floor(amount / days)));
  }, [budget_amount, start_date, end_date]);

  const setDateValue = (field: DateField, date: Date) => {
    const value = formatDate(date);

    if (field === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const openDatePicker = (field: DateField) => {
    const currentValue = field === "start" ? start_date : end_date;
    const currentDate = parseDate(currentValue);

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
  };

  const handleIosPickDate = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "dismissed" || !selectedDate || !showIosPicker) {
      setShowIosPicker(null);
      return;
    }

    setDateValue(showIosPicker, selectedDate);
  };

  const handleSave = async () => {
    setError("");

    if (!budget_amount.trim()) {
      setError("Vui lòng nhập số tiền ngân sách.");
      return;
    }

    if (!isPositiveAmount(budget_amount)) {
      setError("Số tiền ngân sách phải lớn hơn 0.");
      return;
    }

    if (!validateBudgetPeriod(budgetPeriod)) {
      setError("Vui lòng chọn chu kỳ ngân sách.");
      return;
    }

    if (!start_date.trim()) {
      setError("Vui lòng chọn ngày bắt đầu.");
      return;
    }

    if (end_date && new Date(end_date) < new Date(start_date)) {
      setError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        budgetAmount: Number(budget_amount),
        budgetPeriod,
        startDate: parseDate(start_date),
        endDate: end_date ? parseDate(end_date) : undefined,
      };

      if (mode === "edit" && budget?.id) {
        await updateBudget(budget.id, payload as any);
      } else {
        await createBudget(payload as any);
      }

      const currentBudgetStatus = await getCurrentBudgetStatus();
      setCurrentBudgetStatus(currentBudgetStatus);

      Alert.alert("Đã lưu", "Ngân sách đã được lưu thành công.");
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu ngân sách.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.badge}>Ngân sách</Text>

      <Text style={styles.title}>
        {mode === "edit" ? "Sửa ngân sách" : "Tạo ngân sách"}
      </Text>

      <Text style={styles.subtitle}>
        Thiết lập giới hạn chi tiêu để kiểm soát tài chính tốt hơn.
      </Text>

      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Ngân sách dự kiến</Text>
        <Text style={styles.previewAmount}>{formatVND(budget_amount)}</Text>

        <View style={styles.previewRow}>
          <View style={styles.previewItem}>
            <Text style={styles.previewItemLabel}>Chu kỳ</Text>
            <Text style={styles.previewItemValue}>{periodLabel}</Text>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewItem}>
            <Text style={styles.previewItemLabel}>Mỗi ngày</Text>
            <Text style={styles.previewItemValue}>{dailyLimit}</Text>
          </View>
        </View>
      </View>

      <AppCard style={styles.card}>
        <AppInput
          label="Số tiền ngân sách"
          value={budget_amount}
          onChangeText={setBudgetAmount}
          keyboardType="numeric"
          placeholder="VD: 5000000"
        />

        <Text style={styles.label}>Chu kỳ ngân sách</Text>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setBudgetPeriod("weekly")}
            style={[
              styles.segmentButton,
              budgetPeriod === "weekly" && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                budgetPeriod === "weekly" && styles.segmentTextActive,
              ]}
            >
              Theo tuần
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBudgetPeriod("monthly")}
            style={[
              styles.segmentButton,
              budgetPeriod === "monthly" && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                budgetPeriod === "monthly" && styles.segmentTextActive,
              ]}
            >
              Theo tháng
            </Text>
          </Pressable>
        </View>

        <View style={styles.dateHeader}>
          <Text style={styles.label}>Ngày bắt đầu</Text>

          <Pressable onPress={() => setStartDate(today())}>
            <Text style={styles.quickText}>Hôm nay</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => openDatePicker("start")}
          style={[
            styles.dateBox,
            showIosPicker === "start" && styles.dateBoxActive,
          ]}
        >
          <Text style={styles.dateText}>{start_date}</Text>
          <Text style={styles.dateHint}>
            {showIosPicker === "start" ? "Đóng" : "Chọn ngày"}
          </Text>
        </Pressable>

        {Platform.OS === "ios" && showIosPicker === "start" ? (
          <View style={styles.pickerBox}>
            <DateTimePicker
              value={parseDate(start_date)}
              mode="date"
              display="spinner"
              onChange={handleIosPickDate}
            />

            <Pressable
              onPress={() => setShowIosPicker(null)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Xong</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.dateHeader}>
          <Text style={styles.label}>Ngày kết thúc</Text>

          <Pressable onPress={() => setEndDate(endOfMonth())}>
            <Text style={styles.quickText}>Cuối tháng</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => openDatePicker("end")}
          style={[
            styles.dateBox,
            showIosPicker === "end" && styles.dateBoxActive,
          ]}
        >
          <Text style={styles.dateText}>
            {end_date || "Chọn ngày kết thúc"}
          </Text>
          <Text style={styles.dateHint}>
            {showIosPicker === "end" ? "Đóng" : "Chọn ngày"}
          </Text>
        </Pressable>

        {Platform.OS === "ios" && showIosPicker === "end" ? (
          <View style={styles.pickerBox}>
            <DateTimePicker
              value={parseDate(end_date)}
              mode="date"
              display="spinner"
              onChange={handleIosPickDate}
            />

            <Pressable
              onPress={() => setShowIosPicker(null)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Xong</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          title={mode === "edit" ? "Lưu thay đổi" : "Tạo ngân sách"}
          onPress={() => void handleSave()}
          loading={loading}
        />

        <Pressable
          disabled={loading}
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Quay lại</Text>
        </Pressable>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 28,
    backgroundColor: "#F6F8FB",
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 16,
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
    marginBottom: 20,
  },

  previewCard: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#0F172A",
    marginBottom: 18,
  },

  previewLabel: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  previewAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    marginBottom: 20,
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },

  previewItem: {
    flex: 1,
  },

  previewDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#334155",
    marginHorizontal: 14,
  },

  previewItemLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },

  previewItemValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  card: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    marginBottom: 18,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  segmentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },

  segmentTextActive: {
    color: "#0F172A",
  },

  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  quickText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
  },

  dateBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateBoxActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    marginBottom: 10,
  },

  dateText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  dateHint: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },

  pickerBox: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  doneButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  doneButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "800",
  },

  error: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 12,
  },

  cancelButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "#F1F5F9",
  },

  cancelText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
});