import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { COLORS } from "../constants/ui";

type Props = Readonly<{
  visible: boolean;
  title: string;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}>;

export function DatePickerModal({
  visible,
  title,
  value,
  onClose,
  onConfirm,
}: Props) {
  const fallbackDate = useMemo(() => {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }, [value]);
  const [tempDate, setTempDate] = useState(fallbackDate);

  useEffect(() => {
    if (visible) {
      // Chỉ reset khi modal vừa mở, dùng value tại thời điểm mở
      const d = Number.isNaN(value.getTime()) ? new Date() : value;
      setTempDate(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.centerWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>{title}</Text>

          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            textColor={COLORS.text || "#000000"}
            onChange={(_, selectedDate) => {
              if (selectedDate) setTempDate(selectedDate);
            }}
          />

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => onConfirm(tempDate)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Xong</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dark,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },
});
