import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; data: { user: User | null } }>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  session: null,
  user: null,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null, data: { user: null } }),
  signOut: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1) 초기 세션 확인
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn("[Auth] getSession error:", error.message);
      }
      setSession(data.session ?? null);
      setReady(true);
    });

    // 2) 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string) => {
    // 해시 라우터 지원을 위해 콜백 URL 명시
    const redirectUrl = window.location.origin + (import.meta.env.BASE_URL || "/") + "#/auth/callback";
    return await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const value = useMemo(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [ready, session]
  );

  return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>;
}

export default function useAuth() {
  return useContext(AuthContext);
}
