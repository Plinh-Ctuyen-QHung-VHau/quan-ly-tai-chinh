import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { DatePickerModal } from "../../components/DatePickerModal";
import { AppInput } from "../../components/AppInput";
import {
  createBudget,
  getCurrentBudgetStatus,
  updateBudget,
} from "../../services/budgetApi";
import { COLORS, shadow } from "../../constants/ui";
import { useBudgetStore } from "../../store/budgetStore";
import { Budget, budget_period } from "../../types/budget";
import { isPositiveAmount, validatebudget_period } from "../../utils/validators";

type DateField = "start" | "end";

const PERIODS: { label: string; value: budget_period }[] = [
  { label: "Theo tuần", value: "weekly" },
  { label: "Theo tháng", value: "monthly" },
];

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDate(value?: string | null) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function startOfMonth() {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function endOfMonth() {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function startOfWeek() {
  const now = new Date();
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return formatDate(start);
}

function endOfWeek() {
  const end = parseDate(startOfWeek());
  end.setDate(end.getDate() + 6);
  return formatDate(end);
}

function formatVND(value: string | number) {
  const number = Number(value);
  if (!number) return "0 đ";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function getPeriodLabel(period: budget_period) {
  return period === "weekly" ? "Theo tuần" : "Theo tháng";
}


function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewStatItem}>
      <Text style={styles.previewStatLabel}>{label}</Text>
      <Text style={styles.previewStatValue}>{value}</Text>
    </View>
  );
}

function DateCard({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dateCard, active && styles.dateCardActive]}
    >
      <Text style={styles.dateCardLabel}>{label}</Text>
      <Text style={styles.dateCardValue}>{value}</Text>
      <Text style={styles.dateCardHint}>
        {active ? "Đang chọn" : "Nhấn để thay đổi"}
      </Text>
    </Pressable>
  );
}

