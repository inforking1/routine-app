// src/pages/SettingsPage.tsx
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import AuthCard from "../components/AuthCard";
import SectionCard from "../components/SectionCard";
import CarePing from "../components/CarePing";

type Props = {
  onHome: () => void;
};

export default function SettingsPage({ onHome }: Props) {
  const navigate = useNavigate();

  return (
    <PageShell title="설정" onHome={onHome}>
      {/* 🔐 로그인/계정 관리 */}
      <AuthCard />

      {/* 루틴 관리 Link */}
      <SectionCard title="루틴 관리" subtitle="매일의 아침/저녁 루틴을 설정합니다" className="!h-auto !min-h-0 self-start p-3 md:p-4 mt-4">
        <button
          onClick={() => navigate('/routines')}
          className="h-10 w-full rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          루틴 관리 페이지로 이동
        </button>
      </SectionCard>

      {/* Care Ping (Only visible if set up, serves as a hidden debug or feature) */}
      {/* If you want to keep CarePing as a hidden/dev feature or normal feature, you can place it here. 
          Assuming we keep it minimal. */}

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">
          Routine App v1.0.0<br />
          &copy; 2025 All rights reserved.
        </p>
      </div>
    </PageShell>
  );
}
