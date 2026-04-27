import React, { useEffect, useMemo, useState } from "react";
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
import { isPositiveAmount, validateBudgetPeriod } from "../../utils/validators";

export function TransactionConfirmScreen() {
  const navigation = useNavigation<any>();
  const draftOcr = useTransactionStore((state) => state.draftOcrResult);
  const draftReceiptPath = useTransactionStore(
    (state) => state.draftReceiptPath,
  );
  const draftSourceType = useTransactionStore((state) => state.draftSourceType);
  const clearDraft = useTransactionStore((state) => state.clearDraft);
  const user = useAuthStore((state) => state.user);

  const initialType = "expense" as TransactionType;
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(String(draftOcr?.total_amount ?? ""));
  const [categoryId, setCategoryId] = useState(
    draftOcr?.suggested_category_id ?? "",
  );
  const [note, setNote] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    draftOcr?.transaction_date ?? new Date().toISOString().slice(0, 10),
  );
  const [merchantName, setMerchantName] = useState(
    draftOcr?.merchant_name ?? "",
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getCategories(type);
        setCategories(list);
        const safeList = Array.isArray(list) ? list : [];

        if (!categoryId && safeList.length) {
          setCategoryId(safeList[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không thể tải danh mục.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, [type]);

  const previewImage = useMemo(
    () => draftOcr?.image_url ?? draftReceiptPath ?? "",
    [draftOcr?.image_url, draftReceiptPath],
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
      return;
    }

    setSaving(true);
    try {
      await createTransaction({
        amount: Number(amount),
        type,
        category_id: categoryId,
        note: note.trim() || undefined,
        transaction_date: transactionDate,
        merchant_name: merchantName.trim() || undefined,
        image_url: validImageUrl,
        source: draftSourceType,
      });
      clearDraft();
      Alert.alert("Đã lưu", "Giao dịch đã được lưu thành công.");
      navigation.navigate("MainTabs");
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
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            Amount gợi ý: {draftOcr?.total_amount ?? "-"}
          </Text>
          <Text style={styles.summaryText}>
            Date gợi ý: {draftOcr?.transaction_date ?? "-"}
          </Text>
          <Text style={styles.summaryText}>
            Category gợi ý: {draftOcr?.suggested_category_id ?? "-"}
          </Text>
          <Text style={styles.summaryText}>
            Merchant: {draftOcr?.merchant_name ?? "-"}
          </Text>
          <Text style={styles.summaryText}>Image: {validImageUrl || "-"}</Text>
        </View>

        <View style={styles.typeRow}>
          <AppButton
            title="Expense"
            variant={type === "expense" ? "primary" : "secondary"}
            onPress={() => setType("expense")}
            style={styles.typeButton}
          />
          <AppButton
            title="Income"
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
          label="Merchant"
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="Tên cửa hàng"
        />
        <AppInput
          label="Ghi chú"
          value={note}
          onChangeText={setNote}
          placeholder="Ghi chú thêm"
          multiline
        />

        <Text style={styles.label}>Danh mục</Text>
        <CategoryPicker
          items={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          title="Lưu giao dịch"
          onPress={() => void handleSave()}
          loading={saving}
        />
        {loading ? (
          <Text style={styles.muted}>Đang tải danh mục...</Text>
        ) : null}
        {!user ? (
          <Text style={styles.muted}>Chưa có dữ liệu người dùng.</Text>
        ) : null}
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
    marginBottom: 14,
    gap: 4,
  },
  summaryText: {
    color: "#334155",
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
  },
  error: {
    color: "#b91c1c",
    marginTop: 8,
    marginBottom: 12,
  },
  muted: {
    color: "#64748b",
    marginTop: 10,
  },
});
