import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { uploadReceiptImage } from "../../services/storageService";
import { scanReceipt } from "../../services/ocrApi";
import { useAuthStore } from "../../store/authStore";
import { useTransactionStore } from "../../store/transactionStore";
import { normalizeAxiosError } from "../../utils/responseHandler";

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
  const [loading, setLoading] = useState(false);

  const pickImage = async (sourceType: "camera" | "gallery") => {
    if (!user?.id) {
      Alert.alert("Thiếu phiên đăng nhập", "Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setLoading(true);
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

      const ocrResult = await scanReceipt({
        sourceType,
        imageUrl,
      });

      setDraftReceiptPath(imageUrl);
      setDraftOcrResult(ocrResult);
      setDraftSourceType(sourceType);
      navigation.navigate("TransactionConfirm");
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      Alert.alert("Không thể xử lý ảnh", normalized.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>Thêm giao dịch từ hóa đơn</Text>
        <Text style={styles.description}>
          Chụp ảnh hoặc chọn ảnh từ thư viện, sau đó gửi lên OCR Service qua API
          Gateway.
        </Text>
        <AppButton
          title="Chụp ảnh bằng camera"
          onPress={() => void pickImage("camera")}
          loading={loading}
        />
        <Text style={styles.spacer} />
        <AppButton
          title="Chọn ảnh từ thư viện"
          variant="secondary"
          onPress={() => void pickImage("gallery")}
          loading={loading}
        />
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
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  description: {
    color: "#475569",
    lineHeight: 21,
    marginBottom: 16,
  },
  spacer: {
    height: 12,
  },
});
