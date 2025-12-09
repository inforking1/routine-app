// === src/components/AuthCard.tsx ===
import { useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

/** 로그인 처리를 위한 헬퍼 */
function buildHashRedirect(path: string) {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin;
  const base = (import.meta as any).env?.BASE_URL || "/";
  // hash routing
  return `${origin}${base}#/${path.replace(/^\//, "")}`;
}

function afterEmailFlow() {
  if (typeof window === "undefined") return;
  const origin = window.location.origin;
  const base = (import.meta as any).env?.BASE_URL || "/";
  const u = new URL(window.location.href);
  const qNext = u.searchParams.get("next");
  const ssNext = sessionStorage.getItem("post_login_next");
  const rawTarget = qNext || ssNext || "";
  if (ssNext) sessionStorage.removeItem("post_login_next");

  const isAbs = /^https?:\/\//i.test(rawTarget);
  // 해시 라우터 기반 이동
  const dest = isAbs
    ? rawTarget
    : `${origin}${base}#/${rawTarget.replace(/^#?\//, "")}`;

  window.location.assign(dest);
}

// 이메일 정규식 (간단 버전)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "signup" | "reset";

export default function AuthCard() {
  const { signInWithEmail, signUpWithEmail, signOut, user } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 로그인 전 ?next= 파라미터 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const qNext = u.searchParams.get("next");
    if (qNext) sessionStorage.setItem("post_login_next", qNext);
  }, []);

  // 유효성 상태 계산
  const isValidEmail = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const isValidPw = password.length >= 6;
  const isPwMatch = password === password2;

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!isValidEmail) return false;
    if (mode === "reset") return true;
    // signin/signup
    if (!isValidPw) return false;
    if (mode === "signup" && !isPwMatch) return false;
    return true;
  }, [busy, mode, isValidEmail, isValidPw, isPwMatch]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) throw error;
      // 성공 시 리다이렉트
      afterEmailFlow();
    } catch (e: any) {
      if (e?.message?.includes("Invalid login credentials")) {
        setErr("이메일 또는 비밀번호가 일치하지 않습니다.");
      } else {
        setErr(e?.message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const { error } = await signUpWithEmail(email.trim(), password);
      if (error) throw error;
      setMsg("가입 확인 메일이 전송되었습니다. 메일함(스팸 포함)을 확인해주세요.");
      setMode("signin");
    } catch (e: any) {
      if (e?.message?.includes("already registered")) {
        setErr("이미 가입된 이메일입니다.");
      } else {
        setErr(e?.message || "회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;

    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const redirectTo = buildHashRedirect("auth/callback");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setMsg("비밀번호 재설정 메일을 보냈습니다.");
      setMode("signin");
    } catch (e: any) {
      setErr(e?.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const redirectTo = buildHashRedirect("auth/callback");
      // ?next 처리를 위해 현재 URL 파라미터 저장 로직은 useEffect가 수행했음
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message || "Google 로그인 실패");
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // 이미 로그인 된 상태라면?
  if (user) {
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">이미 로그인되었습니다</h2>
        <p className="text-slate-600 mb-4">{user.email}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => afterEmailFlow()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition"
          >
            홈으로 이동
          </button>
          <button
            onClick={handleSignOut}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-50 transition"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-1">
        {mode === "signin" && "로그인"}
        {mode === "signup" && "회원가입"}
        {mode === "reset" && "비밀번호 재설정"}
      </h2>
      <p className="text-sm text-slate-500 mb-6">성공을 위한 루틴, 오늘부터 시작하세요.</p>

      {/* 메시지 영역 */}
      {msg && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* 폼 영역 */}
      <form onSubmit={mode === "signin" ? handleSignIn : mode === "signup" ? handleSignUp : handleReset}>
        <div className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 transition"
              disabled={busy}
            // autoFocus
            />
            {email && !isValidEmail && (
              <p className="mt-1 text-xs text-rose-500">올바른 이메일 형식이 아닙니다.</p>
            )}
          </div>

          {/* Password (Reset 모드 제외) */}
          {mode !== "reset" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 입력"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 transition"
                disabled={busy}
              />
            </div>
          )}

          {/* Password Confirm (Signup 모드만) */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="비밀번호 다시 입력"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 transition"
                disabled={busy}
              />
              {password2 && !isPwMatch && (
                <p className="mt-1 text-xs text-rose-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                처리 중...
              </span>
            ) : (
              mode === "signin" ? "로그인" : mode === "signup" ? "회원가입" : "이메일 전송"
            )}
          </button>

          {/* Social Login (Reset 모드 제외) */}
          {mode !== "reset" && (
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Google로 계속하기
            </button>
          )}

        </div>
      </form>

      {/* Mode Switcher */}
      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-600">
        {mode === "signin" && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-start">
              <button
                onClick={() => setMode("reset")}
                className="py-2 text-sm text-slate-500 hover:text-slate-800 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>

            <div className="flex items-center justify-between py-2 text-sm text-slate-600">
              <span>아직 계정이 없으신가요?</span>
              <button
                onClick={() => setMode("signup")}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                가입하기
              </button>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <button onClick={() => setMode("signin")} className="hover:underline hover:text-slate-900">
            이미 계정이 있으신가요? <span className="font-semibold">로그인</span>
          </button>
        )}

        {mode === "reset" && (
          <button onClick={() => setMode("signin")} className="hover:underline hover:text-slate-900">
            로그인 화면으로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
