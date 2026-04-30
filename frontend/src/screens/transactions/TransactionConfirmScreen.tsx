import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import { DatePickerModal } from "../../components/DatePickerModal";
import { transactionTypeOptions } from "../../constants/options";
import { COLORS, shadow } from "../../constants/ui";
import { createTransaction, getCategories } from "../../services/transactionApi";
import { useTransactionStore } from "../../store/transactionStore";
import { useAppDataStore } from "../../store/appDataStore";
import { Category, TransactionType } from "../../types/category";
import { OcrResult } from "../../types/ocr";
import { isPositiveAmount } from "../../utils/validators";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { ImageViewerModal } from "../../components/ImageViewerModal";

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
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(value: string) {
  const num = Number(value);
  if (!num) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

function getParsedFields(draftOcr: OcrResult | null) {
  const parsed = draftOcr?.parsed_fields_json ?? draftOcr?.parsed_fields_json;
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

function getValidimage_url(value?: string | null) {
  return value && (value.startsWith("http://") || value.startsWith("https://")) ? value : undefined;
}

function isCategorySelected(items: Category[], id: string) {
  return items.some((item) => item.id === id);
}

function resolvecategory_id(items: Category[], currentId: string, preferredId: string) {
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
  const draftsource_type = useTransactionStore((state) => state.draftsource_type);
  const clearDraft = useTransactionStore((state) => state.clearDraft);

  const parsedFields = getParsedFields(draftOcr);

  const initialAmount =
    draftOcr?.suggested_amount ??
    parsedFields?.suggested_amount ??
    "";

  const rawInitialType =
    draftOcr?.suggested_type ??
    parsedFields?.suggested_type ??
    "expense";

  const initialType: TransactionType = isTransactionType(rawInitialType) ? rawInitialType : "expense";

  const initialDate =
    draftOcr?.suggested_date ??
    parsedFields?.suggested_date ??
    null;

  const initialcategory_id =
    draftOcr?.suggestedcategory_id ??
    parsedFields?.suggestedcategory_id ??
    "";

  const suggestedCategoryText =
    parsedFields?.suggestedCategory ?? parsedFields?.suggested_category ?? parsedFields?.category ?? null;

  const [amount, setAmount] = useState(toAmountString(initialAmount));
  const [type, setType] = useState<TransactionType>(initialType);
  const [category_id, setcategory_id] = useState<string>(
    String(initialcategory_id ?? ""),
  );
  const [merchant_name, setmerchant_name] = useState(
    draftOcr?.merchant_name ?? parsedFields?.merchant_name ?? "",
  );
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [transaction_date, settransaction_date] = useState(toDateInput(initialDate));

  useEffect(() => {
    settransaction_date(toDateInput(initialDate));
  }, [initialDate]);

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

        const found = findCategoryByText(safeList, suggestedCategoryText);
        if (found) {
          setcategory_id(found.id);
          return;
        }

        setcategory_id((prev) => resolvecategory_id(safeList, prev, initialcategory_id));
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
  }, [type, initialcategory_id, suggestedCategoryText]);

  const safeCategories = Array.isArray(categories) ? categories : [];

  const rawPreviewImage = useMemo(() => draftOcr?.image_url ?? draftReceiptPath ?? "", [draftOcr?.image_url, draftReceiptPath]);

  const previewImage = useSignedUrl(rawPreviewImage || null) ?? rawPreviewImage;

  const ocrDate = useMemo(() => toDateInput(initialDate), [initialDate]);
  const displayDate = useMemo(
    () => formatDisplayDate(transaction_date),
    [transaction_date],
  );

  const isExpense = type === "expense";
  const amountColor = isExpense ? COLORS.expense : COLORS.income;
  const amountBg = isExpense ? COLORS.expenseSoft : COLORS.incomeSoft;
  const amountBorder = isExpense ? COLORS.expenseBorder : COLORS.incomeBorder;

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(amount)) {
      setError("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    if (!category_id) {
      setError("Vui lòng chọn danh mục.");
      return;
    }

    if (!transaction_date) {
      setError("Vui lòng chọn ngày giao dịch.");
      return;
    }

    if (!draftsource_type) {
      setError("Thiếu nguồn ảnh giao dịch.");
      Alert.alert("Lỗi", "Thiếu nguồn ảnh giao dịch (camera/gallery).");
      return;
    }

    setSaving(true);

    try {
      await createTransaction({
        amount: Number(amount),
        type,
        category_id: category_id,
        note: note.trim() || undefined,
        transaction_date: transaction_date,
        merchant_name: merchant_name.trim() || undefined,
        image_url: getValidimage_url(rawPreviewImage),
        source: draftsource_type,
      });

      clearDraft();
      void useAppDataStore.getState().refresh();
      navigation.navigate("MainTabs", { screen: "Transactions" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* ── Hero ── */}
      <View style={styles.heroWrap}>
        <View style={styles.heroGlowLeft} />
        <View style={styles.heroGlowRight} />

        <View style={styles.heroContent}>
          <Text style={styles.heroKicker}>XÁC NHẬN GIAO DỊCH</Text>
          <Text style={styles.heroTitle}>Kiểm tra thông tin</Text>
          <Text style={styles.heroSubtitle}>
            OCR đã tự điền thông tin. Hãy xác nhận hoặc chỉnh sửa trước khi lưu.
          </Text>
        </View>

      </View>

      {/* ── Receipt image card ── */}
      {previewImage ? (
        <Pressable
          style={({ pressed }) => [styles.receiptCard, pressed && { opacity: 0.93 }]}
          onPress={() => setShowFullImage(true)}
        >
          <Image
            source={{ uri: previewImage }}
            style={styles.receiptImage}
            resizeMode="cover"
          />
          <View style={styles.receiptOverlay}>
            <View style={styles.receiptLabelWrap}>
              <Text style={styles.receiptLabelTitle}>Hóa đơn đính kèm</Text>
              <Text style={styles.receiptLabelSub}>Nhấn để xem toàn màn hình</Text>
            </View>
          </View>
          <ImageViewerModal
            visible={showFullImage}
            imageUrl={previewImage}
            onClose={() => setShowFullImage(false)}
          />
        </Pressable>
      ) : null}

      {/* ── Amount preview card ── */}
      <View style={[styles.amountCard, { backgroundColor: amountBg, borderColor: amountBorder }]}>
        <Text style={styles.amountCardLabel}>
          {isExpense ? "Chi tiêu" : "Thu nhập"}
        </Text>
        <Text style={[styles.amountCardValue, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {formatAmount(amount)}
        </Text>
        <Text style={styles.amountCardDate}>{displayDate}</Text>
      </View>

      {/* ── Loại giao dịch ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Loại giao dịch</Text>
        <View style={styles.typeSegment}>
          {transactionTypeOptions.map((option) => {
            const active = type === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => { setType(option.value); setcategory_id(""); }}
                style={[styles.typeBtn, active ? styles.typeBtnActive : styles.typeBtnInactive]}
              >
                <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Form card ── */}
      <View style={styles.formCard}>

        {/* Số tiền */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Số tiền</Text>
          <AppInput
            label=""
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            error={amount && !isPositiveAmount(amount) ? "Vui lòng nhập số tiền lớn hơn 0." : undefined}
          />
        </View>

        {/* Ngày giao dịch */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ngày giao dịch</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [styles.dateField, pressed && styles.dateFieldPressed]}
          >
            <View style={styles.dateFieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFieldValue}>{displayDate}</Text>
                {ocrDate && ocrDate !== transaction_date && (
                  <Text style={styles.ocrHint}>
                    Gợi ý: {formatDisplayDate(ocrDate)}
                  </Text>
                )}
              </View>
              <View style={styles.dateEditBtn}>
                <Text style={styles.dateEditBtnText}>Sửa</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Cửa hàng */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cửa hàng / Người nhận</Text>
          <AppInput
            label=""
            value={merchant_name}
            onChangeText={setmerchant_name}
            placeholder="VD: Coopmart, Grab, Shopee..."
          />
        </View>

        {/* Danh mục */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Danh mục</Text>
            {loading && <Text style={styles.loadingHint}>Đang tải...</Text>}
          </View>
          {!loading && safeCategories.length === 0 ? (
            <Text style={styles.emptyHint}>Chưa có danh mục phù hợp.</Text>
          ) : (
            <CategoryPicker
              items={safeCategories}
              selectedId={category_id}
              onSelect={setcategory_id}
            />
          )}
        </View>

        {/* Ghi chú */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <AppInput
            label=""
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú thêm nếu cần"
            multiline
          />
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsWrap}>
        <AppButton
          title={saving ? "Đang lưu..." : "Lưu giao dịch"}
          onPress={() => void handleSave()}
          loading={saving}
        />

        <Pressable
          onPress={() => navigation.goBack()}
          disabled={saving}
          style={({ pressed }) => [
            styles.backBtn,
            (pressed && !saving) && styles.backBtnPressed,
            saving && styles.backBtnDisabled,
          ]}
        >
          <Text style={styles.backBtnText}>Quay lại</Text>
        </Pressable>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        title="Chọn ngày giao dịch"
        value={new Date(transaction_date || Date.now())}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          settransaction_date(date.toISOString().slice(0, 10));
          setShowDatePicker(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingBottom: 40 },

  // Hero
  heroWrap: { marginTop: 12, marginBottom: 20, borderRadius: 32, backgroundColor: COLORS.dark, overflow: "hidden", padding: 24, paddingBottom: 20 },
  heroGlowLeft: { position: "absolute", left: -40, bottom: -40, width: 180, height: 180, borderRadius: 999, backgroundColor: "rgba(37,99,235,0.18)" },
  heroGlowRight: { position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: 999, backgroundColor: "rgba(124,58,237,0.15)" },
  heroContent: { marginBottom: 16 },
  heroKicker: { color: "#93C5FD", fontSize: 11, fontWeight: "900", letterSpacing: 2, marginBottom: 10 },
  heroTitle: { color: COLORS.white, fontSize: 34, fontWeight: "900", letterSpacing: -0.8, marginBottom: 8 },
  heroSubtitle: { color: "#94A3B8", fontSize: 14, lineHeight: 21 },
  // Receipt image card
  receiptCard: { ...shadow, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: "hidden", height: 240 },
  receiptImage: { width: "100%", height: "100%" },
  receiptOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "rgba(10,15,30,0.55)" },
  receiptLabelWrap: { gap: 2 },
  receiptLabelTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, letterSpacing: 0.2 },
  receiptLabelSub: { color: "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 12 },

  // Amount card
  amountCard: { borderRadius: 28, borderWidth: 1.5, padding: 22, marginBottom: 16, ...shadow },
  amountCardLabel: { color: COLORS.muted, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  amountCardValue: { fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginBottom: 6 },
  amountCardDate: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },

  // Type selector
  section: { marginBottom: 14 },
  sectionLabel: { color: COLORS.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  typeSegment: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, borderWidth: 1, alignItems: "center" },
  typeBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  typeBtnInactive: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  typeBtnText: { color: COLORS.muted, fontWeight: "900", fontSize: 15 },
  typeBtnTextActive: { color: COLORS.white },

  // Form card
  formCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { color: COLORS.text, fontWeight: "900", fontSize: 14, marginBottom: 8 },
  fieldLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  loadingHint: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  emptyHint: { color: COLORS.muted, fontSize: 13, paddingVertical: 8, fontWeight: "700" },

  // Date field
  dateField: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#F8FAFC" },
  dateFieldPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  dateFieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateFieldValue: { color: COLORS.text, fontSize: 15, fontWeight: "900", flexShrink: 1, marginRight: 10 },
  ocrHint: { color: COLORS.blue, fontSize: 12, fontWeight: "700", marginTop: 4 },
  dateEditBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft },
  dateEditBtnText: { color: COLORS.blue, fontWeight: "900", fontSize: 12 },

  // Error
  errorBox: { backgroundColor: COLORS.expenseSoft, borderWidth: 1, borderColor: COLORS.expenseBorder, borderRadius: 16, padding: 14 },
  errorText: { color: COLORS.expense, fontWeight: "800", fontSize: 14, lineHeight: 20 },

  // Actions
  actionsWrap: { gap: 10, marginBottom: 16 },
  backBtn: { height: 52, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  backBtnPressed: { opacity: 0.8 },
  backBtnDisabled: { opacity: 0.5 },
  backBtnText: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
});
