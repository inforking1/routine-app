// src/App.tsx
import { Routes, Route, useNavigate, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth, { AuthProvider } from "./hooks/useAuth";
import AuthCallback from "./pages/AuthCallback";
import InstallPWAButton from "./components/InstallPWAButton";
import TopNav from "./components/TopNav";
import AuthCard from "./components/AuthCard";
import Home from "./pages/Home";
import RoutineGuidePage from "./pages/RoutineGuide";
import GoalsPage from "./pages/GoalsPage";
import MeditationPage from "./pages/MeditationPage";
import TodosPage from "./pages/TodosPage";
import AnniversariesPage from "./pages/AnniversariesPage";
import ContactsPage from "./pages/ContactsPage";
import NewsPage from "./pages/NewsPage";
import MissionPage from "./pages/MissionPage";
import BucketList from "./pages/BucketList";
import Gratitude from "./pages/Gratitude";
import CommunityPage from "./pages/CommunityPage";
import SettingsPage from "./pages/SettingsPage";
import PledgesPage from "./pages/PledgesPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import AdminMissionsPage from "./pages/AdminMissionsPage";

type View =
  | "home" | "goals" | "todos" | "anniversaries" | "news" | "meditation"
  | "bucket" | "gratitude" | "mission" | "contacts" | "community"
  | "settings" | "pledges";

/* 가이드 섹션 */
function GuideInline() {
  return (
    <section className="mt-3 grid gap-3">
      <div className="rounded-2xl border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">성공을 부르는 루틴 가이드</h2>
        <p className="mt-1 text-sm text-slate-600">
          마음–행동–관계–보상–성찰의 5단계로 하루를 설계합니다. 아침엔 나를 세우고, 낮엔 세상을 관리하며, 밤엔 마음을 정리하세요.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border px-3 py-1">💭 마음 (Mind)</span><span>→</span>
          <span className="rounded-full border px-3 py-1">💪 행동 (Action)</span><span>→</span>
          <span className="rounded-full border px-3 py-1">🤝 관계 (Relation)</span><span>→</span>
          <span className="rounded-full border px-3 py-1">🎁 보상 (Reward)</span><span>→</span>
          <span className="rounded-full border px-3 py-1">🌙 성찰 (Reflection)</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-base font-semibold">1) 마음 — 하루의 방향</h4>
          <p className="text-sm text-slate-600">목표와 명상으로 정신을 정렬합니다. ‘오늘의 한 문장’으로 마음을 리셋하세요.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-base font-semibold">2) 행동 — 작은 실천의 누적</h4>
          <p className="text-sm text-slate-600">오늘 꼭 해야 할 3가지를 정하고 완료 체크로 성취감을 쌓습니다.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-base font-semibold">3) 관계 — 소중한 사람 챙기기</h4>
          <p className="text-sm text-slate-600">기념일/안부로 신뢰를 유지합니다. 추천 3명에 안부 완료 체크.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-base font-semibold">4) 보상 — 동기 부여의 순환</h4>
          <p className="text-sm text-slate-600">리워드 미션으로 재미와 보상을 더합니다. 루틴을 지킬수록 혜택 ↑</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
          <h4 className="text-base font-semibold">5) 성찰 — 오늘을 정리하고 내일 준비</h4>
          <p className="text-sm text-slate-600">감사일기 1~3줄로 하루를 마무리하세요. 작지만 꾸준한 성찰이 삶을 바꿉니다.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-base font-semibold">하루 UX 흐름</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li><span className="font-medium">아침</span> — 목표 요약 → 오늘의 명상/문구 → 오늘의 할 일</li>
          <li><span className="font-medium">낮</span> — 기념일 → 뉴스 → 안부/연락처 → 리워드 미션</li>
          <li><span className="font-medium">저녁</span> — 버킷리스트 점검 → 감사일기</li>
        </ul>
      </div>
    </section>
  );
}

/* 로그인 화면 컴팩트화 */
function AuthScreen() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">성공을 부르는 루틴</h1>
        </div>
        <div id="auth-card" className="mx-auto">
          <AuthCard />
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          계속 진행하면 서비스 약관과 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}

