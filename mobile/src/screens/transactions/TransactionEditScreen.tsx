import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { CategoryPicker } from "../../components/CategoryPicker";
import { LoadingView } from "../../components/LoadingView";
import {
  getCategories,
  getTransactionById,
  updateTransaction,
} from "../../services/transactionApi";
import { Category, TransactionType } from "../../types/category";
import { Transaction } from "../../types/transaction";
import { isPositiveAmount } from "../../utils/validators";

export function TransactionEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transactionId = route.params?.transactionId as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [merchantName, setMerchantName] = useState("");

  const loadTransaction = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionById(transactionId);
      setTransaction(result);
      setType(result.type);
      setAmount(String(result.amount));
      setCategoryId(result.categoryId);
      setNote(result.note ?? "");
      setTransactionDate(result.transactionDate);
      setMerchantName(result.merchantName ?? "");
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useFocusEffect(
    useCallback(() => {
      void loadTransaction();
    }, [loadTransaction]),
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategories(await getCategories(type));
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

    if (!categoryId) {
      setError("Danh mục là bắt buộc.");
      return;
    }

    if (!transactionDate) {
      setError("Ngày giao dịch là bắt buộc.");
      return;
    }

    setSaving(true);
    try {
      await updateTransaction(transactionId, {
        amount: Number(amount),
        type,
        categoryId,
        note: note.trim() || undefined,
        transactionDate,
        merchantName: merchantName.trim() || undefined,
      });
      Alert.alert("Đã cập nhật", "Giao dịch đã được sửa thành công.");
      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật giao dịch.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView label="Đang tải giao dịch..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Sửa giao dịch</Text>
        <AppButton
          title="Expense"
          variant={type === "expense" ? "primary" : "secondary"}
          onPress={() => setType("expense")}
        />
        <Text style={styles.spacer} />
        <AppButton
          title="Income"
          variant={type === "income" ? "primary" : "secondary"}
          onPress={() => setType("income")}
        />
        <AppInput
          label="Số tiền"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
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
        />
        <AppInput
          label="Ghi chú"
          value={note}
          onChangeText={setNote}
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
          title="Lưu thay đổi"
          onPress={() => void handleSave()}
          loading={saving}
        />
      </AppCard>
      {transaction ? (
        <Text style={styles.muted}>ID: {transaction.id}</Text>
      ) : null}
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
    marginBottom: 12,
  },
  label: {
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 6,
  },
  error: {
    color: "#b91c1c",
    marginVertical: 10,
  },
  spacer: {
    height: 10,
  },
  muted: {
    textAlign: "center",
    marginTop: 8,
    color: "#64748b",
  },
});
