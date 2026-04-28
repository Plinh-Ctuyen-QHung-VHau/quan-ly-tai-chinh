import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { LoadingView } from "../../components/LoadingView";
import {
  deleteTransaction,
  getTransactionById,
} from "../../services/transactionApi";
import { Transaction } from "../../types/transaction";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";

export function TransactionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transactionId = route.params?.transactionId as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadTransaction = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionById(transactionId);
      setTransaction(result);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useFocusEffect(
    useCallback(() => {
      void loadTransaction();
    }, [loadTransaction]),
  );

  const handleDelete = () => {
    Alert.alert("Xác nhận xóa", "Bạn chắc chắn muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTransaction(transactionId);
            navigation.goBack();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingView label="Đang tải chi tiết giao dịch..." />;
  }

  if (!transaction) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Không tìm thấy giao dịch.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Chi tiết giao dịch</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Số tiền</Text>
          <Text style={styles.value}>{formatCurrency(transaction.amount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Loại</Text>
          <Text style={styles.value}>{transaction.type}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Danh mục</Text>
          <Text style={styles.value}>
            {transaction.categoryName ?? transaction.category_id}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ghi chú</Text>
          <Text style={styles.value}>{transaction.note ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ngày giao dịch</Text>
          <Text style={styles.value}>
            {formatDate(transaction.transaction_date)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Merchant</Text>
          <Text style={styles.value}>{transaction.merchant_name ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Bất thường</Text>
          <Text style={styles.value}>
            {transaction.is_anomaly ? "Có" : "Không"}
          </Text>
        </View>
        {transaction.image_url ? (
          <Text style={styles.imagePath}>{transaction.image_url}</Text>
        ) : null}
      </AppCard>

      {transaction.image_url?.startsWith("http") ? (
        <Image source={{ uri: transaction.image_url }} style={styles.image} />
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title="Sửa"
          onPress={() =>
            navigation.navigate("TransactionEdit", { transactionId })
          }
        />
        <AppButton
          title="Xóa"
          variant="danger"
          onPress={handleDelete}
          loading={deleting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  label: {
    color: "#64748b",
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: "right",
    color: "#0f172a",
    fontWeight: "600",
  },
  imagePath: {
    marginTop: 8,
    color: "#475569",
    fontSize: 13,
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    marginTop: 12,
    backgroundColor: "#e2e8f0",
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  error: {
    color: "#b91c1c",
  },
});
