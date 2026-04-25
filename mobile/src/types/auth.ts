export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  fullName: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}
