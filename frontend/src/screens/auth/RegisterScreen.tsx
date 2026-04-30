import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import type { AuthStackParamList } from "../../app/AuthNavigator";
import { signUp } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { isEmail, validatePassword } from "../../utils/validators";

export function RegisterScreen({
  navigation,
}: Readonly<NativeStackScreenProps<AuthStackParamList, "Register">>) {
  const setSession = useAuthStore((state) => state.setSession);
  const [full_name, setfull_name] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [full_nameError, setfull_nameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setfull_nameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    const normalizedfull_name = full_name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedfull_name) {
      setfull_nameError("Vui lòng nhập họ và tên.");
      return;
    }

    if (!isEmail(normalizedEmail)) {
      setEmailError("Vui lòng nhập email hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        full_name: normalizedfull_name,
        email: normalizedEmail,
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
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.hero}>
        <Text style={styles.badge}>Bắt đầu tiết kiệm</Text>
        <Text style={styles.title}>Tạo tài khoản quản lý tài chính</Text>
        <Text style={styles.subtitle}>
          Đăng ký nhanh để theo dõi chi tiêu, ngân sách và mục tiêu cá nhân.
        </Text>
      </View>

      <AppCard style={styles.card}>
        <AppInput
          label="Họ và tên"
          value={full_name}
          onChangeText={(value) => {
            setfull_name(value);
            if (full_nameError) setfull_nameError("");
          }}
          placeholder="Nguyễn Văn A"
          error={full_nameError}
        />
        <AppInput
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          error={emailError}
        />
        <AppInput
          label="Mật khẩu"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (passwordError) setPasswordError("");
          }}
          secureTextEntry
          placeholder="Tối thiểu 6 ký tự"
          helperText="Nên kết hợp chữ và số để tăng bảo mật"
          error={passwordError}
        />
        <AppInput
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (confirmPasswordError) setConfirmPasswordError("");
          }}
          secureTextEntry
          placeholder="Nhập lại mật khẩu"
          error={confirmPasswordError}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Đăng ký" onPress={handleRegister} loading={loading} />
        <Text style={styles.helperText}>Thông tin của bạn được mã hóa và bảo mật</Text>
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
