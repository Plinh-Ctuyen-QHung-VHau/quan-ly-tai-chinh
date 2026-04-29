import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import { DatePickerModal } from "../../components/DatePickerModal";
import { LoadingView } from "../../components/LoadingView";
import { COLORS, shadow } from "../../constants/ui";
import { getCategories, getTransactionById, updateTransaction } from "../../services/transactionApi";
import { Category, TransactionType } from "../../types/category";
import { Transaction } from "../../types/transaction";
import { isPositiveAmount } from "../../utils/validators";

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

export function TransactionEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transaction_id = route.params?.transaction_id as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category_id, setcategory_id] = useState("");
  const [note, setNote] = useState("");
  const [transaction_date, settransaction_date] = useState("");
  const [merchant_name, setmerchant_name] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadTransaction = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionById(transaction_id);
      setTransaction(result);
      setType(result.type);
      setAmount(String(result.amount));
      setcategory_id(result.category_id);
      setNote(result.note ?? "");
      settransaction_date(result.transaction_date.slice(0, 10)); // Ensure YYYY-MM-DD
      setmerchant_name(result.merchant_name ?? "");
    } finally {
      setLoading(false);
    }
  }, [transaction_id]);

  useFocusEffect(
    useCallback(() => {
      void loadTransaction();
    }, [loadTransaction]),
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const list = await getCategories(type);
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, [type]);

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(amount)) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }

    if (!category_id) {
      setError("Danh mục là bắt buộc.");
      return;
    }

    if (!transaction_date) {
      setError("Ngày giao dịch là bắt buộc.");
      return;
    }

    setSaving(true);
    try {
      await updateTransaction(transaction_id, {
        amount: Number(amount),
        type,
        categoryId: category_id,
        note: note.trim() || undefined,
        transactionDate: transaction_date,
        merchantName: merchant_name.trim() || undefined,
      });
      Alert.alert("Đã cập nhật", "Giao dịch đã được sửa thành công.");
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView label="Đang tải giao dịch..." />;
  }

  const isExpense = type === "expense";
  const amountColor = isExpense ? COLORS.expense : COLORS.income;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* ── Header Area ── */}
      <View style={styles.header}>
        <Text style={styles.screenKicker}>CHỈNH SỬA</Text>
        <Text style={styles.screenTitle}>Cập nhật thông tin</Text>
      </View>

      <View style={styles.formCard}>
        {/* Loại giao dịch */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Loại giao dịch</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setType("expense")}
              style={[styles.typeBtn, type === "expense" ? styles.typeBtnActive : styles.typeBtnInactive]}
            >
              <Text style={[styles.typeBtnText, type === "expense" && styles.typeBtnTextActive]}>Chi tiêu</Text>
            </Pressable>
            <Pressable
              onPress={() => setType("income")}
              style={[styles.typeBtn, type === "income" ? styles.typeBtnActive : styles.typeBtnInactive]}
            >
              <Text style={[styles.typeBtnText, type === "income" && styles.typeBtnTextActive]}>Thu nhập</Text>
            </Pressable>
          </View>
        </View>

        {/* Số tiền */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Số tiền</Text>
          <AppInput
            label=""
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
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
              <Text style={styles.dateFieldValue}>{formatDisplayDate(transaction_date)}</Text>
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

        {/* Ghi chú */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <AppInput
            label=""
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Ghi chú thêm nếu cần"
          />
        </View>

        {/* Danh mục */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Danh mục</Text>
          <CategoryPicker
            items={categories}
            selectedId={category_id}
            onSelect={setcategory_id}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionsWrap}>
          <AppButton
            title={saving ? "Đang lưu..." : "Lưu thay đổi"}
            onPress={() => void handleSave()}
            loading={saving}
          />
        </View>
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
  
  header: { marginTop: 24, marginBottom: 20 },
  screenKicker: { color: COLORS.blue, fontSize: 11, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  screenTitle: { color: COLORS.text, fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },

  formCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { color: COLORS.text, fontWeight: "900", fontSize: 14, marginBottom: 8 },

  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, borderWidth: 1, alignItems: "center" },
  typeBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  typeBtnInactive: { backgroundColor: COLORS.white, borderColor: COLORS.border },
  typeBtnText: { color: COLORS.muted, fontWeight: "900", fontSize: 15 },
  typeBtnTextActive: { color: COLORS.white },

  dateField: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#F8FAFC" },
  dateFieldPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  dateFieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateFieldValue: { color: COLORS.text, fontSize: 15, fontWeight: "900", flexShrink: 1, marginRight: 10 },
  dateEditBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft },
  dateEditBtnText: { color: COLORS.blue, fontWeight: "900", fontSize: 12 },

  errorBox: { backgroundColor: COLORS.expenseSoft, borderWidth: 1, borderColor: COLORS.expenseBorder, borderRadius: 16, padding: 14, marginBottom: 16 },
  errorText: { color: COLORS.expense, fontWeight: "800", fontSize: 14, lineHeight: 20 },

  actionsWrap: { marginTop: 8 },
});
