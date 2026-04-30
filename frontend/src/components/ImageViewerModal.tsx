import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.overlay}>
        {/* Close backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Image */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
        >
          <Text style={styles.closeBtnText}>✕ Đóng</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageWrap: {
    width: SCREEN_W,
    height: SCREEN_H * 0.75,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: SCREEN_W - 16,
    height: "100%",
    borderRadius: 8,
  },
  closeBtn: {
    position: "absolute",
    bottom: 60,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  closeBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
