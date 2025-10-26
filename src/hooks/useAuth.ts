import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AuthState = {
  ready: boolean;           // 초기 확인 완료 여부
  session: Session | null;  // supabase 세션
  user: User | null;        // 편의상 user 추출
};

export default function useAuth(): AuthState {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1) 앱 시작 시, localStorage에 저장된 세션을 즉시 읽어 상태에 반영
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[auth] getSession error:", error.message);
        }
        if (!mounted) return;
        setSession(data.session ?? null);
      } catch (e) {
        console.warn("[auth] getSession exception:", e);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    // ✅ 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
      setReady(true);
    });

    // ✅ 해제
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    ready,
    session,
    user: session?.user ?? null,
  };
}
