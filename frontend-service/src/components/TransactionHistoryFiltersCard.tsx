import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { AppButton } from "./AppButton";
import { AppCard } from "./AppCard";
import { AppInput } from "./AppInput";
import { CategoryPicker } from "./CategoryPicker";
import { SectionHeader } from "./SectionHeader";
import { SegmentedChips } from "./SegmentedChips";
import { transactionTypeOptions } from "../constants/options";
import { Category, TransactionType } from "../types/category";

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
  onCloseIosPicker: () => void;
  onOpenDatePicker: (field: DateField) => void;
  onIosDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
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
  onCloseIosPicker,
  onOpenDatePicker,
  onIosDateChange,
  limit,
  setLimit,
  page,
  totalPages,
  loading,
  onLoadTransactions,
  onClearFilters,
  onSetPage,
}: Props) {
  return (
    <AppCard style={styles.filterCard}>
      <SectionHeader title="Bộ lọc giao dịch" subtitle="Chọn điều kiện để xem đúng dữ liệu cần tìm" />

      <Text style={styles.label}>Loại giao dịch</Text>
      <SegmentedChips options={transactionTypeOptions} value={type} onChange={(nextType) => { setType(nextType as TransactionType); setcategory_id(""); onSetPage(1); }} />

      <Text style={styles.label}>Danh mục</Text>
      <CategoryPicker items={categories} selectedId={category_id} onSelect={setcategory_id} />

      <View style={styles.rangeHeader}>
        <Text style={styles.label}>Khoảng thời gian</Text>
        <Pressable onPress={onClearDates}><Text style={styles.clearDateText}>Xóa ngày</Text></Pressable>
      </View>

      <View style={styles.presetRow}>
        {([
          ["today", "Hôm nay"],
          ["7days", "7 ngày"],
          ["month", "Tháng này"],
        ] as const).map(([preset, label]) => (
          <Pressable key={preset} onPress={() => onApplyPreset(preset)} style={[styles.presetChip, rangePreset === preset && styles.presetChipActive]}>
            <Text style={[styles.presetText, rangePreset === preset && styles.presetTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.dateRow}>
        <DateBox label="Từ ngày" value={fromDate} active={showIosPicker === "from"} onPress={() => onOpenDatePicker("from")} />
        <DateBox label="Đến ngày" value={toDate} active={showIosPicker === "to"} onPress={() => onOpenDatePicker("to")} />
      </View>

      {Platform.OS === "ios" && showIosPicker ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker value={new Date(showIosPicker === "from" ? fromDate || Date.now() : toDate || Date.now())} mode="date" display="spinner" onChange={onIosDateChange} />
          <Pressable onPress={onCloseIosPicker} style={styles.doneButton}><Text style={styles.doneButtonText}>Xong</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.limitRow}>
        <View style={styles.limitInputWrap}>
          <AppInput label="Số mục mỗi trang" value={limit} onChangeText={setLimit} keyboardType="numeric" placeholder="10" />
        </View>

        <View style={styles.pageInfoBox}>
          <Text style={styles.pageInfoLabel}>Trang</Text>
          <Text style={styles.pageInfoValue}>{page}/{totalPages}</Text>
        </View>
      </View>

      <View style={styles.filterActions}>
        <AppButton title="Áp dụng bộ lọc" onPress={onLoadTransactions} loading={loading} />
        <AppButton title="Xóa lọc" variant="ghost" onPress={onClearFilters} disabled={loading} style={styles.clearButton} />
      </View>

      <View style={styles.paginationRow}>
        <AppButton title="Trước" variant="secondary" onPress={() => onSetPage(Math.max(1, page - 1))} style={styles.pageButton} disabled={page <= 1} />
        <AppButton title="Sau" variant="secondary" onPress={() => onSetPage(page + 1)} style={styles.pageButton} disabled={page >= totalPages} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  filterCard: { borderRadius: 28, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 18, marginBottom: 16 },
  cardHeader: { marginBottom: 16 },
  sectionTitle: { color: "#0F172A", fontSize: 21, fontWeight: "900" },
  sectionSubtitle: { color: "#64748B", fontSize: 14, lineHeight: 20, marginTop: 4 },
  label: { color: "#0F172A", fontWeight: "900", fontSize: 15, marginBottom: 8 },
  segment: { flexDirection: "row", padding: 4, borderRadius: 18, backgroundColor: "#F1F5F9", marginBottom: 18 },
  segmentButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: "#0F172A" },
  segmentText: { color: "#64748B", fontSize: 15, fontWeight: "900" },
  segmentTextActive: { color: "#FFFFFF" },
  rangeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  clearDateText: { color: "#2563EB", fontWeight: "800" },
  presetRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 12 },
  presetChip: { flex: 1, minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  presetChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  presetText: { color: "#334155", fontWeight: "800", fontSize: 13 },
  presetTextActive: { color: "#FFFFFF" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  dateBox: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 12, backgroundColor: "#FFFFFF" },
  dateBoxActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  dateBoxLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 5 },
  dateBoxValue: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  dateBoxPlaceholder: { color: "#94A3B8", fontSize: 15, fontWeight: "700" },
  pickerWrap: { marginBottom: 12, padding: 12, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  doneButton: { marginTop: 10, minHeight: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" },
  doneButtonText: { color: "#FFFFFF", fontWeight: "900" },
  limitRow: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginTop: 6 },
  limitInputWrap: { flex: 1 },
  pageInfoBox: { width: 96, padding: 12, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  pageInfoLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 5 },
  pageInfoValue: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  filterActions: { marginTop: 14 },
  clearButton: { marginTop: 10 },
  paginationRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pageButton: { flex: 1 },
});

export default TransactionHistoryFiltersCard;
