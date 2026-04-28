import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import { transactionTypeOptions } from "../../constants/options";
import { COLORS, shadow } from "../../constants/ui";
import { createTransaction, getCategories } from "../../services/transactionApi";
import { useTransactionStore } from "../../store/transactionStore";
import { Category, TransactionType } from "../../types/category";
import { OcrResult } from "../../types/ocr";
import { isPositiveAmount } from "../../utils/validators";

function toAmountString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d.]/g, "");
}

function toDateInput(value: unknown) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Chưa chọn";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getParsedFields(draftOcr: OcrResult | null) {
  const parsed = draftOcr?.parsedFieldsJson ?? draftOcr?.parsed_fields_json;
  if (!parsed) return {};
  if (typeof parsed === "string") {
    try {
      return JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  return parsed;
}

function normalizeText(value: string) {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

function pickDraftValue<T>(...values: Array<T | null | undefined>) {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function getValidImageUrl(value?: string | null) {
  return value && (value.startsWith("http://") || value.startsWith("https://")) ? value : undefined;
}

function isCategorySelected(items: Category[], id: string) {
  return items.some((item) => item.id === id);
}

function resolveCategoryId(items: Category[], currentId: string, preferredId: string) {
  if (isCategorySelected(items, currentId)) return currentId;
  if (isCategorySelected(items, preferredId)) return preferredId;
  return items[0]?.id ?? "";
}

function findCategoryByText(categories: Category[], text?: string | null) {
  if (!text) return undefined;
  const normalizedText = normalizeText(text);
  return categories.find((item) => {
    const name = normalizeText(item.name ?? "");
    return name && (normalizedText.includes(name) || name.includes(normalizedText));
  });
}

export function TransactionConfirmScreen() {
  const navigation = useNavigation<any>();

  const draftOcr = useTransactionStore((state) => state.draftOcrResult);
  const draftReceiptPath = useTransactionStore((state) => state.draftReceiptPath);
  const draftSourceType = useTransactionStore((state) => state.draftSourceType);
  const clearDraft = useTransactionStore((state) => state.clearDraft);

  // State initialization
  const parsedFields = getParsedFields(draftOcr);

  const initialAmount =
    draftOcr?.suggestedAmount ??
    draftOcr?.suggested_amount ??
    parsedFields?.suggestedAmount ??
    parsedFields?.suggested_amount ??
    draftOcr?.total_amount ??
    "";

  const rawInitialType =
    draftOcr?.suggestedType ??
    draftOcr?.suggested_type ??
    parsedFields?.suggestedType ??
    parsedFields?.suggested_type ??
    "expense";

  const initialType: TransactionType = isTransactionType(rawInitialType) ? rawInitialType : "expense";

  const initialDate =
    draftOcr?.suggestedDate ??
    draftOcr?.suggested_date ??
    parsedFields?.suggestedDate ??
    parsedFields?.suggested_date ??
    draftOcr?.transaction_date ??
    null;

  const initialCategoryId =
    draftOcr?.suggestedCategoryId ??
    draftOcr?.suggested_category_id ??
    parsedFields?.suggestedCategoryId ??
    parsedFields?.suggested_category_id ??
    "";

  const suggestedCategoryText =
    parsedFields?.suggestedCategory ?? parsedFields?.suggested_category ?? parsedFields?.category ?? null;

  const [amount, setAmount] = useState(toAmountString(initialAmount));
  const [type, setType] = useState<TransactionType>(initialType);
  const [transactionDate, setTransactionDate] = useState(toDateInput(initialDate));
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [merchantName, setMerchantName] = useState(
    draftOcr?.merchantName ?? draftOcr?.merchant_name ?? parsedFields?.merchantName ?? parsedFields?.merchant_name ?? "",
  );
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setLoading(true);
      setError("");

      try {
        const list = await getCategories(type);
        const safeList = Array.isArray(list) ? list : [];

        if (!active) return;

        setCategories(safeList);

        // Prefer suggested category text if it matches
        const found = findCategoryByText(safeList, suggestedCategoryText);
        if (found) {
          setCategoryId(found.id);
          return;
        }

        setCategoryId((prev) => resolveCategoryId(safeList, prev, initialCategoryId));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không thể tải danh mục.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, [type, initialCategoryId, suggestedCategoryText]);

  const safeCategories = Array.isArray(categories) ? categories : [];

  const previewImage = useMemo(() => draftOcr?.imageUrl ?? draftOcr?.image_url ?? draftReceiptPath ?? "", [draftOcr?.imageUrl, draftOcr?.image_url, draftReceiptPath]);

  const validImageUrl = useMemo(() => (getValidImageUrl(previewImage) ? previewImage : undefined), [previewImage]);

  const dateHint = useMemo(() => `Định dạng: năm-tháng-ngày · ${formatDisplayDate(transactionDate)}`, [transactionDate]);

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(amount)) {
      setError("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    if (!categoryId) {
      setError("Vui lòng chọn danh mục.");
      return;
    }

    if (!transactionDate) {
      setError("Vui lòng chọn ngày giao dịch.");
      return;
    }

    if (!draftSourceType) {
      setError("Thiếu nguồn ảnh giao dịch.");
      Alert.alert("Lỗi", "Thiếu nguồn ảnh giao dịch (camera/gallery).");
      return;
    }

    setSaving(true);

    try {
      await createTransaction({
        amount: Number(amount),
        type,
        categoryId,
        note: note.trim() || undefined,
        transactionDate,
        merchantName: merchantName.trim() || undefined,
        imageUrl: validImageUrl,
        source: draftSourceType,
      });

      clearDraft();
      Alert.alert("Đã lưu", "Giao dịch đã được lưu thành công.");
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      <View style={styles.heroWrap}>
        <View style={styles.heroGlow} />

        <Text style={styles.heroKicker}>Giao dịch</Text>
        <Text style={styles.heroTitle}>Xác nhận giao dịch</Text>
        <Text style={styles.heroSubtitle}>Thông tin đã được OCR tự điền, bạn có thể chỉnh sửa trước khi lưu.</Text>
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.title}>Điền thông tin giao dịch</Text>
        <Text style={styles.subtitle}>Kiểm tra lại trước khi lưu.</Text>

        {previewImage ? (
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>Đã đính kèm ảnh hóa đơn</Text>
          </View>
        ) : null}

        <View style={styles.typeRow}>
          {transactionTypeOptions.map((option) => (
            <AppButton key={option.value} title={option.label} variant={type === option.value ? "primary" : "secondary"} onPress={() => { setType(option.value); setCategoryId(""); }} style={styles.typeButton} />
          ))}
        </View>

        <AppInput label="Số tiền" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" error={amount && !isPositiveAmount(amount) ? "Vui lòng nhập số tiền lớn hơn 0." : undefined} />

        <AppInput label="Ngày giao dịch" value={transactionDate} onChangeText={setTransactionDate} placeholder="YYYY-MM-DD" helperText={dateHint} />

        <View style={styles.inlineActions}>
          <AppButton title="Hôm nay" variant="ghost" onPress={() => setTransactionDate(new Date().toISOString().slice(0, 10))} style={styles.inlineButton} />
        </View>

        <AppInput label="Cửa hàng / Người nhận" value={merchantName} onChangeText={setMerchantName} placeholder="VD: Coopmart, Grab, Shopee..." />

        <Text style={styles.label}>Danh mục</Text>

        <CategoryPicker items={safeCategories} selectedId={categoryId} onSelect={setCategoryId} loading={loading} />

        <AppInput label="Ghi chú" value={note} onChangeText={setNote} placeholder="Ghi chú thêm nếu cần" multiline />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionColumn}>
          <AppButton title="Lưu giao dịch" onPress={() => void handleSave()} loading={saving} />

          <Text style={styles.actionSpacer} />

          <AppButton title="Quay lại" variant="ghost" onPress={() => navigation.goBack()} disabled={saving} />
        </View>

        {loading ? <Text style={styles.muted}>Đang tải danh mục...</Text> : null}

        {!loading && safeCategories.length === 0 ? <Text style={styles.muted}>Chưa có danh mục phù hợp.</Text> : null}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 16, paddingBottom: 30, backgroundColor: COLORS.bg },
  heroWrap: { marginBottom: 14, borderRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, backgroundColor: COLORS.dark, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -24, top: -30, width: 140, height: 140, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.20)" },
  heroKicker: { color: "#93C5FD", fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  heroTitle: { color: COLORS.white, fontSize: 30, lineHeight: 36, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  heroSubtitle: { color: "#CBD5E1", fontSize: 14, lineHeight: 21, textAlign: "center" },
  card: { ...shadow, width: "100%", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginBottom: 4, textAlign: "center" },
  subtitle: { color: COLORS.muted, marginBottom: 14, lineHeight: 20, textAlign: "center" },
  badgeRow: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.incomeSoft, marginBottom: 14 },
  badgeText: { color: COLORS.income, fontWeight: "700", fontSize: 13 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeButton: { flex: 1 },
  label: { color: COLORS.text, fontWeight: "600", marginBottom: 6 },
  inlineActions: { flexDirection: "row", marginBottom: 14 },
  inlineButton: { minHeight: 42, paddingHorizontal: 14 },
  actionColumn: { marginTop: 4 },
  actionSpacer: { height: 10 },
  error: { color: COLORS.expense, marginTop: 8, marginBottom: 12, backgroundColor: COLORS.expenseSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  muted: { color: COLORS.muted, marginTop: 10, textAlign: "center" },
});
