import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type SectionHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}>;

export function SectionHeader({ title, subtitle, rightSlot, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  textWrap: { flex: 1 },
  title: { color: "#0F172A", fontSize: 21, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 20, marginTop: 4 },
  rightSlot: { alignItems: "flex-end" },
});

export default SectionHeader;
