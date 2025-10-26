// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/** 해시(#)가 두 번일 때도 동작: 마지막 # 뒤만 파싱 */
function readHashParams(): Record<string, string> {
  const raw = window.location.href; // 전체 URL
  const frag = raw.includes("#") ? raw.slice(raw.lastIndexOf("#") + 1) : "";
  const params = new URLSearchParams(frag);
  const obj: Record<string, string> = {};
  params.forEach((v, k) => (obj[k] = v));
  return obj;
}

/** onAuthStateChange(or 즉시 getSession)으로 '실제 세션 로드'가 확인될 때까지 대기 */
function waitForSession(timeoutMs = 2000) {
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };

    // 1) 이벤트 대기
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        sub.subscription.unsubscribe();
        done(true);
      }
    });

    // 2) 이미 세션이 생긴 상황(이벤트 선발행) 대비: 즉시 확인
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        sub.subscription.unsubscribe();
        done(true);
      }
    });

    // 3) 안전 타임아웃
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      sub.subscription.unsubscribe();
      done(!!data.session);
    }, timeoutMs);
  });
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) 해시에서 액세스 토큰 직접 추출 (HashRouter 환경 대응)
        const h = readHashParams();
        const access_token = h["access_token"];
        const refresh_token = h["refresh_token"];

        // 2) 토큰이 있으면 setSession, 없으면 PKCE 코드 교환 시도
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.warn("[callback] setSession error:", error.message);
          }
        } else {
          // PKCE(code) 플로우로 들어온 경우 대응 (쿼리스트링 기반)
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            // 코드가 없거나 실패해도, 이 시점에서 바로 /auth로 보내지 않고
            // 아래 waitForSession 결과를 보고 최종 판단(루프 방지)
            console.warn("[callback] exchangeCodeForSession error:", error.message);
          }
        }

        // 3) ✅ 여기서 '세션이 실제로 로드될 때까지' 대기 — 이동 금지
        const ok = await waitForSession(2500);

        if (!mounted) return;

        // 4) 최종 이동 (성공/실패 모두 window.location.replace로 통일)
        if (ok) {
          window.location.replace("#/");        // 홈
        } else {
          window.location.replace("#/auth");    // 로그인 화면
        }
      } catch (e) {
        console.warn("[callback] exception:", e);
        if (!mounted) return;
        window.location.replace("#/auth");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-[60vh] place-content-center">
      <div className="mx-auto text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">로그인 처리 중…</p>
      </div>
    </div>
  );
}
