import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Transaction } from "../types/transaction";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

interface TransactionItemProps {
  transaction: Transaction;
  onPress: () => void;
}

export function TransactionItem({
  transaction,
  onPress,
}: TransactionItemProps) {
  const amountColor = transaction.type === "income" ? "#15803d" : "#b91c1c";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.container,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.category}>
            {transaction.categoryName ?? "Danh mục"}
          </Text>
          <Text style={styles.meta}>
            {formatDate(transaction.transactionDate)}
          </Text>
          {transaction.merchantName ? (
            <Text style={styles.meta}>{transaction.merchantName}</Text>
          ) : null}
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {transaction.type === "expense" ? "-" : "+"}
            {formatCurrency(transaction.amount)}
          </Text>
          <Text style={styles.type}>{transaction.type}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  content: {
    flex: 1,
  },
  category: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  amountWrap: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
  },
  type: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
    textTransform: "capitalize",
  },
});
