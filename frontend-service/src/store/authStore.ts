import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  isReady: false,
  setSession: (session: Session | null) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setReady: (isReady: boolean) => set({ isReady }),
}));
