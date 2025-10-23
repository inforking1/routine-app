// src/components/AuthCard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// 상단 import 아래 아무 곳에 헬퍼 추가
function buildRedirect(next: string | null | undefined) {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  const base = (import.meta as any).env?.BASE_URL || "/";
  // next가 "/"면 홈, 그 외엔 선행 "/" 제거 후 base 뒤에 붙임
  const cleaned = !next || next === "/" ? "" : String(next).replace(/^\//, "");
  // 쿼리스트링/해시도 그대로 동작하도록 cleaned 그대로 붙임
  return origin + base + "#/" + cleaned;
}

type View = "sign_in" | "sign_up";

export default function AuthCard() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] =
    useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
  const user = session?.user ?? null;

  const [view, setView] = useState<View>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 로그인 후 돌아갈 next (브라우저가 아닐 수 있는 환경 대비)
  const next = useMemo(() => {
    if (typeof window === "undefined") return "/";
    try {
      return new URLSearchParams(window.location.search).get("next") || "/";
    } catch {
      return "/";
    }
  }, []);

  useEffect(() => {
    let aborted = false;

    // 0) 안전 타임아웃: 드물게 인증 SDK가 응답을 안 주면 2초 뒤 강제 해제
    const safety = typeof window !== "undefined"
      ? window.setTimeout(() => !aborted && setLoading(false), 2000)
      : undefined;

    // 1) 최초 세션 확인
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (aborted) return;
        setSession(data.session ?? null);
      } catch {
        // 실패해도 로딩은 반드시 종료
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    // 2) 인증 상태 변화 구독
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (aborted) return;
      setSession(s ?? null);
      setLoading(false); // 구독으로도 로딩 종료 보장
    });

    return () => {
      aborted = true;
      try {
        sub.subscription.unsubscribe();
      } catch { /* no-op */ }
      if (typeof window !== "undefined" && safety) window.clearTimeout(safety);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    return (
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      user.phone ||
      user.id
    );
  }, [user]);

  const afterEmailFlow = () => {
    // 세션이 생기면 App에서 전환되지만, next가 있으면 바로 이동
    if (typeof window !== "undefined" && next && next !== "/") {
      window.location.assign(next);
    }
  };

  const handleEmailAuth = async () => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      if (view === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterEmailFlow();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("회원가입 완료! 이메일 인증 메일을 확인하세요.");
      }
    } catch (e: any) {
      setError(e?.message ?? "로그인 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      // ✅ 계정 선택 강제 (select_account)
      const queryParams: Record<string, string> = { prompt: "select_account" };
      if (email) queryParams.login_hint = email;

      const redirectTo = buildRedirect("/auth?reset=1");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams },
      });
      if (error) throw error;
      // 리다이렉트되므로 이후 처리는 필요 없음
    } catch (e: any) {
      setError(e?.message ?? "Google 로그인에 실패했습니다.");
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("비밀번호 재설정: 이메일을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = buildRedirect("/auth?reset=1");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setInfo("비밀번호 재설정 메일을 보냈습니다.");
    } catch (e: any) {
      setError(e?.message ?? "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message ?? "로그아웃 실패");
    } finally {
      setBusy(false);
    }
  };

  // ===== UI =====
  if (loading) {
    return (
      <div
        id="auth-card"
        className="mx-auto w-full max-w-[380px] rounded-3xl border bg-white/70 p-6 shadow-sm backdrop-blur"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">세션 확인 중…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div id="auth-card" className="mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl border bg-white shadow-lg">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
          <div className="text-xs/5 opacity-90">성공을 부르는 루틴</div>
          <div className="mt-1 text-lg font-semibold">환영합니다</div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-slate-500">사용자</div>
            <div className="truncate text-sm font-medium">{displayName}</div>
            {user.email && <div className="mt-1 truncate text-xs text-slate-500">{user.email}</div>}
            <div className="mt-1 truncate text-[11px] text-slate-400">UID: {user.id}</div>
          </div>

          {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

          <button
            onClick={handleSignOut}
            disabled={busy}
            className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-card" className="mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl border bg-white shadow-lg">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-6 text-white">
        <div className="text-xs/5 opacity-90">성공을 부르는 루틴</div>
        <div className="mt-1 text-xl font-semibold">
          {view === "sign_in" ? "로그인" : "회원가입"}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/20 p-1 text-sm" role="tablist" aria-label="인증 탭">
          <button
            onClick={() => setView("sign_in")}
            role="tab"
            aria-selected={view === "sign_in"}
            className={`rounded-lg py-2 transition ${view === "sign_in" ? "bg-white text-emerald-600" : "text-white/80"}`}
          >
            로그인
          </button>
          <button
            onClick={() => setView("sign_up")}
            role="tab"
            aria-selected={view === "sign_up"}
            className={`rounded-lg py-2 transition ${view === "sign_up" ? "bg-white text-emerald-600" : "text-white/80"}`}
          >
            회원가입
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}
        {info && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{info}</div>}

        <label className="mb-1 block text-xs text-slate-500">이메일</label>
        <div className="mb-3 flex items-center gap-2 rounded-2xl border px-3 py-2.5">
          <span className="text-slate-400" aria-hidden>✉️</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            className="w-full bg-transparent text-sm outline-none"
            autoComplete="email"
          />
        </div>

        <label className="mb-1 block text-xs text-slate-500">비밀번호</label>
        <div className="mb-1 flex items-center gap-2 rounded-2xl border px-3 py-2.5">
          <span className="text-slate-400" aria-hidden>🔒</span>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={view === "sign_in" ? "비밀번호" : "8자 이상 권장"}
            className="w-full bg-transparent text-sm outline-none"
            autoComplete={view === "sign_in" ? "current-password" : "new-password"}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-xs text-slate-500"
            title={showPw ? "숨기기" : "표시"}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
          >
            {showPw ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 underline underline-offset-2"
          >
            비밀번호 재설정
          </button>
        </div>

        <button
          onClick={handleEmailAuth}
          disabled={busy}
          className="h-12 w-full rounded-2xl bg-emerald-600 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          {view === "sign_in" ? "이메일로 로그인" : "이메일로 가입"}
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>또는</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="h-12 w-full rounded-2xl border bg-white text-sm font-medium transition active:scale-[0.99] disabled:opacity-50"
          aria-label="Google 계정으로 계속하기"
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-lg">🟢</span>
            Google로 계속하기
          </span>
        </button>

        <div className="mt-5 text-center text-xs text-slate-500">
          {view === "sign_in" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                className="font-medium text-emerald-700 underline underline-offset-2"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setView("sign_up");
                }}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button
                className="font-medium text-emerald-700 underline underline-offset-2"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setView("sign_in");
                }}
              >
                로그인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