/** 🔒 비로그인 레이아웃: TopNav + 컨테이너  */
function UnauthedLayout({ isStandalone }: { isStandalone: boolean }) {
  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-6">
        <Outlet />
        {/* PWA 안내 박스 (설치 상태 아닐 때만) */}
        {!isStandalone && (
          <div className="mt-2 mx-auto w-full max-w-sm flex flex-col items-center rounded-2xl border border-gray-200 bg-white/60 p-3 shadow-sm backdrop-blur-md">
            <p className="mb-1 text-center text-sm text-gray-700 leading-snug">
              설치하시면 <span className="font-semibold text-blue-600">앱처럼 편리하게</span> 사용하실 수 있어요.
            </p>
            <InstallPWAButton />
          </div>
        )}
        <div className={isStandalone ? "mt-3" : "mt-2"}>
          <GuideInline />
        </div>
      </div>
    </>
  );
}

/** 🔐 로그인 레이아웃: TopNav + 컨테이너 */
function AuthedLayout() {
  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-6xl p-5 md:p-8">
        <Outlet />
      </div>
    </>
  );
}

/* 실제 앱 라우팅 로직 */
function AppContent() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [meditationNote, setMeditationNote] = useState<string>("");

  // ✅ PWA 설치 상태 감지
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    const check = () =>
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window as any).navigator?.standalone === true;
    setIsStandalone(check());
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const go = (view: View) => {
    const map: Record<View, string> = {
      home: "/", goals: "/goals", todos: "/todos", anniversaries: "/anniversaries",
      news: "/news", meditation: "/meditation", bucket: "/bucket", gratitude: "/gratitude",
      mission: "/mission", contacts: "/contacts", community: "/community",
      settings: "/settings", pledges: "/pledges",
    };
    navigate(map[view] ?? "/");
  };

  // ✅ 초기 세션 동기화 완료 전에는 어떤 레이아웃도 렌더하지 않음 (레이스 차단)
  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-content-center">
        <div className="mx-auto text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">계정 확인 중…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/*
        ✅ 콜백은 최상단에서 '단독 렌더'
        - TopNav/컨테이너/기타 라우팅이 함께 렌더되지 않도록 격리
        - 여기서 AuthCallback 내부가 세션을 확정시킨 뒤 홈으로 이동
      */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* 비로그인 영역 */}
      {!user && (
        <Route element={<UnauthedLayout isStandalone={isStandalone} />}>
          <Route
            path="*"
            element={
              <div className="mb-2">
                <AuthScreen />
              </div>
            }
          />
        </Route>
      )}

      {/* 로그인 영역 */}
      {user && (
        <Route element={<AuthedLayout />}>
          <Route path="/roles" element={<RoleManagementPage onHome={() => navigate("/")} />} />
          <Route path="/o/mission-console" element={<AdminMissionsPage />} />
          <Route path="/guide" element={<RoutineGuidePage />} />
          <Route path="/" element={<Home onNavigate={go} />} />
          <Route path="/goals" element={<GoalsPage onHome={() => navigate("/")} />} />
          <Route
            path="/meditation"
            element={<MeditationPage note={meditationNote} setNote={setMeditationNote} onHome={() => navigate("/")} />}
          />
          <Route path="/todos" element={<TodosPage onHome={() => navigate("/")} />} />
          <Route path="/anniversaries" element={<AnniversariesPage onHome={() => navigate("/")} />} />
          <Route path="/contacts" element={<ContactsPage onHome={() => navigate("/")} />} />
          <Route path="/news" element={<NewsPage onHome={() => navigate("/")} />} />
          <Route path="/mission" element={<MissionPage onHome={() => navigate("/")} />} />
          <Route path="/bucket" element={<BucketList onHome={() => navigate("/")} />} />
          <Route path="/gratitude" element={<Gratitude onHome={() => navigate("/")} />} />
          <Route path="/community" element={<CommunityPage onHome={() => navigate("/")} />} />
          <Route path="/settings" element={<SettingsPage onHome={() => navigate("/")} />} />
          <Route path="/pledges" element={<PledgesPage onBack={() => navigate("/")} />} />
          {/* 로그인 상태에서 /auth는 홈으로 돌려보냄 */}
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<div className="p-6 text-slate-600">페이지를 찾을 수 없습니다.</div>} />
        </Route>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
