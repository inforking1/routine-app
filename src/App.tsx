// src/App.tsx
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "./hooks/useAuth";

// 상단 바
import TopNav from "./components/TopNav";

// 로그인 전 카드
import AuthCard from "./components/AuthCard";

// Pages
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
  | "home"
  | "goals"
  | "todos"
  | "anniversaries"
  | "news"
  | "meditation"
  | "bucket"
  | "gratitude"
  | "mission"
  | "contacts"
  | "community"
  | "settings"
  | "pledges";

function GuideInline() {
  return (
    <section className="mt-6 grid gap-4">
      <div className="rounded-2xl border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">성공을 부르는 루틴 가이드</h2>
        <p className="mt-1 text-sm text-slate-600">
          마음–행동–관계–보상–성찰의 5단계로 하루를 설계합니다. 아침엔 나를 세우고, 낮엔 세상을 관리하며, 밤엔 마음을 정리하세요.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border px-3 py-1">💭 마음 (Mind)</span>
          <span>→</span>
          <span className="rounded-full border px-3 py-1">💪 행동 (Action)</span>
          <span>→</span>
          <span className="rounded-full border px-3 py-1">🤝 관계 (Relation)</span>
          <span>→</span>
          <span className="rounded-full border px-3 py-1">🎁 보상 (Reward)</span>
          <span>→</span>
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

export default function App() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [meditationNote, setMeditationNote] = useState<string>("");

  const go = (view: View) => {
    const map: Record<View, string> = {
      home: "/",
      goals: "/goals",
      todos: "/todos",
      anniversaries: "/anniversaries",
      news: "/news",
      meditation: "/meditation",
      bucket: "/bucket",
      gratitude: "/gratitude",
      mission: "/mission",
      contacts: "/contacts",
      community: "/community",
      settings: "/settings",
      pledges: "/pledges",
    };
    navigate(map[view] ?? "/");
  };

  if (!ready) {
    return (
      <>
        <TopNav />
        <div className="grid min-h-[60vh] place-content-center">
          <div className="mx-auto text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">계정 확인 중…</p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-6xl p-5 md:p-8">
          <AuthScreen />
          <GuideInline />
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-6xl p-5 md:p-8">
        <Routes>
          <Route path="/roles" element={<RoleManagementPage onHome={() => navigate("/")} />} />
          <Route path="/o/mission-console" element={<AdminMissionsPage />} />
          <Route path="/guide" element={<RoutineGuidePage />} />
          <Route path="/" element={<Home onNavigate={go} />} />
          <Route path="/goals" element={<GoalsPage onHome={() => navigate("/")} />} />
          <Route
            path="/meditation"
            element={
              <MeditationPage
                note={meditationNote}
                setNote={setMeditationNote}
                onHome={() => navigate("/")}
              />
            }
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
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="*" element={<div className="p-6 text-slate-600">페이지를 찾을 수 없습니다.</div>} />
        </Routes>
      </div>
    </>
  );
}

function AuthScreen() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">성공을 부르는 루틴</h1>
          <p className="mt-1 text-slate-500 text-sm">당신의 루틴을 시작하세요.</p>
        </div>
        <div id="auth-card" className="mx-auto">
          <AuthCard />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          계속 진행하면 서비스 약관과 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