export function BudgetFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );

  const mode = (route.params?.mode ?? "create") as "create" | "edit";
  const budget = route.params?.budget as Budget | undefined;
  const initialPeriodFromRoute = route.params?.initial_budget_period as
    | budget_period
    | undefined;
  const initialStartDateFromRoute = route.params?.initial_start_date as
    | string
    | undefined;
  const initialEndDateFromRoute = route.params?.initial_end_date as
    | string
    | undefined;

  const initialPeriod =
    mode === "create"
      ? initialPeriodFromRoute ?? "monthly"
      : budget?.budget_period ?? "monthly";
  const initialStartDate =
    mode === "create"
      ? initialStartDateFromRoute || (initialPeriod === "weekly" ? startOfWeek() : startOfMonth())
      : normalizeDate(budget?.start_date) || startOfMonth();
  const initialEndDate =
    mode === "create"
      ? initialEndDateFromRoute || (initialPeriod === "weekly" ? endOfWeek() : endOfMonth())
      : normalizeDate(budget?.end_date) || endOfMonth();

  const [budget_amount, setbudget_amount] = useState(
    String(budget?.budget_amount ?? ""),
  );
  const [budget_period, setbudget_period] = useState<budget_period>(initialPeriod);
  const [start_date, setstart_date] = useState(initialStartDate);
  const [end_date, setend_date] = useState(initialEndDate);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const periodLabel = getPeriodLabel(budget_period);

  const dayCount = useMemo(() => {
    if (!start_date || !end_date) return 0;

    const start = parseDate(start_date).getTime();
    const end = parseDate(end_date).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;

    return Math.floor((end - start) / 86400000) + 1;
  }, [start_date, end_date]);

  const dailyLimit = useMemo(() => {
    const amount = Number(budget_amount);
    return amount && dayCount ? formatVND(Math.floor(amount / dayCount)) : "0 đ";
  }, [budget_amount, dayCount]);

  const setDateValue = (field: DateField, date: Date) => {
    const value = formatDate(date);
    field === "start" ? setstart_date(value) : setend_date(value);
  };

  const applyPeriod = (period: budget_period) => {
    setbudget_period(period);

    if (period === "weekly") {
      setstart_date(startOfWeek());
      setend_date(endOfWeek());
      return;
    }

    setstart_date(startOfMonth());
    setend_date(endOfMonth());
  };

  const openDatePicker = (field: DateField) => {
    setActiveDateField(field);
  };

  const validateForm = () => {
    if (!budget_amount.trim()) return "Vui lòng nhập số tiền ngân sách.";
    if (!isPositiveAmount(budget_amount)) return "Số tiền ngân sách phải lớn hơn 0.";
    if (!validatebudget_period(budget_period)) return "Vui lòng chọn chu kỳ ngân sách.";
    if (!start_date.trim()) return "Vui lòng chọn ngày bắt đầu.";
    if (!end_date.trim()) return "Vui lòng chọn ngày kết thúc.";
    if (parseDate(end_date) < parseDate(start_date)) {
      return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    }

    return "";
  };

  const handleSave = async () => {
    const message = validateForm();
    setError(message);

    if (message) return;

    setLoading(true);

    try {
      const payload = {
        budget_amount: Number(budget_amount),
        budget_period: budget_period,
        start_date,
        end_date,
      };

      console.log("[BUDGET PAYLOAD]", payload);

      if (mode === "edit" && budget?.id) {
        await updateBudget(budget.id, payload);
      } else {
        await createBudget(payload);
      }

      try {
        const currentBudgetStatus = await getCurrentBudgetStatus();
        setCurrentBudgetStatus(currentBudgetStatus);
      } catch (refreshError) {
        console.warn("[BUDGET STATUS REFRESH FAILED]", refreshError);
      }

      Alert.alert("Đã lưu", "Ngân sách đã được lưu thành công.");
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu ngân sách.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />

        <Text style={styles.heroKicker}>Ngân sách</Text>

        <Text style={styles.heroTitle}>
          {mode === "edit" ? "Sửa ngân sách" : "Tạo ngân sách"}
        </Text>

        <Text style={styles.heroSubtitle}>
          Thiết lập giới hạn chi tiêu để kiểm soát tài chính tốt hơn.
        </Text>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewTopRow}>
          <View style={styles.previewTopContent}>
            <Text style={styles.previewLabel}>Ngân sách dự kiến</Text>
            <Text
              style={styles.previewAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {formatVND(budget_amount)}
            </Text>
          </View>

          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{periodLabel}</Text>
          </View>
        </View>

        <View style={styles.previewDivider} />

        <View style={styles.previewStatsRow}>
          <PreviewStat label="Chu kỳ" value={periodLabel} />
          <View style={styles.previewStatDivider} />
          <PreviewStat label="Mỗi ngày" value={dailyLimit} />
        </View>


      </View>

      <AppCard style={styles.formCard}>
        <Text style={styles.formTitle}>Thông tin</Text>



        <View style={styles.amountBox}>
          <Text style={styles.label}>Ngân sách dự kiến</Text>

          <AppInput
            label=""
            value={budget_amount}
            onChangeText={setbudget_amount}
            keyboardType="numeric"
            placeholder="VD: 5000000"
          />


        </View>

        <Text style={styles.label}>Chu kỳ áp dụng</Text>

        <View style={styles.segment}>
          {PERIODS.map((item) => {
            const active = budget_period === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => applyPeriod(item.value)}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
              >
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateHeader}>
          <Text style={styles.label}>Khoảng thời gian</Text>

          <Pressable onPress={() => applyPeriod(budget_period)}>

          </Pressable>
        </View>

        <View style={styles.dateRow}>
          <DateCard
            label="Bắt đầu"
            value={start_date}
            active={activeDateField === "start"}
            onPress={() => openDatePicker("start")}
          />

          <DateCard
            label="Kết thúc"
            value={end_date}
            active={activeDateField === "end"}
            onPress={() => openDatePicker("end")}
          />
        </View>



        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          title={mode === "edit" ? "Lưu thay đổi" : "Tạo ngân sách"}
          onPress={() => void handleSave()}
          loading={loading}
        />

        <Pressable
          disabled={loading}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && !loading && styles.pressed,
          ]}
        >
          <Text style={styles.cancelText}>Quay lại</Text>
        </Pressable>
      </AppCard>

      <DatePickerModal
        visible={Boolean(activeDateField)}
        title={activeDateField === "end" ? "Chọn ngày kết thúc" : "Chọn ngày bắt đầu"}
        value={parseDate(activeDateField === "end" ? end_date : start_date)}
        onClose={() => setActiveDateField(null)}
        onConfirm={(date) => {
          if (!activeDateField) return;
          setDateValue(activeDateField, date);
          setActiveDateField(null);
        }}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 60, backgroundColor: COLORS.bg },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  heroCard: { backgroundColor: COLORS.dark, borderRadius: 30, padding: 20, paddingBottom: 28, marginBottom: 18, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -34, top: -42, width: 160, height: 160, borderRadius: 999, backgroundColor: "rgba(37,99,235,0.24)" },
  heroKicker: { color: "#93C5FD", fontSize: 13, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 14 },
  heroTitle: { color: COLORS.white, fontSize: 40, lineHeight: 46, fontWeight: "900", letterSpacing: -1.2, marginBottom: 12 },
  heroSubtitle: { color: "#CBD5E1", fontSize: 16, lineHeight: 25, maxWidth: "88%" },

  previewCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 30, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  previewTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  previewTopContent: { flex: 1, minWidth: 0, paddingRight: 4 },
  previewLabel: { color: COLORS.muted, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  previewAmount: { color: COLORS.text, fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: -1.2, flexShrink: 1, maxWidth: "100%" },
  previewBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft, alignSelf: "flex-start", flexShrink: 0, maxWidth: 116 },
  previewBadgeText: { color: COLORS.blue, fontSize: 12, fontWeight: "900" },
  previewDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  previewStatsRow: { flexDirection: "row", alignItems: "center" },
  previewStatItem: { flex: 1 },
  previewStatDivider: { width: 1, height: 42, backgroundColor: COLORS.border, marginHorizontal: 14 },
  previewStatLabel: { color: COLORS.muted, fontSize: 14, fontWeight: "800", marginBottom: 6 },
  previewStatValue: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  periodNoteBox: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft },
  periodNoteText: { color: COLORS.muted, fontSize: 14, lineHeight: 21, fontWeight: "700" },

  formCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 30, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { color: COLORS.text, fontSize: 22, fontWeight: "900", marginBottom: 5 },
  formSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  amountBox: { padding: 16, borderRadius: 22, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  label: { color: COLORS.text, fontSize: 15, fontWeight: "900", marginBottom: 9 },
  helperText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },

  segment: { flexDirection: "row", padding: 5, borderRadius: 20, backgroundColor: "#F1F5F9", marginBottom: 20 },
  segmentButton: { flex: 1, minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: COLORS.white, shadowColor: COLORS.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  segmentText: { color: COLORS.muted, fontSize: 15, fontWeight: "900" },
  segmentTextActive: { color: COLORS.text },

  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  quickText: { color: COLORS.blue, fontSize: 14, fontWeight: "900" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  dateCard: { flex: 1, minHeight: 92, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 14, justifyContent: "center" },
  dateCardActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  dateCardLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 7 },
  dateCardValue: { color: COLORS.text, fontSize: 17, fontWeight: "900", marginBottom: 5 },
  dateCardHint: { color: COLORS.blue, fontSize: 12, fontWeight: "900" },
  dateHelperText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 },

  error: { color: COLORS.expense, backgroundColor: COLORS.expenseSoft, borderWidth: 1, borderColor: COLORS.expenseBorder, padding: 12, borderRadius: 16, fontSize: 14, lineHeight: 20, fontWeight: "700", marginBottom: 14 },
  cancelButton: { marginTop: 12, height: 52, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  cancelText: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
});