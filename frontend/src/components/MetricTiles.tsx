import React from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "../utils/formatters";
import { COLORS as UI_COLORS } from "../constants/ui";

type StatTileProps = Readonly<{
  label: string;
  value: number;
  hint: string;
  color: string;
  bg: string;
  border: string;
  arrow: "up" | "down" | "right";
}>;

type SmallMetricProps = Readonly<{
  label: string;
  value: number;
  color: string;
  bg: string;
  labelColor?: string;
}>;

export function StatTile({
  label,
  value,
  hint,
  color,
  bg,
  border,
  arrow,
}: StatTileProps) {
  return (
    <View style={{ flex: 1, borderRadius: 18, padding: 16, borderWidth: 1, backgroundColor: bg, borderColor: border }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: UI_COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color, letterSpacing: -0.5, marginBottom: 4 }} numberOfLines={1}>{formatCurrency(value)}</Text>
      <Text style={{ color: UI_COLORS.muted2, fontSize: 11 }}>{hint}</Text>
    </View>
  );
}

export function SmallMetric({ label, value, color, bg, labelColor }: SmallMetricProps) {
  return (
    <View style={{ flex: 1, borderRadius: 14, padding: 10, backgroundColor: bg, borderWidth: 1, borderColor: UI_COLORS.border }}>
      <Text style={{ color: labelColor ?? UI_COLORS.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: "900", color }} numberOfLines={1}>{formatCurrency(value)}</Text>
    </View>
  );
}

export default { StatTile, SmallMetric };
