import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type SegmentedOption = Readonly<{
  label: string;
  value: string;
}>;

type SegmentedChipsProps = Readonly<{
  options: ReadonlyArray<SegmentedOption>;
  value: string;
  onChange: (value: string) => void;
}>;

export function SegmentedChips({ options, value, onChange }: SegmentedChipsProps) {
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <View style={styles.segment}>
      {safeOptions.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, selected && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", padding: 4, borderRadius: 18, backgroundColor: "#F1F5F9" },
  segmentButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: "#0F172A" },
  segmentText: { color: "#64748B", fontSize: 15, fontWeight: "900" },
  segmentTextActive: { color: "#FFFFFF" },
});

export default SegmentedChips;
