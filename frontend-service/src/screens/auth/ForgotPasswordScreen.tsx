import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import type { AuthStackParamList } from "../../app/AuthNavigator";
import {
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  updatePassword,
} from "../../services/authService";
import { supabase } from "../../services/supabaseClient";
import { isEmail, validatePassword } from "../../utils/validators";
import { COLORS } from "../../constants/ui";
import { useAuthStore } from "../../store/authStore";

type Step = "email" | "otp" | "newPassword";

const STEP_LABELS: Record<Step, { title: string; subtitle: string }> = {
  email: {
    title: "Quên mật khẩu?",
    subtitle: "Nhập email đăng ký. Mã xác nhận 8 số sẽ được gửi về hộp thư của bạn.",
  },
  otp: {
    title: "Nhập mã xác nhận",
    subtitle: "Kiểm tra hộp thư và nhập mã 8 số vừa được gửi.",
  },
  newPassword: {
    title: "Đặt mật khẩu mới",
    subtitle: "Mật khẩu mới phải có ít nhất 6 ký tự.",
  },
};

export function ForgotPasswordScreen({
  navigation,
}: Readonly<NativeStackScreenProps<AuthStackParamList, "ForgotPassword">>) {
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  // ─── Bước 1: Gửi OTP ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    setEmailError("");
    setSendError("");
    const normalized = email.trim();
    if (!isEmail(normalized)) {
      setEmailError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      console.log("[ForgotPassword] Calling sendPasswordResetOtp for:", normalized);
      await sendPasswordResetOtp(normalized);
      console.log("[ForgotPassword] OTP sent successfully");
      setStep("otp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể gửi mã. Vui lòng thử lại.";
      console.error("[ForgotPassword] sendOtp error:", err);
      setSendError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Bước 2: Xác minh OTP ────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setOtpError("");
    const token = otp.join("");
    if (token.length < 8) {
      setOtpError("Vui lòng nhập đủ 8 số.");
      return;
    }
    setLoading(true);
    try {
      // Supabase tự cập nhật internal session sau verifyOtp
      // KHÔNG gọi setSession ở đây — tránh AppNavigator navigate sang MainTabs
      await verifyPasswordResetOtp(email.trim(), token);
      setStep("newPassword");
    } catch (err) {
      setOtpError("Mã không đúng hoặc đã hết hạn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Bước 3: Đặt mật khẩu mới ───────────────────────────────────
  const handleUpdatePassword = async () => {
    setPasswordError("");
    if (!validatePassword(newPassword)) {
      setPasswordError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      // Lấy session mới nhất sau khi đổi mật khẩu → AppNavigator navigate vào app
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Không thể cập nhật mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const meta = STEP_LABELS[step];

  // ─── OTP input handler ───────────────────────────────────────────
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (otpError) setOtpError("");
    if (digit && index < 7) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const canGoBack = step !== "email";
  const handleBack = () => {
    if (step === "otp") { setStep("email"); setOtp(["", "", "", "", "", "", "", ""]); setOtpError(""); }
    else if (step === "newPassword") { setStep("otp"); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        {/* Back / close */}
        <Pressable
          style={styles.backBtn}
          onPress={canGoBack ? handleBack : () => navigation.goBack()}
        >
          <Text style={styles.backText}>
            {canGoBack ? "← Quay lại" : "← Đăng nhập"}
          </Text>
        </Pressable>



        <View style={styles.hero}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.subtitle}>{meta.subtitle}</Text>
        </View>

        <AppCard style={styles.card}>

          {/* ── Bước 1: Email ─────────────────────────── */}
          {step === "email" && (
            <>
              <AppInput
                label="Email"
                value={email}
                onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(""); if (sendError) setSendError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                error={emailError}
                autoFocus
              />
              {sendError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{sendError}</Text>
                </View>
              ) : null}
              <AppButton
                title="Gửi mã xác nhận"
                onPress={() => void handleSendOtp()}
                loading={loading}
              />
            </>
          )}

          {/* ── Bước 2: OTP ───────────────────────────── */}
          {step === "otp" && (
            <>
              <Text style={styles.otpHint}>
                Mã gửi đến: <Text style={styles.otpEmail}>{email}</Text>
              </Text>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { otpRefs.current[i] = r; }}
                    style={[styles.otpBox, otpError ? styles.otpBoxError : null]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent: { key } }) => handleOtpKeyPress(key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                ))}
              </View>
              {otpError ? <Text style={styles.fieldError}>{otpError}</Text> : null}
              <AppButton
                title="Xác nhận mã"
                onPress={() => void handleVerifyOtp()}
                loading={loading}
              />
              <Pressable
                style={styles.resendBtn}
                onPress={() => void handleSendOtp()}
                disabled={loading}
              >
                <Text style={styles.resendText}>Gửi lại mã</Text>
              </Pressable>
            </>
          )}

          {/* ── Bước 3: Mật khẩu mới ─────────────────── */}
          {step === "newPassword" && (
            <>
              <AppInput
                label="Mật khẩu mới"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); if (passwordError) setPasswordError(""); }}
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
                autoFocus
              />
              <AppInput
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); if (passwordError) setPasswordError(""); }}
                secureTextEntry
                placeholder="Nhập lại mật khẩu"
                error={passwordError}
              />
              <AppButton
                title="Đặt mật khẩu mới"
                onPress={() => void handleUpdatePassword()}
                loading={loading}
              />
            </>
          )}
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
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
    position: "absolute", top: -70, right: -50,
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: "#fde68a",
  },
  bgOrbBottom: {
    position: "absolute", bottom: -95, left: -65,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: "#dbeafe",
  },
  backBtn: {
    alignSelf: "flex-start", marginBottom: 14,
    paddingVertical: 6, paddingHorizontal: 2,
  },
  backText: { color: COLORS.blue, fontSize: 14, fontWeight: "700" },

  stepRow: {
    flexDirection: "row", gap: 8, marginBottom: 20, alignSelf: "flex-start",
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.blue, width: 24 },
  stepDotDone: { backgroundColor: COLORS.income },

  hero: { marginBottom: 18, gap: 8 },
  badge: {
    alignSelf: "flex-start", backgroundColor: "#fef3c7", color: "#92400e",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    fontSize: 12, fontWeight: "700", letterSpacing: 0.2,
  },
  title: { fontSize: 30, fontWeight: "800", color: "#0f172a", lineHeight: 36 },
  subtitle: { color: "#475569", lineHeight: 22, fontSize: 15 },

  card: { borderRadius: 22, padding: 20, borderColor: "#dbe5f0" },

  // OTP
  otpHint: { color: COLORS.muted, fontSize: 13, marginBottom: 16, textAlign: "center" },
  otpEmail: { color: COLORS.blue, fontWeight: "700" },
  otpRow: {
    flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 16,
  },
  otpBox: {
    width: 46, height: 56, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    textAlign: "center", fontSize: 22, fontWeight: "900",
    color: COLORS.text, backgroundColor: COLORS.white,
  },
  otpBoxError: { borderColor: COLORS.expense },
  fieldError: {
    color: COLORS.expense, fontSize: 13, fontWeight: "700",
    marginBottom: 10, textAlign: "center",
  },
  resendBtn: { alignSelf: "center", marginTop: 14, paddingVertical: 6 },
  resendText: { color: COLORS.blue, fontWeight: "700", fontSize: 14 },

  errorBanner: {
    backgroundColor: COLORS.expenseSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.expenseBorder,
  },
  errorText: { color: COLORS.expense, fontSize: 13, fontWeight: "700" },
});
