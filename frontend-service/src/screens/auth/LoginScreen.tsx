import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AuthNavigator, AuthStackParamList } from "../../app/AuthNavigator";
import { signIn } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { isEmail, validatePassword } from "../../utils/validators";

export function LoginScreen({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, "Login">) {
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!isEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn({ email: email.trim(), password });
      setSession(result.session ?? null);
      Alert.alert("Thành công", "Đăng nhập thành công.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đăng nhập thất bại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Quản lý chi tiêu thông minh</Text>
        <Text style={styles.subtitle}>
          Đăng nhập để đồng bộ giao dịch, ngân sách và thông báo của bạn.
        </Text>
      </View>

      <AppCard>
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <AppInput
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Nhập mật khẩu"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Đăng nhập" onPress={handleLogin} loading={loading} />
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Chưa có tài khoản?</Text>
          <AppButton
            title="Đăng ký"
            variant="ghost"
            onPress={() => navigation.navigate("Register")}
            style={styles.linkButton}
          />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  hero: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#475569",
    lineHeight: 21,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
  linkRow: {
    marginTop: 14,
    alignItems: "center",
    gap: 10,
  },
  linkText: {
    color: "#475569",
  },
  linkButton: {
    alignSelf: "stretch",
  },
});
