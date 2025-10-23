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

    // 1) 초기 세션 1회 확인
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      })
      .finally(() => {
        if (mounted) setReady(true); // ✅ 세션이 없어도 반드시 ready=true 로 전환
      });

    // 2) 인증 상태 변경 구독
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setReady(true); // ✅ 어떤 이벤트든 결론이 났다면 ready는 true 유지
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    ready,
    session,
    user: session?.user ?? null,
  };
}
