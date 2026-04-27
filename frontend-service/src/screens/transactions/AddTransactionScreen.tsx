import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { AppCard } from "../../components/AppCard";
import { uploadReceiptImage } from "../../services/storageService";
import { scanReceipt } from "../../services/ocrApi";
import { useAuthStore } from "../../store/authStore";
import { useTransactionStore } from "../../store/transactionStore";
import { normalizeAxiosError } from "../../utils/responseHandler";

const COLORS = {
  bg: "#F6F8FB",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  soft: "#F1F5F9",
  border: "#E2E8F0",
  primary: "#2563EB",
  primarySoft: "#DBEAFE",
  primaryLight: "#EFF6FF",
  dark: "#0F172A",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
};

function isNumericOverflowError(message: string) {
  return message.toLowerCase().includes("numeric field overflow");
}

type ActionButtonProps = {
  title: string;
  description: string;
  active?: boolean;
  loading?: boolean;
  onPress: () => void;
};

function ActionButton({
  title,
  description,
  loading,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && !loading && styles.actionButtonPressed,
      ]}
    >
      <View style={styles.actionLeft}>
        <View style={styles.actionDot} />
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.actionCircle}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.actionArrow}>→</Text>
        )}
      </View>
    </Pressable>
  );
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
    if (!user?.id) {
      Alert.alert("Thiếu phiên đăng nhập", "Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setLoadingSource(sourceType);

      let result: ImagePicker.ImagePickerResult;

      if (sourceType === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Quyền camera", "Cần cấp quyền camera để chụp hóa đơn.");
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Quyền thư viện ảnh",
            "Cần cấp quyền thư viện để chọn hóa đơn.",
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const imageUri = result.assets[0].uri;
      const imageUrl = await uploadReceiptImage(imageUri, user.id);

      let ocrResult = null;

      try {
        ocrResult = await scanReceipt({
          sourceType,
          imageUrl,
        });
      } catch (error) {
        const normalized = normalizeAxiosError(error);

        if (isNumericOverflowError(normalized.message)) {
          Alert.alert(
            "OCR chưa hỗ trợ ảnh này",
            "Ảnh chuyển khoản ngân hàng có thể không đọc được tự động. Bạn vẫn có thể nhập thông tin thủ công ở màn xác nhận giao dịch.",
          );
        } else {
          Alert.alert(
            "OCR không nhận diện được",
            "Vui lòng thử lại với ảnh rõ hơn. Bạn vẫn có thể nhập thủ công ở bước tiếp theo.",
          );
        }
      }

      setDraftReceiptPath(imageUrl);
      setDraftOcrResult(ocrResult);
      setDraftSourceType(sourceType);

      navigation.navigate("TransactionConfirm");
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      Alert.alert("Không thể xử lý ảnh", normalized.message);
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Thêm giao dịch</Text>

        <Text style={styles.title}>Quét hóa đơn</Text>

        <Text style={styles.subtitle}>
          Tải ảnh hóa đơn lên để hệ thống tự nhận diện số tiền, ngày giao dịch
          và nội dung thanh toán.
        </Text>
      </View>

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
          title="Chụp hóa đơn"
          description="Mở camera và chụp hóa đơn mới"
          loading={loadingSource === "camera"}
          onPress={() => void pickImage("camera")}
        />

        <ActionButton
          title="Chọn từ thư viện"
          description="Dùng ảnh hóa đơn đã có trong máy"
          loading={loadingSource === "gallery"}
          onPress={() => void pickImage("gallery")}
        />
      </AppCard>

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
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    backgroundColor: COLORS.bg,
  },

  header: {
    marginBottom: 22,
  },

  label: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.muted,
  },

  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dark,
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
  },

  scanPreview: {
    width: 86,
    height: 104,
    borderRadius: 24,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  receiptPaper: {
    width: 48,
    height: 66,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 8,
  },

  receiptLineLong: {
    height: 5,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 7,
  },

  receiptLine: {
    height: 5,
    width: "78%",
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginBottom: 7,
  },

  receiptLineShort: {
    height: 5,
    width: "58%",
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginBottom: 9,
  },

  receiptDivider: {
    height: 1,
    width: "100%",
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },

  receiptAmount: {
    height: 7,
    width: "72%",
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },

  scanInfo: {
    flex: 1,
  },

  scanTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  scanText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
  },

  card: {
    padding: 18,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardHint: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "700",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  actionButtonPressed: {
    opacity: 0.75,
  },

  actionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },

  actionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginRight: 14,
  },

  actionTextWrap: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },

  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
  },

  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
  },

  actionArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: -2,
  },

  tipBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },

  tipTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 5,
  },

  tipText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
  },
});