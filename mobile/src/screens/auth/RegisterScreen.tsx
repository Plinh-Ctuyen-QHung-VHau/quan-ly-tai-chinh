import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AuthStackParamList } from "../../app/AuthNavigator";
import { signUp } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { isEmail, validatePassword } from "../../utils/validators";

export function RegisterScreen({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, "Register">) {
  const setSession = useAuthStore((state) => state.setSession);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!fullName.trim()) {
      setError("Họ tên không được để trống.");
      return;
    }

    if (!isEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      if (result.session) {
        setSession(result.session);
      } else {
        Alert.alert(
          "Đăng ký thành công",
          "Vui lòng kiểm tra email để xác nhận tài khoản nếu Supabase yêu cầu xác thực email.",
        );
        navigation.goBack();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại.";
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
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>
          Đăng ký Supabase Auth trực tiếp từ ứng dụng di động.
        </Text>
      </View>

      <AppCard>
        <AppInput
          label="Họ và tên"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nguyen Van A"
        />
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
          placeholder="Tối thiểu 6 ký tự"
        />
        <AppInput
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Nhập lại mật khẩu"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Đăng ký" onPress={handleRegister} loading={loading} />
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Đã có tài khoản?</Text>
          <AppButton
            title="Đăng nhập"
            variant="ghost"
            onPress={() => navigation.goBack()}
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
