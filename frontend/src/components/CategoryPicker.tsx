import React from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";

import { Category } from "../types/category";

interface CategoryPickerProps {
  items?: Category[] | null;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function CategoryPicker({
  items,
  selectedId,
  onSelect,
}: Readonly<CategoryPickerProps>) {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return <Text style={styles.empty}>Chưa có danh mục phù hợp</Text>;
  }

  return (
    <FlatList
      horizontal
      data={safeItems}
      keyExtractor={(item: Category) => item.id}
      contentContainerStyle={styles.list}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={[styles.item, selected ? styles.itemSelected : null]}
          >
            <Text style={[styles.name, selected ? styles.nameSelected : null]}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingVertical: 6,
  },
  item: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  itemSelected: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  name: {
    color: "#0f172a",
    fontWeight: "600",
  },
  nameSelected: {
    color: "#fff",
  },
  empty: {
    color: "#64748b",
    paddingVertical: 8,
  },
});
