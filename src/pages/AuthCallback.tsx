// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("로그인 처리 중…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // PKCE 코드 교환이 필요한 경우를 대비 (대부분 auto-detect지만 안전장치)
        if ("exchangeCodeForSession" in supabase.auth) {
          // @ts-ignore - 런타임에 존재
          await supabase.auth.exchangeCodeForSession();
        }

        // 세션 확인
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setMsg("세션을 찾지 못했습니다. 다시 로그인 해 주세요.");
          return;
        }

        if (cancelled) return;

        // 로그인 전에 저장한 next 가져오기
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
