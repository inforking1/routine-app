// src/components/PageShell.tsx
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PageShell({ title, children, onHome, showHeader = true }: { title?: string; children: ReactNode; onHome?: () => void; showHeader?: boolean; }) {
  const [session, setSession] = useState<
    | null
    | NonNullable<
      Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    >
  >(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setInitLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!alive) return;
      setSession(sess ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="grid gap-6">
      {/* ✅ SectionCard 스타일의 상단 타이틀 박스 */}
      {showHeader && (title || onHome) && (
        <div className="mx-2 md:mx-0 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {onHome && (
              <button
                onClick={onHome}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span>←</span>
                <span>홈으로</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div className="grid gap-4 min-w-0">
        {initLoading ? (
          <div className="mx-2 md:mx-0 rounded-2xl border bg-white/70 p-6 text-center text-slate-600">
            로딩 중…
          </div>
        ) : session ? (
          <div className="min-w-0">
            {children}
          </div>
        ) : (
          <div className="mx-2 md:mx-0 rounded-2xl border bg-white/70 p-6 text-slate-700">
            <p className="text-sm">
              홈 &gt; 로그인/회원가입을 먼저 진행해 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
