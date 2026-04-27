import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import {
  getCategories,
  createTransaction,
} from "../../services/transactionApi";
import { useTransactionStore } from "../../store/transactionStore";
import { useAuthStore } from "../../store/authStore";
import { Category, TransactionType } from "../../types/category";
import { OcrResult } from "../../types/ocr";
import { isPositiveAmount } from "../../utils/validators";

// --- Helper Functions ---
function toAmountString(value: unknown) {
  if (value === null || value === undefined) return "";
  const cleaned = String(value).replace(/[^\d.]/g, "");
  return cleaned;
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

export function TransactionConfirmScreen() {
  const navigation = useNavigation<any>();
  const draftOcr = useTransactionStore((state) => state.draftOcrResult);
  const draftReceiptPath = useTransactionStore(
    (state) => state.draftReceiptPath,
  );
  const draftSourceType = useTransactionStore((state) => state.draftSourceType);
  const clearDraft = useTransactionStore((state) => state.clearDraft);
  const user = useAuthStore((state) => state.user);

  // --- State Initialization ---
  const parsedFields = getParsedFields(draftOcr);

  const initialAmount =
    draftOcr?.suggestedAmount ??
    draftOcr?.suggested_amount ??
    parsedFields?.suggestedAmount ??
    "";

  const initialType = (draftOcr?.suggestedType ??
    draftOcr?.suggested_type ??
    parsedFields?.suggestedType ??
    "expense") as TransactionType;

  const initialDate =
    draftOcr?.suggestedDate ??
    draftOcr?.suggested_date ??
    parsedFields?.suggestedDate ??
    null;

  const initialCategoryId =
    draftOcr?.suggestedCategoryId ?? draftOcr?.suggested_category_id ?? "";

  const suggestedCategoryText =
    parsedFields?.suggestedCategory ?? parsedFields?.category ?? null;

  const [amount, setAmount] = useState(toAmountString(initialAmount));
  const [type, setType] = useState<TransactionType>(
    initialType === "income" ? "income" : "expense",
  );
  const [transactionDate, setTransactionDate] = useState(
    toDateInput(initialDate),
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [merchantName, setMerchantName] = useState(
    draftOcr?.merchantName ??
      draftOcr?.merchant_name ??
      parsedFields?.merchantName ??
      "",
  );
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getCategories(type);
      const safeList = Array.isArray(list) ? list : [];
      setCategories(safeList);

      if (categoryId) return;

      if (suggestedCategoryText) {
        const normalizedSuggested = normalizeText(
          String(suggestedCategoryText),
        );
        const found = safeList.find(
          (item) =>
            normalizeText(item.name) === normalizedSuggested ||
            normalizeText(item.name).includes(normalizedSuggested) ||
            normalizedSuggested.includes(normalizeText(item.name)),
        );

        if (found) {
          setCategoryId(found.id);
          return;
        }
      }

      if (safeList.length) {
        setCategoryId(safeList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh mục.");
    } finally {
      setLoading(false);
    }
  }, [type, categoryId, suggestedCategoryText]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const previewImage = useMemo(
    () => draftOcr?.imageUrl ?? draftReceiptPath ?? "",
    [draftOcr?.imageUrl, draftReceiptPath],
  );

  const validImageUrl = useMemo(() => {
    if (
      previewImage &&
      (previewImage.startsWith("http://") ||
        previewImage.startsWith("https://"))
    ) {
      return previewImage;
    }
    return undefined;
  }, [previewImage]);

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(amount)) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }
    if (!categoryId) {
      setError("Danh mục là bắt buộc.");
      return;
    }
    if (!transactionDate) {
      setError("Ngày giao dịch là bắt buộc.");
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
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Xác nhận giao dịch</Text>
        <Text style={styles.subtitle}>Kiểm tra dữ liệu OCR trước khi lưu.</Text>

        <View style={styles.typeRow}>
          <AppButton
            title="Chi phí"
            variant={type === "expense" ? "primary" : "secondary"}
            onPress={() => setType("expense")}
            style={styles.typeButton}
          />
          <AppButton
            title="Thu nhập"
            variant={type === "income" ? "primary" : "secondary"}
            onPress={() => setType("income")}
            style={styles.typeButton}
          />
        </View>

        <AppInput
          label="Số tiền"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
        />
        <AppInput
          label="Ngày giao dịch"
          value={transactionDate}
          onChangeText={setTransactionDate}
          placeholder="YYYY-MM-DD"
        />
        <AppInput
          label="Cửa hàng/Merchant"
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="Tên cửa hàng"
        />

        <Text style={styles.label}>Danh mục</Text>
        <CategoryPicker
          items={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          loading={loading}
        />

        <AppInput
          label="Ghi chú"
          value={note}
          onChangeText={setNote}
          placeholder="Ghi chú thêm (không bắt buộc)"
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          title="Lưu giao dịch"
          onPress={() => void handleSave()}
          loading={saving}
        />

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Dữ liệu OCR gốc</Text>
          <Text style={styles.summaryText} numberOfLines={1}>
            Ảnh: {previewImage || "-"}
          </Text>
          <Text style={styles.summaryText}>Loại gợi ý: {initialType}</Text>
          <Text style={styles.summaryText}>
            Danh mục gợi ý: {suggestedCategoryText || "-"}
          </Text>
          <Text style={styles.summaryText}>
            Nội dung: {draftOcr?.extractedText || "-"}
          </Text>
        </View>
      </AppCard>
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
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 4,
  },
  summaryTitle: {
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  summaryText: {
    color: "#475569",
    fontSize: 13,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  typeButton: {
    flex: 1,
  },
  label: {
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  error: {
    color: "#b91c1c",
    marginTop: 8,
    marginBottom: 12,
    textAlign: "center",
  },
});
