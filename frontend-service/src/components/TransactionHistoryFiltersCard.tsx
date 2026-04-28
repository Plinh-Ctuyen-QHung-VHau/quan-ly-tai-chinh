import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppCard } from "./AppCard";
import { CategoryPicker } from "./CategoryPicker";
import { DatePickerModal } from "./DatePickerModal";
import { SectionHeader } from "./SectionHeader";
import { SegmentedChips } from "./SegmentedChips";
import { transactionTypeOptions } from "../constants/options";
import { Category, TransactionType } from "../types/category";
import { COLORS } from "../constants/ui";

type DateField = "from" | "to";
type RangePreset = "today" | "7days" | "month" | "custom";

type Props = Readonly<{
  type: TransactionType;
  setType: (type: TransactionType) => void;
  category_id: string;
  setcategory_id: (value: string) => void;
  categories: Category[];
  fromDate: string;
  toDate: string;
  rangePreset: RangePreset;
  showIosPicker: DateField | null;
  onApplyPreset: (preset: RangePreset) => void;
  onClearDates: () => void;
  onCloseDatePicker: () => void;
  onOpenDatePicker: (field: DateField) => void;
  onConfirmDate: (field: DateField, date: Date) => void;
  limit: string;
  setLimit: (value: string) => void;
  page: number;
  totalPages: number;
  loading: boolean;
  onLoadTransactions: () => void;
  onClearFilters: () => void;
  onSetPage: (value: number) => void;
}>;

function DateBox({ label, value, active, onPress }: Readonly<{ label: string; value: string; active: boolean; onPress: () => void }>) {
  return (
    <Pressable onPress={onPress} style={[styles.dateBox, active && styles.dateBoxActive]}>
      <Text style={styles.dateBoxLabel}>{label}</Text>
      <Text style={value ? styles.dateBoxValue : styles.dateBoxPlaceholder}>{value || "Chọn ngày"}</Text>
    </Pressable>
  );
}

const PRESET_CHIPS: [RangePreset, string][] = [
  ["today", "Hôm nay"],
  ["7days", "7 ngày"],
  ["month", "Tháng này"],
];

export function TransactionHistoryFiltersCard({
  type,
  setType,
  category_id,
  setcategory_id,
  categories,
  fromDate,
  toDate,
  rangePreset,
  showIosPicker,
  onApplyPreset,
  onClearDates,
  onCloseDatePicker,
  onOpenDatePicker,
  onConfirmDate,
  limit: _limit,
  setLimit: _setLimit,
  page: _page,
  totalPages: _totalPages,
  loading: _loading,
  onLoadTransactions: _onLoadTransactions,
  onClearFilters,
  onSetPage,
}: Props) {
  const hasActiveFilters = Boolean(
    fromDate || toDate || category_id || rangePreset !== "custom"
  );

  return (
    <AppCard style={styles.filterCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.sectionTitle}>Bộ lọc</Text>
          <Text style={styles.sectionSubtitle}>Chọn để lọc ngay, bấm lại để bỏ lọc</Text>
        </View>
        {hasActiveFilters && (
          <Pressable
            onPress={onClearFilters}
            style={({ pressed }) => [styles.clearAllBtn, pressed && styles.clearAllBtnPressed]}
          >
            <Text style={styles.clearAllText}>✕ Xóa lọc</Text>
          </Pressable>
        )}
      </View>

      {/* Loại giao dịch */}
      <Text style={styles.label}>Loại giao dịch</Text>
      <SegmentedChips
        options={transactionTypeOptions}
        value={type}
        onChange={(nextType) => {
          setType(nextType as TransactionType);
          setcategory_id("");
          onSetPage(1);
        }}
      />

      {/* Danh mục */}
      <Text style={styles.label}>Danh mục</Text>
      <CategoryPicker
        items={categories}
        selectedId={category_id}
        onSelect={(id) => {
          // Toggle: nếu bấm lại cùng category thì bỏ lọc
          setcategory_id(id === category_id ? "" : id);
        }}
      />

      {/* Khoảng thời gian */}
      <View style={styles.rangeHeader}>
        <Text style={styles.label}>Khoảng thời gian</Text>
        {(fromDate || toDate) && (
          <Pressable onPress={onClearDates}>
            <Text style={styles.clearDateText}>Xóa ngày</Text>
          </Pressable>
        )}
      </View>

      {/* Preset chips — bấm lại sẽ bỏ lọc */}
      <View style={styles.presetRow}>
        {PRESET_CHIPS.map(([preset, label]) => {
          const active = rangePreset === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => active ? onClearDates() : onApplyPreset(preset)}
              style={({ pressed }) => [
                styles.presetChip,
                active && styles.presetChipActive,
                pressed && styles.presetChipPressed,
              ]}
            >
              {active && <Text style={styles.presetCheckmark}>✓ </Text>}
              <Text style={[styles.presetText, active && styles.presetTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Date boxes */}
      <View style={styles.dateRow}>
        <DateBox
          label="Từ ngày"
          value={fromDate}
          active={showIosPicker === "from"}
          onPress={() => onOpenDatePicker("from")}
        />
        <DateBox
          label="Đến ngày"
          value={toDate}
          active={showIosPicker === "to"}
          onPress={() => onOpenDatePicker("to")}
        />
      </View>



      <DatePickerModal
        visible={Boolean(showIosPicker)}
        title={showIosPicker === "to" ? "Chọn ngày kết thúc" : "Chọn ngày bắt đầu"}
        value={
          new Date(
            showIosPicker === "to"
              ? toDate || Date.now()
              : fromDate || Date.now(),
          )
        }
        onClose={onCloseDatePicker}
        onConfirm={(date) => {
          if (!showIosPicker) return;
          onConfirmDate(showIosPicker, date);
          onCloseDatePicker();
        }}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  filterCard: { borderRadius: 28, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 18, marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  sectionTitle: { color: "#0F172A", fontSize: 19, fontWeight: "900" },
  sectionSubtitle: { color: "#64748B", fontSize: 13, marginTop: 2 },
  clearAllBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.expenseSoft, borderWidth: 1, borderColor: COLORS.expenseBorder },
  clearAllBtnPressed: { opacity: 0.75 },
  clearAllText: { color: COLORS.expense, fontWeight: "800", fontSize: 12 },
  label: { color: "#0F172A", fontWeight: "900", fontSize: 14, marginBottom: 8 },
  rangeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  clearDateText: { color: COLORS.blue, fontWeight: "800", fontSize: 13 },
  presetRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 12 },
  presetChip: { flex: 1, minHeight: 40, borderRadius: 999, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  presetChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  presetChipPressed: { opacity: 0.75 },
  presetCheckmark: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  presetText: { color: "#334155", fontWeight: "800", fontSize: 13 },
  presetTextActive: { color: "#FFFFFF" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  dateBox: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 12, backgroundColor: "#FFFFFF" },
  dateBoxActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  dateBoxLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 5 },
  dateBoxValue: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  dateBoxPlaceholder: { color: "#94A3B8", fontSize: 14, fontWeight: "700" },
});

export default TransactionHistoryFiltersCard;
