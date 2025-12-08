// src/components/TopNav.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function TopNav() {
  const navigate = useNavigate();
  // ✅ useAuth 컨텍스트 사용
  const { user } = useAuth();

  // 상태 동기화 useEffect 제거하고 직접 파생 (Render-time derivation)
  const authed = !!user;
  const email = user?.email ?? null;
  const displayName = user ? (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] || null
  ) : null;

  // ▼ 심플한 클릭 토글 방식 (Hover 제거)
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 메뉴 바깥 클릭 감지
  useEffect(() => {
    if (!moreOpen) return;
    const onClickOutside = (e: Event) => {
      // 메뉴 내부 클릭이면 닫지 않음 (단, Link 클릭 시엔 Link 내부에서 닫음 처리)
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    // pointerdown 대신 mousedown/touchstart 사용 (호환성)
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, [moreOpen]);

  const toggleMenu = () => setMoreOpen((prev) => !prev);
  const closeMenu = () => setMoreOpen(false);

  const iconBtn =
    "inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs md:text-sm text-slate-700 hover:bg-slate-50";
  const tabBase =
    "rounded-xl border border-slate-300 px-3 py-1.5 text-sm transition-colors";
  const tabActive =
    "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600 hover:text-white";
  const tabIdle = "bg-white hover:bg-slate-50";
  const tabLocked = "opacity-60 cursor-pointer";

  const goOrAuth = (to: string) => {
    if (authed) navigate(to);
    else navigate(`/auth?next=${encodeURIComponent(to)}`);
  };

  const Tab = ({
    to, children, locked = false, end = false,
  }: { to: string; children: React.ReactNode; locked?: boolean; end?: boolean }) =>
    locked ? (
      <button className={`${tabBase} ${tabLocked}`} onClick={() => goOrAuth(to)} title="로그인 후 이용 가능">
        🔒 {children}
      </button>
    ) : (
      <NavLink to={to} end={end} className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}>
        {children}
      </NavLink>
    );

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between py-3">
          <button onClick={() => navigate("/")} className="group text-left" aria-label="홈으로">
            <div className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-slate-900">
              성공을 부르는 루틴
            </div>
            <div className="text-xs text-slate-500">당신의 루틴을 시작하세요.</div>
          </button>

          <div className="flex items-center gap-2">
            {authed && (
              <div className="hidden text-right leading-tight sm:block">
                <div className="truncate text-sm font-medium text-slate-800">{displayName}</div>
                <div className="truncate text-xs text-slate-500">{email}</div>
              </div>
            )}
            {authed ? (
              <>
                <NavLink to="/guide" className={iconBtn} title="루틴 가이드" aria-label="루틴 가이드">📘 <span className="hidden md:inline">가이드</span></NavLink>
                <NavLink to="/settings" className={iconBtn} title="설정" aria-label="설정">⚙️ <span className="hidden md:inline">설정</span></NavLink>
                <button
                  onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
                  className={iconBtn}
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  🚪 <span className="hidden md:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/auth")} className={iconBtn} title="로그인" aria-label="로그인">
                🔐 <span className="hidden md:inline">로그인</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tabs + 더보기 */}
        <div className="flex items-center gap-1 pb-3">
          <Tab to="/" end>홈</Tab>
          <Tab to="/goals" locked={!authed}>목표</Tab>
          <Tab to="/todos" locked={!authed}>할 일</Tab>
          <Tab to="/contacts" locked={!authed}>안부</Tab>

          {/* 더보기 */}
          <div ref={menuRef} className="relative ml-1">
            <button
              className={`${tabBase} ${moreOpen ? "bg-slate-100 ring-2 ring-slate-200" : tabIdle}`}
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              더보기 ▾
            </button>

            {moreOpen && (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[220px] origin-top-left animate-in fade-in slide-in-from-top-1 rounded-2xl border border-slate-300 bg-white p-2 text-sm shadow-xl"
              >
                {[
                  ["/meditation", "🧘 명상"],
                  ["/anniversaries", "🎉 기념일"],
                  ["/news", "📰 뉴스"],
                  ["/mission", "🎯 미션·혜택"],
                  ["/bucket", "⭐ 버킷리스트"],
                  ["/gratitude", "🙏 감사일기"],
                  ["/community", "🗣️ 커뮤니티"],
                ].map(([to, label]) =>
                  authed ? (
                    <NavLink
                      key={to}
                      to={to}
                      className="block rounded-xl px-3 py-2 hover:bg-slate-50"
                      onClick={closeMenu}
                    >
                      {label}
                    </NavLink>
                  ) : (
                    <button
                      key={to}
                      className="block w-full rounded-xl px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        closeMenu();
                        goOrAuth(to);
                      }}
                      title="로그인 후 이용 가능"
                    >
                      🔒 {label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
