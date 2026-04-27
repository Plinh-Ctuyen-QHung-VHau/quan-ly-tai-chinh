import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AuthStackParamList } from "../../app/AuthNavigator";
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
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.hero}>
        <Text style={styles.badge}>Tài chính cá nhân</Text>
        <Text style={styles.title}>Đăng nhập</Text>
        <Text style={styles.subtitle}>
          Theo dõi giao dịch, ngân sách và thông báo trong một nơi an toàn.
        </Text>
      </View>

      <AppCard style={styles.card}>
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
        <Text style={styles.helperText}>Bảo mật bởi Supabase Auth</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: "#f3f7fb",
    justifyContent: "center",
  },
  bgOrbTop: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#d9f3e4",
  },
  bgOrbBottom: {
    position: "absolute",
    bottom: -95,
    left: -65,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#dbeafe",
  },
  hero: {
    marginBottom: 18,
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f4ea",
    color: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 38,
  },
  subtitle: {
    color: "#475569",
    lineHeight: 23,
    fontSize: 16,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderColor: "#dbe5f0",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  helperText: {
    marginTop: 10,
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
  },
  linkRow: {
    marginTop: 16,
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    color: "#475569",
    fontSize: 16,
  },
  linkButton: {
    alignSelf: "stretch",
  },
});
