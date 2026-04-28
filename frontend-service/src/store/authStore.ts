import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  is_ready: boolean;
  setSession: (session: Session | null) => void;
  setReady: (is_ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  is_ready: false,
  setSession: (session: Session | null) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setReady: (is_ready: boolean) => set({ is_ready }),
}));
