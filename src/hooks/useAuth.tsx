import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  session: null,
  user: null,
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
      // 이벤트가 발생했다는 것 자체가 로드 완료 의미를 내포함
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
    }),
    [ready, session]
  );

  return <AuthContext.Provider value={ value }> { children } </AuthContext.Provider>;
}

export default function useAuth() {
  return useContext(AuthContext);
}
