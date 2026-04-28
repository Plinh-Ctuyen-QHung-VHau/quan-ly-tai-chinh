import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { ActionButton } from "../../components/ActionButton";
import { AppCard } from "../../components/AppCard";
import { ScreenHero } from "../../components/ScreenHero";
import { COLORS, shadow } from "../../constants/ui";
import { scanReceipt } from "../../services/ocrApi";
import { uploadReceiptImage } from "../../services/storageService";
import { useAuthStore } from "../../store/authStore";
import { useTransactionStore } from "../../store/transactionStore";
import { normalizeAxiosError } from "../../utils/responseHandler";

function isNumericOverflowError(message: string) {
  return message.toLowerCase().includes("numeric field overflow");
}

async function selectReceiptImage(sourceType: "camera" | "gallery") {
  if (sourceType === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Quyền camera", "Cần cấp quyền camera để chụp hóa đơn.");
      return null;
    }

    return ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Quyền thư viện ảnh",
      "Cần cấp quyền thư viện để chọn hóa đơn.",
    );
    return null;
  }

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: true,
  });
}

async function processReceiptImage(params: {
  imageUri: string;
  userId: string;
  sourceType: "camera" | "gallery";
}) {
  const imageUrl = await uploadReceiptImage(params.imageUri, params.userId);

  const validImageUrl =
    imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
      ? imageUrl
      : null;

  if (!validImageUrl) {
    throw new Error("Ảnh tải lên không hợp lệ.");
  }

  let ocrResult = null;

  try {
    ocrResult = await scanReceipt({
      sourceType: params.sourceType,
      imageUrl: validImageUrl,
    });
  } catch (error) {
    const normalized = normalizeAxiosError(error);

    if (isNumericOverflowError(normalized.message)) {
      Alert.alert(
        "OCR chưa hỗ trợ ảnh này",
        "Ảnh chuyển khoản ngân hàng có thể không đọc được tự động. Bạn vẫn có thể nhập thủ công ở màn xác nhận giao dịch.",
      );
    } else {
      Alert.alert(
        "OCR không nhận diện được",
        "Vui lòng thử lại với ảnh rõ hơn. Bạn vẫn có thể nhập thủ công ở bước tiếp theo.",
      );
    }
  }

  return { imageUrl: validImageUrl, ocrResult };
}

export function AddTransactionScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);

  const setDraftReceiptPath = useTransactionStore(
    (state) => state.setDraftReceiptPath,
  );

  const setDraftOcrResult = useTransactionStore(
    (state) => state.setDraftOcrResult,
  );

  const setDraftSourceType = useTransactionStore(
    (state) => state.setDraftSourceType,
  );

  const [loadingSource, setLoadingSource] = useState<
    "camera" | "gallery" | null
  >(null);

  const pickImage = async (sourceType: "camera" | "gallery") => {
    if (loadingSource !== null) {
      return;
    }

    if (!user?.id) {
      Alert.alert("Thiếu phiên đăng nhập", "Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setLoadingSource(sourceType);

      const result = await selectReceiptImage(sourceType);

      if (!result) {
        return;
      }

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const { imageUrl, ocrResult } = await processReceiptImage({
        imageUri: result.assets[0].uri,
        userId: user.id,
        sourceType,
      });

      setDraftReceiptPath(imageUrl);
      setDraftOcrResult(ocrResult);
      setDraftSourceType(sourceType);

      navigation.navigate("TransactionConfirm");
    } catch (error) {
      const normalized = normalizeAxiosError(error);

      const fallbackMessage =
        normalized.message.length > 220
          ? "Vui lòng thử lại với ảnh rõ hơn hoặc kiểm tra kết nối mạng."
          : normalized.message;

      Alert.alert("Không thể xử lý hóa đơn", fallbackMessage);
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <ScreenHero
        kicker="Giao dịch"
        title="Thêm từ hóa đơn"
        subtitle="Chụp hoặc chọn ảnh hóa đơn, hệ thống sẽ tự nhận diện số tiền, ngày và cửa hàng."
      />

      <View style={styles.scanCard}>
        <View style={styles.scanPreview}>
          <View style={styles.receiptPaper}>
            <View style={styles.receiptLineLong} />
            <View style={styles.receiptLine} />
            <View style={styles.receiptLineShort} />
            <View style={styles.receiptDivider} />
            <View style={styles.receiptAmount} />
          </View>
        </View>

        <View style={styles.scanInfo}>
          <Text style={styles.scanTitle}>Nhận diện tự động</Text>

          <Text style={styles.scanText}>
            Sau khi chọn ảnh, bạn sẽ được kiểm tra và chỉnh sửa lại thông tin
            trước khi lưu.
          </Text>
        </View>
      </View>

      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Chọn nguồn ảnh</Text>
          <Text style={styles.cardHint}>Bước 1/2</Text>
        </View>

        <ActionButton
          title="Chụp ảnh hóa đơn"
          description="Mở camera và chụp hóa đơn mới"
          loading={loadingSource === "camera"}
          onPress={() => void pickImage("camera")}
        />

        <ActionButton
          title="Chọn ảnh từ thư viện"
          description="Dùng ảnh hóa đơn đã có trong máy"
          loading={loadingSource === "gallery"}
          onPress={() => void pickImage("gallery")}
        />
      </AppCard>

      {loadingSource ? (
        <Text style={styles.loadingText}>
          Đang tải ảnh và nhận diện hóa đơn...
        </Text>
      ) : null}

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Mẹo nhỏ</Text>

        <Text style={styles.tipText}>
          Ảnh rõ, đủ sáng và không bị cắt mất phần tổng tiền sẽ giúp nhận diện
          chính xác hơn.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, backgroundColor: "#EEF2F7" },

  scanCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.dark, borderRadius: 28, padding: 18, marginBottom: 18 },

  scanPreview: { width: 86, height: 104, borderRadius: 24, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center", marginRight: 16 },

  receiptPaper: { width: 48, height: 66, borderRadius: 8, backgroundColor: "#FFFFFF", padding: 8 },

  receiptLineLong: { height: 5, width: "100%", borderRadius: 999, backgroundColor: "#CBD5E1", marginBottom: 7 },

  receiptLine: { height: 5, width: "78%", borderRadius: 999, backgroundColor: "#E2E8F0", marginBottom: 7 },

  receiptLineShort: { height: 5, width: "58%", borderRadius: 999, backgroundColor: "#E2E8F0", marginBottom: 9 },

  receiptDivider: { height: 1, width: "100%", backgroundColor: "#E2E8F0", marginBottom: 8 },

  receiptAmount: { height: 7, width: "72%", borderRadius: 999, backgroundColor: COLORS.income },

  scanInfo: { flex: 1 },

  scanTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 6 },

  scanText: { color: "#CBD5E1", fontSize: 14, lineHeight: 21 },

  card: { padding: 18, borderRadius: 28, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#DCE4EE", ...shadow },

  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

  cardTitle: { fontSize: 19, fontWeight: "800", color: COLORS.text },

  cardHint: { fontSize: 13, color: COLORS.muted, fontWeight: "700" },

  loadingText: { marginTop: 10, marginBottom: 2, textAlign: "center", color: COLORS.muted, fontSize: 13, fontWeight: "600" },

  tipBox: { marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueSoft },

  tipTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 5 },

  tipText: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
});