import { supabase } from "./supabaseClient";
import { AuthCredentials, RegisterPayload } from "../types/auth";

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
          full_name: payload.fullName,
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw mapAuthError(error);
    }

    return data.session;
  } catch (error) {
    throw mapAuthError(error);
  }
}
