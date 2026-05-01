import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { DatePickerModal } from "../../components/DatePickerModal";
import { CategoryPicker } from "../../components/CategoryPicker";
import { COLORS, shadow } from "../../constants/ui";
import { getCategories, createTransaction } from "../../services/transactionApi";
import { TransactionType, Category } from "../../types/category";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAppDataStore } from "../../store/appDataStore";
import { useTransactionStore } from "../../store/transactionStore";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { ImageViewerModal } from "../../components/ImageViewerModal";

export function TransactionConfirmScreen() {
  const navigation = useNavigation<any>();

  // Get draft data from store
  const draftReceiptPath = useTransactionStore((state) => state.draftReceiptPath);
  const draftOcrResult = useTransactionStore((state) => state.draftOcrResult);
  const draftsource_type = useTransactionStore((state) => state.draftsource_type);
  const clearDraft = useTransactionStore((state) => state.clearDraft);

  const expenseCategories = useAppDataStore((state) => state.expenseCategories);
  const incomeCategories = useAppDataStore((state) => state.incomeCategories);
  const refresh = useAppDataStore((state) => state.refresh);

  const [type, setType] = useState<TransactionType>(
    (draftOcrResult?.suggested_type as TransactionType) || "expense"
  );
  const [amount, setAmount] = useState(
    draftOcrResult?.suggested_amount ? String(draftOcrResult.suggested_amount) : ""
  );
  const [category_id, setcategory_id] = useState("");
  const [note, setNote] = useState("");
  const [transaction_date, settransaction_date] = useState(
    draftOcrResult?.suggested_date || new Date().toISOString().slice(0, 10)
  );
  const [merchant_name, setmerchant_name] = useState(draftOcrResult?.merchant_name || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const signedUrl = useSignedUrl(draftReceiptPath);

  // Sync categories when type changes
  useEffect(() => {
    const load = async () => {
      setLoadingCategories(true);
      try {
        const list = await getCategories(type);
        setCategories(list);
        // Try auto-select category from OCR if possible
        const suggestedCatId = draftOcrResult?.suggestedcategory_id;
        if (suggestedCatId) {
          setcategory_id(suggestedCatId);
        }
      } catch (err) {
        console.error("Load categories error:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    void load();
  }, [type, draftOcrResult?.suggestedcategory_id]);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ.");
      return;
    }
    if (!category_id) {
      Alert.alert("Lỗi", "Vui lòng chọn danh mục.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        type,
        category_id,
        note: note.trim() || undefined,
        transaction_date,
        merchant_name: merchant_name.trim() || undefined,
        image_url: draftReceiptPath || undefined,
        source: draftsource_type ?? "camera",
      };

      await createTransaction(payload);
      await refresh();
      clearDraft();

      Alert.alert("Thành công", "Giao dịch đã được lưu.", [
        { text: "OK", onPress: () => navigation.navigate("MainTabs") },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", err instanceof Error ? err.message : "Không thể lưu giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  const formattedAmount = useMemo(() => {
    const val = Number(amount);
    return isNaN(val) ? "0 đ" : formatCurrency(val);
  }, [amount]);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Hero ── */}
      <View style={styles.heroWrap}>
        <View style={styles.heroGlowLeft} />
        <View style={styles.heroGlowRight} />
        <View style={styles.heroContent}>
          <Text style={styles.heroKicker}>XÁC NHẬN GIAO DỊCH</Text>
          <Text style={styles.heroTitle}>Kiểm tra lại dữ liệu</Text>
          <Text style={styles.heroSubtitle}>
            Chúng tôi đã trích xuất thông tin từ hóa đơn. Hãy điều chỉnh nếu có sai sót.
          </Text>
        </View>
      </View>

      {/* ── Receipt Image ── */}
      {signedUrl && (
        <Pressable
          onLongPress={() => setShowFullImage(true)}
          style={styles.receiptCard}
        >
          <Image source={{ uri: signedUrl }} style={styles.receiptImage} resizeMode="cover" />
          <View style={styles.receiptOverlay}>
            <View style={styles.receiptLabelWrap}>
              <Text style={styles.receiptLabelTitle}>Hình ảnh hóa đơn</Text>
              <Text style={styles.receiptLabelSub}>Nhấn giữ để xem toàn màn hình</Text>
            </View>
          </View>
        </Pressable>
      )}

      <ImageViewerModal
        visible={showFullImage}
        imageUrl={signedUrl ?? ""}
        onClose={() => setShowFullImage(false)}
      />

      {/* ── Amount Display ── */}
      <View style={[styles.amountCard, { backgroundColor: type === "expense" ? "#FFF1F2" : "#F0FDF4", borderColor: type === "expense" ? "#FECACA" : "#BBF7D0" }]}>
        <Text style={styles.amountCardLabel}>Tổng số tiền</Text>
        <Text style={[styles.amountCardValue, { color: type === "expense" ? COLORS.expense : COLORS.income }]}>
          {formattedAmount}
        </Text>
        <Text style={styles.amountCardDate}>{transaction_date}</Text>
      </View>

      {/* ── Type Selector ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Loại giao dịch</Text>
        <View style={styles.typeSegment}>
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

      {/* ── Main Form ── */}
      <View style={styles.formCard}>
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

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ngày giao dịch</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [styles.dateField, pressed && styles.dateFieldPressed]}
          >
            <View style={styles.dateFieldRow}>
              <Text style={styles.dateFieldValue}>
                {new Date(transaction_date).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <View style={styles.dateEditBtn}>
                <Text style={styles.dateEditBtnText}>Sửa</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cửa hàng / Người nhận</Text>
          <AppInput
            label=""
            value={merchant_name}
            onChangeText={setmerchant_name}
            placeholder="VD: Coopmart, Grab, Shopee..."
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <AppInput
            label=""
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú thêm..."
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Danh mục</Text>
            {loadingCategories && <Text style={styles.loadingHint}>Đang tải...</Text>}
          </View>
          <CategoryPicker
            items={categories}
            selectedId={category_id}
            onSelect={setcategory_id}
          />
          {categories.length === 0 && !loadingCategories && (
            <Text style={styles.emptyHint}>Chưa có danh mục nào cho loại này.</Text>
          )}
        </View>

        <View style={{ marginTop: 10 }}>
          <AppButton
            title={saving ? "Đang lưu..." : "Xác nhận và Lưu"}
            onPress={() => void handleSave()}
            loading={saving}
          />
        </View>

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
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 40 },

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
  backBtn: { marginTop: 12, height: 52, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  backBtnPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  backBtnDisabled: { opacity: 0.5 },
  backBtnText: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
});
