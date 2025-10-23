// src/components/TopNav.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TopNav() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [moreOpen, setMoreOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMoreOpen(true);
  };
  const scheduleClose = (ms = 180) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMoreOpen(false);
      closeTimer.current = null;
    }, ms);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      setEmail(user?.email ?? null);
      setDisplayName(
        (user?.user_metadata?.name ||
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0]) ?? null
      );
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await init();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // ---- unified styles ----
  const iconBtn =
    "inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs md:text-sm text-slate-700 hover:bg-slate-50";
  const tabBase =
    "rounded-xl border border-slate-300 px-3 py-1.5 text-sm transition-colors";
  const tabActive =
    "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600 hover:text-white";
  const tabIdle = "bg-white hover:bg-slate-50";
  const tabLocked = "opacity-60 cursor-pointer";

  const goOrAuth = (to: string) => {
    if (email) navigate(to);
    else navigate(`/auth?next=${encodeURIComponent(to)}`);
  };

  const Tab = ({
    to,
    children,
    locked = false,
    end = false,
  }: {
    to: string;
    children: React.ReactNode;
    locked?: boolean;
    end?: boolean;
  }) =>
    locked ? (
      <button
        className={`${tabBase} ${tabLocked}`}
        onClick={() => goOrAuth(to)}
        title="로그인 후 이용 가능"
      >
        🔒 {children}
      </button>
    ) : (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `${tabBase} ${isActive ? tabActive : tabIdle}`
        }
      >
        {children}
      </NavLink>
    );

  const authed = !!email;

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4">
        {/* Row 1: 브랜드 / 유저 */}
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
                <div className="truncate text-sm font-medium text-slate-800">
                  {displayName}
                </div>
                <div className="truncate text-xs text-slate-500">{email}</div>
              </div>
            )}

            {authed ? (
              <>
                <NavLink to="/guide" className={iconBtn} title="루틴 가이드" aria-label="루틴 가이드">
                  📘 <span className="hidden md:inline">가이드</span>
                </NavLink>
                <NavLink to="/settings" className={iconBtn} title="설정" aria-label="설정">
                  ⚙️ <span className="hidden md:inline">설정</span>
                </NavLink>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/auth");
                  }}
                  className={iconBtn}
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  🚪 <span className="hidden md:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className={iconBtn}
                title="로그인"
                aria-label="로그인"
              >
                🔐 <span className="hidden md:inline">로그인</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: 내비 탭 */}
        <div className="flex items-center gap-1 pb-3">
          <Tab to="/" end>홈</Tab>
          <Tab to="/goals" locked={!authed}>목표</Tab>
          <Tab to="/todos" locked={!authed}>할 일</Tab>
          <Tab to="/contacts" locked={!authed}>안부</Tab>

          {/* 더보기 */}
          <div
            className="relative ml-1"
            onPointerEnter={openMenu}
            onPointerLeave={() => scheduleClose(200)}
          >
            <button
              className={`${tabBase} ${tabIdle}`}
              onClick={() => (moreOpen ? setMoreOpen(false) : openMenu())}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              더보기 ▾
            </button>

            {moreOpen && (
              <>
                <div
                  aria-hidden
                  className="absolute left-0 top-full h-1 w-full"
                  onPointerEnter={openMenu}
                  onPointerLeave={() => scheduleClose(200)}
                />
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[220px] rounded-2xl border border-slate-300 bg-white p-2 text-sm shadow-xl"
                  onPointerEnter={openMenu}
                  onPointerLeave={() => scheduleClose(150)}
                >
                  {[
                    // 📘 루틴 가이드는 상단 아이콘으로 이동했으므로 목록에서 제거
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
                        className="block rounded-xl px-3 py-1.5 hover:bg-slate-50"
                        onClick={() => setMoreOpen(false)}
                      >
                        {label}
                      </NavLink>
                    ) : (
                      <button
                        key={to}
                        className="block w-full rounded-xl px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          setMoreOpen(false);
                          goOrAuth(to);
                        }}
                        title="로그인 후 이용 가능"
                      >
                        🔒 {label}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
