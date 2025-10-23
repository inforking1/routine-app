import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/** -----------------------------------------------------------
 *  URL builder: 원하는 경로/쿼리를 그대로 반영해서 절대 URL 생성
 * ----------------------------------------------------------*/
function buildRedirect(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  const base = (import.meta as any).env?.BASE_URL || "/";
  const cleaned = path.replace(/^\//, ""); // 선행 "/" 제거
  const url = new URL(origin + base + cleaned);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** 로그인 후 이동 처리: URL ?next=, sessionStorage('post_login_next') 우선 사용 */
function afterEmailFlow(fallback: string = "/") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const nextFromQuery = url.searchParams.get("next");
  const nextFromSS = sessionStorage.getItem("post_login_next");
  const target = nextFromQuery || nextFromSS || fallback;
  // 한번 사용한 next는 소모
  if (nextFromSS) sessionStorage.removeItem("post_login_next");
  window.location.assign(target);
}

type Mode = "signin" | "signup" | "reset";

export default function AuthCard() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // 최초 진입 시 URL의 ?next= 값을 세션에 저장 (OAuth 이후 사용)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const qNext = u.searchParams.get("next");
    if (qNext) sessionStorage.setItem("post_login_next", qNext);
  }, []);

  // 세션 구독
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserEmail(data.session?.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === "signin") return email.trim().length > 3 && password.length >= 6;
    if (mode === "signup") return email.trim().length > 3 && password.length >= 6 && password === password2;
    if (mode === "reset") return email.trim().length > 3;
    return false;
  }, [busy, mode, email, password, password2]);

  async function handleSignIn(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      afterEmailFlow("/");
    } catch (e: any) {
      // 흔한 에러 한국어 매핑
      const msg =
        e?.status === 400 ? "이메일 또는 비밀번호를 확인해 주세요." :
        e?.status === 429 ? "잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)" :
        e?.message || "로그인 중 오류가 발생했습니다.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (password !== password2) {
        setErr("비밀번호 확인이 일치하지 않습니다.");
        return;
      }
      const emailRedirectTo = buildRedirect("auth/callback", { mode: "verify" });
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setMsg("가입 메일을 보냈습니다. 받은 편지함(스팸 포함)을 확인하고 이메일 인증을 완료해 주세요.");
      setMode("signin");
    } catch (e: any) {
      const msg =
        e?.status === 409 ? "이미 가입된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해 주세요." :
        e?.message || "회원가입 중 오류가 발생했습니다.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const redirectTo = buildRedirect("auth/callback", { mode: "reset" });
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setMsg("비밀번호 재설정 메일을 보냈습니다. 메일의 링크로 이동해 새 비밀번호를 설정하세요.");
      setMode("signin");
    } catch (e: any) {
      const msg = e?.message || "재설정 메일 발송 중 오류가 발생했습니다.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      setErr(null); setMsg(null); setBusy(true);
      // 현재 화면의 ?next=를 세션에 보관 (이미 저장되어 있으면 그대로 유지)
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        const qNext = u.searchParams.get("next");
        if (qNext) sessionStorage.setItem("post_login_next", qNext);
      }
      const redirectTo = buildRedirect("auth/callback", { provider: "google" });
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      // 이후는 리디렉트되므로 로컬 처리 없음
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message || "Google 로그인 중 오류가 발생했습니다.");
    }
  }

  async function handleSignOut() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      await supabase.auth.signOut();
      setMsg("로그아웃 되었어요.");
    } catch (e: any) {
      setErr(e?.message || "로그아웃 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // 이미 로그인된 경우: 간단한 프로필 카드
  if (userEmail) {
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">로그인 상태</h2>
          <p className="text-sm text-slate-600 mt-1">{userEmail}</p>
        </div>
        {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">{msg}</p>}
        {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700 text-sm">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => afterEmailFlow("/")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            홈으로
          </button>
          <button
            onClick={handleSignOut}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        {mode === "signin" && "로그인"}
        {mode === "signup" && "회원가입"}
        {mode === "reset" && "비밀번호 재설정"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">짧고 정확한 건강 루틴, 지금 시작해 보세요.</p>

      {msg && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">{msg}</p>}
      {err && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-rose-700 text-sm">{err}</p>}

      <form
        onSubmit={
          mode === "signin" ? handleSignIn :
          mode === "signup" ? handleSignUp :
          handleReset
        }
        className="mt-5 space-y-3"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">이메일</label>
          <input
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== "reset" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">비밀번호</label>
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">비밀번호 확인</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="비밀번호를 다시 입력"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              minLength={6}
              required
            />
            {(password && password2 && password !== password2) && (
              <p className="mt-1 text-xs text-rose-600">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {mode === "signin" && (busy ? "로그인 중..." : "이메일로 로그인")}
          {mode === "signup" && (busy ? "가입 중..." : "이메일로 가입")}
          {mode === "reset" && (busy ? "전송 중..." : "재설정 메일 보내기")}
        </button>

        {mode !== "reset" && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Google로 계속하기
          </button>
        )}
      </form>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        {mode !== "reset" ? (
          <button
            type="button"
            onClick={() => setMode("reset")}
            className="underline-offset-4 hover:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="underline-offset-4 hover:underline"
          >
            로그인으로 돌아가기
          </button>
        )}

        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="underline-offset-4 hover:underline"
          >
            아직 계정이 없으신가요? 가입하기
          </button>
        ) : mode === "signup" ? (
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="underline-offset-4 hover:underline"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        입력 즉시 자동 저장되지 않습니다. 가입·로그인 이후 언제든 설정에서 계정 삭제가 가능합니다.
      </p>
    </div>
  );
}
