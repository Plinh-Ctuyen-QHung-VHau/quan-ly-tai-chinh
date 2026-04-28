export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  full_name: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}
