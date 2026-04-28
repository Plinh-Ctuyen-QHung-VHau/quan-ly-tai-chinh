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
  let arrowSymbol = "→";

  if (arrow === "up") {
    arrowSymbol = "↑";
  } else if (arrow === "down") {
    arrowSymbol = "↓";
  }

  return (
    <View style={{ flex: 1, minHeight: 112, borderRadius: 18, padding: 14, borderWidth: 1, backgroundColor: bg, borderColor: border }}>
      <Text style={{ fontSize: 16, fontWeight: "900", color, marginBottom: 8 }}>{arrowSymbol}</Text>
      <Text style={{ fontSize: 12, fontWeight: "900", color: UI_COLORS.text, textTransform: "uppercase", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 17, fontWeight: "900", color }} numberOfLines={1}>{formatCurrency(value)}</Text>
      <Text style={{ color: UI_COLORS.muted, fontSize: 11, lineHeight: 15 }}>{hint}</Text>
    </View>
  );
}

export function SmallMetric({ label, value, color, bg }: SmallMetricProps) {
  return (
    <View style={{ flex: 1, borderRadius: 14, padding: 10, backgroundColor: bg }}>
      <Text style={{ color: UI_COLORS.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: "900", color }} numberOfLines={1}>{formatCurrency(value)}</Text>
    </View>
  );
}

export default { StatTile, SmallMetric };
