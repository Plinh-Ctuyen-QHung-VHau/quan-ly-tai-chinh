import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { createBudget, updateBudget } from "../../services/budgetApi";
import { Budget, BudgetPeriod } from "../../types/budget";
import { isPositiveAmount, validateBudgetPeriod } from "../../utils/validators";

export function BudgetFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode = (route.params?.mode ?? "create") as "create" | "edit";
  const budget = route.params?.budget as Budget | undefined;

  const [budgetAmount, setBudgetAmount] = useState(
    String(budget?.budgetAmount ?? ""),
  );
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(
    budget?.budgetPeriod ?? "monthly",
  );
  const [startDate, setStartDate] = useState(
    budget?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(budget?.endDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(budgetAmount)) {
      setError("budgetAmount phải lớn hơn 0.");
      return;
    }

    if (!validateBudgetPeriod(budgetPeriod)) {
      setError("budgetPeriod chỉ nhận weekly hoặc monthly.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        budgetAmount: Number(budgetAmount),
        budgetPeriod,
        startDate,
        endDate: endDate || null,
      };

      if (mode === "edit" && budget?.id) {
        await updateBudget(budget.id, payload);
      } else {
        await createBudget(payload);
      }

      Alert.alert("Thành công", "Ngân sách đã được lưu.");
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu budget.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.title}>
          {mode === "edit" ? "Sửa budget" : "Tạo budget"}
        </Text>
        <AppInput
          label="budgetAmount"
          value={budgetAmount}
          onChangeText={setBudgetAmount}
          keyboardType="numeric"
        />
        <AppInput
          label="budgetPeriod"
          value={budgetPeriod}
          onChangeText={(value) => setBudgetPeriod(value as BudgetPeriod)}
          placeholder="weekly hoặc monthly"
        />
        <AppInput
          label="startDate"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
        />
        <AppInput
          label="endDate"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          title="Lưu budget"
          onPress={() => void handleSave()}
          loading={loading}
        />
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 10,
  },
});
