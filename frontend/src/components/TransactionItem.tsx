import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Transaction } from "../types/transaction";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { useSignedUrl } from "../hooks/useSignedUrl";
import { ImageViewerModal } from "./ImageViewerModal";

interface TransactionItemProps {
  transaction: Transaction;
  onPress: () => void;
}

export function TransactionItem({
  transaction,
  onPress,
}: Readonly<TransactionItemProps>) {
  const isExpense = transaction.type === "expense";
  const amountColor = isExpense ? "#b91c1c" : "#15803d";
  const amountBg = isExpense ? "#FEF2F2" : "#F0FDF4";
  const amountBorderColor = isExpense ? "#FECACA" : "#BBF7D0";
  const typeLabel = isExpense ? "Chi tiêu" : "Thu nhập";
  const signedUrl = useSignedUrl(transaction.image_url);
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {/* Receipt thumbnail only - hide entirely if no image */}
        {signedUrl ? (
          <Pressable onLongPress={() => setShowFullImage(true)}>
            <Image
              source={{ uri: signedUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        <ImageViewerModal
          visible={showFullImage}
          imageUrl={signedUrl ?? ""}
          onClose={() => setShowFullImage(false)}
        />

        <View style={styles.content}>
          <Text style={styles.category} numberOfLines={1}>
            {transaction.category_name ?? "Danh mục"}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatDate(transaction.transaction_date)}
            {transaction.merchant_name ? ` · ${transaction.merchant_name}` : ""}
          </Text>
        </View>

        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
            {isExpense ? "-" : "+"}
            {formatCurrency(transaction.amount)}
          </Text>
          <Text style={styles.type}>{typeLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  category: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  amountWrap: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "900",
  },
  type: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },
});
