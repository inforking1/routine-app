// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("로그인 처리 중…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 0) Hash에 access_token이 붙은(Implicit) 케이스 우선 처리
        // 예: #/auth/callback#access_token=...&refresh_token=...
        const rawHash = window.location.hash || "";
        if (rawHash.includes("access_token=")) {
          // 마지막 # 뒤의 "access_token=...&refresh_token=..." 부분만 추출
          const frag = rawHash.slice(rawHash.lastIndexOf("#") + 1);
          const sp = new URLSearchParams(frag);
          const access_token = sp.get("access_token");
          const refresh_token = sp.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;

            // 토큰이 주소에 남지 않도록 정리
            const origin = window.location.origin;
            const base = (import.meta as any).env?.BASE_URL || "/";
            const clean = `${origin}${base}#/auth/callback`;
            window.history.replaceState({}, "", clean);
          }
        }

        // 1) PKCE 케이스( ?code=... )도 대응 (href 전체를 넘겨 처리하는 게 가장 안전)
        if (window.location.href.includes("?code=") && "exchangeCodeForSession" in supabase.auth) {
          // @ts-ignore - 런타임에서 존재
          await supabase.auth.exchangeCodeForSession(window.location.href);

          // 주소창 정리
          const origin = window.location.origin;
          const base = (import.meta as any).env?.BASE_URL || "/";
          const clean = `${origin}${base}#/auth/callback`;
          window.history.replaceState({}, "", clean);
        }

        // 2) 최종 세션 확인
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setMsg("세션을 찾지 못했습니다. 다시 로그인 해 주세요.");
          return;
        }

        if (cancelled) return;

        // 3) 로그인 전에 저장한 next 경로가 있으면 우선
        const raw = sessionStorage.getItem("post_login_next") || "/";
        sessionStorage.removeItem("post_login_next");

        // 해시 라우팅 이동
        const cleaned = raw.replace(/^\/+/, "");
        window.location.hash = cleaned ? `#/${cleaned}` : "#/";
      } catch (e: any) {
        setMsg(e?.message ?? "로그인 처리 중 오류가 발생했습니다.");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border p-6 text-sm text-slate-600">
      {msg}
    </div>
  );
}
