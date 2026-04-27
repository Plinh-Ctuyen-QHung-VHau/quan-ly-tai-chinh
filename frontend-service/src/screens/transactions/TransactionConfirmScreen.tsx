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
import { Category, TransactionType } from "../../types/category";
import { isPositiveAmount } from "../../utils/validators";

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Chi tiêu",
  income: "Thu nhập",
};

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionConfirmScreen() {
  const navigation = useNavigation<any>();
  const draftOcr = useTransactionStore((state) => state.draftOcrResult);
  const draftReceiptPath = useTransactionStore(
    (state) => state.draftReceiptPath,
  );
  const draftSourceType = useTransactionStore((state) => state.draftSourceType);
  const clearDraft = useTransactionStore((state) => state.clearDraft);

  const initialType = "expense" as TransactionType;
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(String(draftOcr?.total_amount ?? ""));
  const [categoryId, setCategoryId] = useState(draftOcr?.suggested_category_id ?? "");
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
        const safeList = Array.isArray(list) ? list : [];
        setCategories(safeList);

        if (safeList.length > 0 && (!categoryId || !safeList.some((item) => item.id === categoryId))) {
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
      <AppCard style={styles.card}>
        <Text style={styles.title}>Xác nhận giao dịch</Text>
        <Text style={styles.subtitle}>
          Thông tin đã được OCR tự điền, bạn có thể chỉnh sửa trước khi lưu.
        </Text>

        {validImageUrl ? (
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>Đã đính kèm ảnh hóa đơn</Text>
          </View>
        ) : null}

        <View style={styles.typeRow}>
          <AppButton
            title={TYPE_LABELS.expense}
            variant={type === "expense" ? "primary" : "secondary"}
            onPress={() => setType("expense")}
            style={styles.typeButton}
          />
          <AppButton
            title={TYPE_LABELS.income}
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
          helperText="Định dạng: năm-tháng-ngày"
        />
        <View style={styles.inlineActions}>
          <AppButton
            title="Hôm nay"
            variant="ghost"
            onPress={() => setTransactionDate(getTodayString())}
            style={styles.inlineButton}
          />
        </View>
        <AppInput
          label="Cửa hàng / Người nhận"
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="VD: Coopmart, Grab, Shopee..."
        />
        <AppInput
          label="Ghi chú"
          value={note}
          onChangeText={setNote}
          placeholder="Ghi chú thêm nếu cần"
          multiline
        />

        <Text style={styles.label}>Danh mục</Text>
        <CategoryPicker
          items={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actionColumn}>
          <AppButton
            title="Lưu giao dịch"
            onPress={() => void handleSave()}
            loading={saving}
          />
          <Text style={styles.actionSpacer} />
          <AppButton
            title="Quay lại"
            variant="ghost"
            onPress={() => navigation.goBack()}
            disabled={saving}
          />
        </View>
        {loading ? (
          <Text style={styles.muted}>Đang tải danh mục...</Text>
        ) : null}
        {!loading && categories.length === 0 ? (
          <Text style={styles.muted}>Chưa có danh mục phù hợp.</Text>
        ) : null}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    borderRadius: 22,
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#475569",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 21,
  },
  badgeRow: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e7f8ef",
    marginBottom: 14,
  },
  badgeText: {
    color: "#166534",
    fontWeight: "700",
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
  inlineActions: {
    flexDirection: "row",
    marginBottom: 14,
  },
  inlineButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },
  actionColumn: {
    marginTop: 4,
  },
  actionSpacer: {
    height: 10,
  },
  error: {
    color: "#b91c1c",
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  muted: {
    color: "#64748b",
    marginTop: 10,
    textAlign: "center",
  },
});
