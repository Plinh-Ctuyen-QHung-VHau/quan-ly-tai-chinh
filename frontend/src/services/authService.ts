import { supabase } from "./supabaseClient";
import { AuthCredentials, RegisterPayload } from "../types/auth";
import { updateNotificationSettings } from "./notificationApi";
import { setLoggingOut } from "./apiClient";
import { cancelPendingRefresh } from "../utils/dataInvalidation";

function mapAuthError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Xác thực thất bại. Vui lòng thử lại.");
  }

  const message = error.message || "";

  if (
    message.includes("Network request failed") ||
    message.includes("Failed to fetch")
  ) {
    return new Error("Không thể kết nối mạng. Vui lòng kiểm tra Internet và thử lại.");
  }

  if (message.includes("Invalid login credentials")) {
    return new Error("Email hoặc mật khẩu không đúng.");
  }

  if (message.toLowerCase().includes("email not confirmed")) {
    return new Error("Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư.");
  }

  return error;
}

export async function signIn(credentials: AuthCredentials) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      throw mapAuthError(error);
    }

    return data;
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function signUp(payload: RegisterPayload) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          emailRedirectTo: "exp://[IP_ADDRESS]",
        },
      },
    });

    if (error) {
      throw mapAuthError(error);
    }

    return data;
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function signOut(skipApiCall = false) {
  // Set flags NGAY ĐẦU — trước mọi async operation khác
  // để bỏ qua 401 từ bất kỳ request nào đang chạy ngầm
  setLoggingOut(true);
  cancelPendingRefresh();

  // Xóa push token khỏi DB trước khi đăng xuất
  // để tránh gửi thông báo nhầm khi user khác đăng nhập trên cùng thiết bị
  if (!skipApiCall) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await updateNotificationSettings({ push_token: null } as any);
      }
    } catch {
      // Không chặn đăng xuất nếu xóa token thất bại
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    setLoggingOut(false);
    throw error;
  }
}

/** Bước 1: Gửi mã OTP 6 số về email (dùng Reset Password template với {{ .Token }}) */
export async function sendPasswordResetOtp(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw mapAuthError(error);
}

/** Bước 2: Xác minh mã OTP 6 số từ email (type "recovery" cho reset password flow) */
export async function verifyPasswordResetOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (error) throw mapAuthError(error);
  return data.session;
}

/** Bước 3: Đặt mật khẩu mới (cần có session hợp lệ từ bước 2) */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw mapAuthError(error);
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (error.message && (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token"))) {
        return null;
      }
      throw mapAuthError(error);
    }

    return data.session;
  } catch (error: any) {
    if (error?.message && (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token"))) {
      return null;
    }
    throw mapAuthError(error);
  }
}
