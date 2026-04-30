import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingView({ label = "Đang tải..." }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: {
    color: "#334155",
    fontSize: 15,
  },
});
