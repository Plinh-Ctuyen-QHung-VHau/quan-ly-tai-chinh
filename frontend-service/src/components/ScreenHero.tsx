import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { COLORS } from "../constants/ui";

type ScreenHeroProps = Readonly<{
  kicker: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
  centered?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}>;

export function ScreenHero({ kicker, title, subtitle, rightSlot, centered, style, children }: ScreenHeroProps) {
  return (
    <View style={[styles.hero, style]}>
      <View style={styles.glow} />

      <View style={[styles.topRow, centered && styles.topRowCentered]}>
        <Text style={styles.kicker}>{kicker}</Text>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>

      <Text style={[styles.title, centered && styles.centeredText]}>{title}</Text>
      <Text style={[styles.subtitle, centered && styles.centeredText]}>{subtitle}</Text>
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 16, borderRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, backgroundColor: COLORS.dark, overflow: "hidden" },
  glow: { position: "absolute", right: -28, top: -34, width: 150, height: 150, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.22)" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  topRowCentered: { justifyContent: "center" },
  kicker: { color: "#93C5FD", fontSize: 13, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: COLORS.white, fontSize: 34, lineHeight: 40, fontWeight: "900", marginBottom: 10 },
  subtitle: { color: "#CBD5E1", fontSize: 15, lineHeight: 22 },
  centeredText: { textAlign: "center" },
  children: { marginTop: 14 },
});

export default ScreenHero;
