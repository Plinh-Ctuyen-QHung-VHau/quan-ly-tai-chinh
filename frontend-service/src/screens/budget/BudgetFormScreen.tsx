import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import {
  createBudget,
  getCurrentBudgetStatus,
  updateBudget,
} from "../../services/budgetApi";
import { useBudgetStore } from "../../store/budgetStore";
import { Budget, BudgetPeriod } from "../../types/budget";
import { isPositiveAmount, validateBudgetPeriod } from "../../utils/validators";

export function BudgetFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setCurrentBudgetStatus = useBudgetStore(
    (state) => state.setCurrentBudgetStatus,
  );
  const mode = (route.params?.mode ?? "create") as "create" | "edit";
  const budget = route.params?.budget as Budget | undefined;

  const [budget_amount, setbudget_amount] = useState(
    String(budget?.budget_amount ?? ""),
  );
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(
    budget?.budget_period ?? "monthly",
  );
  const [start_date, setstart_date] = useState(
    budget?.start_date ?? new Date().toISOString().slice(0, 10),
  );
  const [end_date, setend_date] = useState(budget?.end_date ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");

    if (!isPositiveAmount(budget_amount)) {
      setError("budget_amount phải lớn hơn 0.");
      return;
    }

    if (!validateBudgetPeriod(budgetPeriod)) {
      setError("budgetPeriod chỉ nhận weekly hoặc monthly.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        budget_amount: Number(budget_amount),
        budget_period: budgetPeriod,
        start_date: start_date,
        end_date: end_date || undefined,
      };

      if (mode === "edit" && budget?.id) {
        await updateBudget(budget.id, payload);
      } else {
        await createBudget(payload);
      }

      const currentBudgetStatus = await getCurrentBudgetStatus();
      setCurrentBudgetStatus(currentBudgetStatus);

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
          label="budget_amount"
          value={budget_amount}
          onChangeText={setbudget_amount}
          keyboardType="numeric"
        />
        <AppInput
          label="budgetPeriod"
          value={budgetPeriod}
          onChangeText={(value) => setBudgetPeriod(value as BudgetPeriod)}
          placeholder="weekly hoặc monthly"
        />
        <AppInput
          label="start_date"
          value={start_date}
          onChangeText={setstart_date}
          placeholder="YYYY-MM-DD"
        />
        <AppInput
          label="end_date"
          value={end_date}
          onChangeText={setend_date}
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
