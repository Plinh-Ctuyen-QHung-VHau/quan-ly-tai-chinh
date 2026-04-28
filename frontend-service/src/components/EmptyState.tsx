import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "./AppButton";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: Readonly<EmptyStateProps>) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  iconText: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "900",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    color: "#475569",
    lineHeight: 20,
  },
});
