import React, {
  useCallback, useState, useRef, useEffect, useMemo
} from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { LoadingView } from "../../components/LoadingView";
import { COLORS, shadow } from "../../constants/ui";
import { deleteTransaction, getTransactionById } from "../../services/transactionApi";
import { Transaction } from "../../types/transaction";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { dataInvalidation } from "../../utils/dataInvalidation";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { useAppDataStore } from "../../store/appDataStore";

export function TransactionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transaction_id = route.params?.transaction_id as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const lastFetchedAt = useRef<number | null>(null);

  const loadTransaction = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionById(transaction_id);
      setTransaction(result);
      lastFetchedAt.current = Date.now();
    } catch (err: any) {
      const status = err?.statusCode ?? err?.response?.status;
      // Nếu đang xóa thì bỏ qua lỗi 404
      if (status === 404 && !deleting) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }, [transaction_id]);

  useFocusEffect(
    useCallback(() => {
      if (!lastFetchedAt.current || Date.now() - lastFetchedAt.current > 60_000) {
        void loadTransaction();
      }
    }, [loadTransaction]),
  );

  useEffect(() => {
    const unsubscribe = dataInvalidation.subscribe((key) => {
      if (key === "transactions") {
        lastFetchedAt.current = null;
        void loadTransaction();
      }
    });
    return unsubscribe;
  }, [loadTransaction]);

  // Hook phải luôn được gọi trước conditional return
  const receiptSignedUrl = useSignedUrl(transaction?.image_url);

  const expenseCategories = useAppDataStore((state) => state.expenseCategories);
  const incomeCategories = useAppDataStore((state) => state.incomeCategories);

  const categoryName = useMemo(() => {
    if (transaction?.category_name) return transaction.category_name;
    const cats = transaction?.type === "expense" ? expenseCategories : incomeCategories;
    return cats.find((c) => c.id === transaction?.category_id)?.name ?? "Chưa phân loại";
  }, [transaction, expenseCategories, incomeCategories]);

  const handleDelete = () => {
    Alert.alert("Xác nhận xóa", "Bạn chắc chắn muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTransaction(transaction_id);
            navigation.goBack();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || deleting) {
    return <LoadingView label={deleting ? "Đang xóa..." : "Đang tải chi tiết giao dịch..."} />;
  }

  if (!transaction) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Không tìm thấy giao dịch.</Text>
        <AppButton title="Quay lại" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const isExpense = transaction.type === "expense";
  const amountColor = isExpense ? COLORS.expense : COLORS.income;
  const headerBg = isExpense ? COLORS.expenseSoft : COLORS.incomeSoft;
  const badgeColor = isExpense ? COLORS.expense : COLORS.income;
  const badgeBg = isExpense ? "rgba(225,29,72,0.1)" : "rgba(22,163,74,0.1)";

  const getSourceLabel = (source?: string | null) => {
    switch (source) {
      case "camera": return "Chụp ảnh";
      case "gallery": return "Thư viện ảnh";
      default: return "Chatbot";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header / Amount Card */}
        <View style={styles.headerWrap}>
          <View style={styles.glowLeft} />
          <View style={styles.glowRight} />
          <View style={styles.amountCard}>
            <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.typeText, { color: badgeColor }]}>
                {isExpense ? "CHI TIÊU" : "THU NHẬP"}
              </Text>
            </View>
            <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit>
              {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={styles.date}>{formatDate(transaction.transaction_date)}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Danh mục</Text>
              <Text style={styles.detailValue}>{categoryName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Cửa hàng / Người nhận</Text>
              <Text style={styles.detailValue}>{transaction.merchant_name || "Không có thông tin"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Ghi chú</Text>
              <Text style={styles.detailValue}>{transaction.note || "Không có ghi chú"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Nguồn nhập</Text>
              <Text style={styles.detailValue}>{getSourceLabel(transaction.source)}</Text>
            </View>
          </View>

          {transaction.isAnomaly && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: COLORS.expense }]}>Phát hiện bất thường</Text>
                  <Text style={styles.detailValue}>Giao dịch này có dấu hiệu bất thường</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {receiptSignedUrl ? (
          <Pressable
            onLongPress={() => setShowFullImage(true)}
            style={styles.imageCard}
          >
            <Text style={styles.imageTitle}>Hóa đơn đính kèm</Text>
            <Image
              source={{ uri: receiptSignedUrl }}
              style={styles.receiptImage}
              resizeMode="cover"
            />
            <Text style={styles.imageHint}>Nhấn giữ để xem ảnh toàn màn hình</Text>
          </Pressable>
        ) : null}

        <ImageViewerModal
          visible={showFullImage}
          imageUrl={receiptSignedUrl ?? ""}
          onClose={() => setShowFullImage(false)}
        />

      </ScrollView>

      {/* Floating Actions Footer */}
      <View style={styles.floatingActionBar}>
        <Pressable
          onPress={() => navigation.navigate("TransactionEdit", { transaction_id })}
          style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.actionPillTextPrimary}>Chỉnh sửa</Text>
        </Pressable>

        <View style={styles.actionDivider} />

        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.actionPillTextDanger, deleting && { opacity: 0.5 }]}>
            {deleting ? "Đang xóa..." : "Xóa giao dịch"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, },
  scrollContent: { paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  error: { color: COLORS.expense, fontSize: 16, fontWeight: "700" },

  // Header Background
  headerWrap: { backgroundColor: COLORS.dark, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, position: "relative", overflow: "hidden", ...shadow },
  glowLeft: { position: "absolute", left: -40, top: -40, width: 200, height: 200, borderRadius: 999, backgroundColor: "rgba(37,99,235,0.15)" },
  glowRight: { position: "absolute", right: -20, bottom: -20, width: 150, height: 150, borderRadius: 999, backgroundColor: "rgba(124,58,237,0.12)" },

  amountCard: { alignItems: "center", paddingHorizontal: 20 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 12 },
  typeText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  amount: { fontSize: 48, fontWeight: "900", letterSpacing: -1.5, marginBottom: 8, textAlign: "center" },
  date: { color: "#94A3B8", fontSize: 15, fontWeight: "700" },

  // Details Card
  detailsCard: { backgroundColor: COLORS.white, borderRadius: 28, marginHorizontal: 16, marginTop: -20, padding: 24, borderWidth: 1, borderColor: COLORS.border, ...shadow },
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailContent: { flex: 1 },
  detailLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  detailValue: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },

  // Image Card
  imageCard: { backgroundColor: COLORS.white, borderRadius: 28, marginHorizontal: 16, marginTop: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, ...shadow },
  imageTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", marginBottom: 16 },
  receiptImage: { width: "100%", height: 300, borderRadius: 16, backgroundColor: "#F1F5F9" },
  imageHint: { color: COLORS.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 10 },

  // Floating Action Bar
  floatingActionBar: {
    position: "absolute",
    bottom: 34,
    left: 24,
    right: 24,
    backgroundColor: COLORS.dark,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  actionPill: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillTextPrimary: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },
  actionPillTextDanger: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "800",
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
