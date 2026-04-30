import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { COLORS } from "../constants/ui";

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  onPress: () => void;
};

export function ActionButton({ title, description, loading, onPress }: Readonly<Props>) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border }, pressed && !loading ? { opacity: 0.75 } : undefined]}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.blue, marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.text, marginBottom: 4 }}>{title}</Text>
          {description ? <Text style={{ fontSize: 14, lineHeight: 20, color: COLORS.muted }}>{description}</Text> : null}
        </View>
      </View>

      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.dark, alignItems: "center", justifyContent: "center" }}>
        {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: -2 }}>→</Text>}
      </View>
    </Pressable>
  );
}

export default ActionButton;
