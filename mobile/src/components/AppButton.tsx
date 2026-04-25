import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: ViewStyle;
  disabled?: boolean;
}

export function AppButton({
  title,
  onPress,
  loading = false,
  variant = "primary",
  style,
  disabled = false,
}: AppButtonProps) {
  const backgroundColor =
    variant === "secondary"
      ? "#1e293b"
      : variant === "danger"
        ? "#991b1b"
        : variant === "ghost"
          ? "transparent"
          : "#0f172a";

  const borderColor = variant === "ghost" ? "#334155" : backgroundColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: pressed || disabled || loading ? 0.75 : 1,
        },
        variant === "ghost" ? styles.ghost : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? "#0f172a" : "#fff"} />
      ) : (
        <Text
          style={[styles.title, variant === "ghost" ? styles.ghostTitle : null]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ghost: {
    backgroundColor: "#f8fafc",
  },
  ghostTitle: {
    color: "#0f172a",
  },
});
