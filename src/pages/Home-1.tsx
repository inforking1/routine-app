// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import MindTrigger from "../components/MindTrigger";
import SectionCard from "../components/SectionCard";
import MeditationOfTheDay from "../components/MeditationOfTheDay";
import NewsFeed from "../components/NewsFeed";
import CarePing from "../components/CarePing";
import useAuth from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import AuthCard from "../components/AuthCard";
import {
  createSource,
  Todo as DbTodo,
  Anniversary as DbAnniversary,
  Gratitude as DbGratitude,
} from "../utils/dataSource";
import type { View } from "../types";
import PageShell from "../components/PageShell";

/* ===== 날짜 유틸 ===== */
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}
function nextOccurrenceDate(ymd: string, today: Date) {
  const d = parseYMD(ymd);
  const y = today.getFullYear();
  const thisYear = new Date(y, d.getMonth(), d.getDate());
  const todayDate = new Date(y, today.getMonth(), today.getDate());
  if (d.getFullYear() > y) return d;
  if (thisYear >= todayDate) return thisYear;
  return new Date(y + 1, d.getMonth(), d.getDate());
}
function ddayLabel(iso?: string | null) {
  if (!iso) return null;
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const b = new Date((iso.length > 10 ? iso : iso + "T00:00:00")).getTime();
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff < 0) return `D+${Math.abs(diff)}`;
  return `D-${diff}`;
}

/* ===== 프리뷰 ===== */
function TodosPreview({ userId }: { userId?: string }) {
  const [items, setItems] = useState<DbTodo[]>([]);
  useEffect(() => {
    if (!userId) return;
    const src = createSource(userId);
    (async () => {
      const r = await src.listTodos(3);
      r.sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (
    
a.order ?? 0) - (b.order ?? 0);
      });
      setItems(r);
    })();
  }, [userId]);
  return items.length ? (
    <ul className="divide-y divide-slate-100 text-sm">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between py-2">
          <span className="truncate">{t.text}</span>
          {t.due && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {ddayLabel(t.due)}
            </span>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">표시할 항목이 없습니다.</p>
  );
}

function AnniversariesPreview({ userId }: { userId: string }) {
  const [items, setItems] = useState<DbAnniversary[]>([]);
  useEffect(() => {
    const src = createSource(userId);
    (async () => setItems(await src.listAnniversaries(50)))();
  }, [userId]);
  const today = new Date();
  const upcoming3 = useMemo(() => {
    return items
      .map((it) => ({ it, next: nextOccurrenceDate(it.date, today) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 3);
  }, [items]);
  return upcoming3.length ? (
    <ul className="divide-y divide-slate-100 text-sm">
      {upcoming3.map(({ it }) => (
        <li key={it.id} className="flex items-center justify-between py-2">
          <span className="truncate">{it.title}</span>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {ddayLabel(it.date)}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">다가오는 기념일이 없습니다.</p>
  );
}

/* ===== 목표 프리뷰 ===== */
type DbGoal = {
  id: string;
  user_id: string;
  text: string;
  progress: number;
  term: "short" | "mid" | "long";
  start_date?: string | null;
  end_date?: string | null;
};

function GoalsPreview({ userId }: { userId: string }) {
  const [byTerm, setByTerm] = useState<
    Record<"short" | "mid" | "long", DbGoal | null>
  >({ short: null, mid: null, long: null });

  useEffect(() => {
    (async () => {
      const { data: picks } = await supabase
        .from("goal_picks")
        .select("term,goal_id")
        .eq("user_id", userId);

      const ids = (picks ?? []).map((p: any) => p.goal_id).filter(Boolean);
      if (ids.length === 0) return;

      const { data: goals } = await supabase
        .from("goals")
        .select("id,user_id,text,progress,term,start_date,end_date")
        .in("id", ids);

      const map: Record<"short" | "mid" | "long", DbGoal | null> = {
        short: null,
        mid: null,
        long: null,
      };
      (goals ?? []).forEach((g: any) => {
        map[g.term as "short" | "mid" | "long"] = g as DbGoal;
      });
      setByTerm(map);
    })();
  }, [userId]);

  const rows: Array<{ label: string; g: DbGoal | null }> = [
    { label: "단기목표", g: byTerm.short },
    { label: "중기목표", g: byTerm.mid },
    { label: "장기목표", g: byTerm.long },
  ];

  return (
    <div className="divide-y divide-slate-100 text-sm text-slate-700">
      {rows.map(({ label, g }) => (
        <div key={label} className="flex items-center justify-between py-2">
          <span>
            {label} :{" "}
            <span className="font-medium text-slate-900">
              {g?.text ?? "목표 미설정"}
            </span>
          </span>
          <span className="text-xs text-slate-500">({g?.progress ?? 0}%)</span>
        </div>
      ))}
    </div>
  );
}

/* ===== 버킷/감사 ===== */
type DbBucketItem = {
  id: string;
  user_id: string;
  title: string;
  done: boolean | null;
  created_at: string;
};

function BucketPreview({ userId }: { userId: string }) {
  const [items, setItems] = useState<DbBucketItem[]>([]);
  useEffect(() => {
    (async () => {
      const { data: picks } = await supabase
        .from("bucket_picks")
        .select("item_id,created_at")
        .eq("user_id", userId);
      const ids = (picks ?? []).map((p: any) => p.item_id as string).slice(0, 3);
      if (ids.length === 0) return setItems([]);
      const { data: rows } = await supabase
        .from("bucket_items")
        .select("id,user_id,title,done,created_at")
        .in("id", ids);
      const byId: Record<string, DbBucketItem> = {};
      (rows ?? []).forEach((r: any) => (byId[r.id] = r as DbBucketItem));
      setItems(ids.map((id) => byId[id]).filter(Boolean).slice(0, 3));
    })();
  }, [userId]);

  return items.length ? (
    <ul className="divide-y divide-slate-100 text-sm">
      {items.map((b) => (
        <li key={b.id} className="py-2">
          {b.title}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">
      홈에 표시할 버킷을 아직 선택하지 않았어요. ★로 최대 3개 선택!
    </p>
  );
}

function GratitudePreview({ userId }: { userId: string }) {
  const [items, setItems] = useState<DbGratitude[]>([]);
  useEffect(() => {
    const src = createSource(userId);
    (async () => {
      const r = await src.listGratitude(3);
      r.sort((a, b) => {
        const ad =
          (a.date ?? a.created_at.slice(0, 10)) + " " + a.created_at;
        const bd =
          (b.date ?? b.created_at.slice(0, 10)) + " " + b.created_at;
        return bd.localeCompare(ad);
      });
      setItems(r.slice(0, 3));
    })();
  }, [userId]);

  const getDisplayDate = (g: DbGratitude) =>
    g.date ?? g.created_at.slice(0, 10);

  return items.length ? (
    <ul className="divide-y divide-slate-100 text-sm">
      {items.map((g) => (
        <li key={g.id} className="flex items-center gap-3 py-2">
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {getDisplayDate(g)}
          </span>
          <span className="truncate">{g.text}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500">오늘의 감사가 아직 없어요.</p>
  );
}

/* ===== 메인 (Home 컴포넌트) ===== */
type HomeProps = { onNavigate: (v: View) => void };

export default function Home({ onNavigate }: HomeProps) {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;
  const ready: boolean = (auth?.ready ?? false) as boolean;

  const [bootReady, setBootReady] = useState<boolean>(false);

  useEffect(() => {
    if (!bootReady) {
      const t = window.setTimeout(() => setBootReady(true), 2000);
      return () => window.clearTimeout(t);
    }
  }, [bootReady]);

  useEffect(() => {
    // useAuth 훅이 늦게 ready를 올리더라도, 홈에서 1회 세션 확인 후 전진
    if (auth?.ready) {
      setBootReady(true);
      return;
    }
    (async () => {
      await supabase.auth.getSession(); // 실패/성공 상관없이 화면 고착 방지
      setBootReady(true);
    })();
  }, [auth?.ready]);

  const isReady = ready || bootReady;

  if (!isReady) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border bg-white p-6 text-center text-slate-500 shadow-sm">
          로딩 중…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <SectionCard
          title="시작하기"
          subtitle="로그인 후 개인화 데이터가 표시됩니다"
          
          >

          <div id="auth-card">
            <AuthCard />
          </div>
        </SectionCard>
      </div>
    );
  }

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "사용자";
  return (
    <PageShell showHeader={false}>
    <div className="mx-auto max-w-3xl xl:max-w-6xl space-y-6">
      {/* 상단 인사 배너 */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-sm text-slate-600">
            안녕하세요, <span className="font-medium text-slate-900">{displayName}</span>님
          </p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">
            오늘의 작은 루틴으로 큰 변화를 시작해볼까요?
          </p>
        </div>
        <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl shadow">
          🌱
        </div>
      </div>

      {/* 오늘의 다짐 — 아래 섹션과의 여백 추가 (PC에서 더 여유 있게) */}
      <MindTrigger className="mb-4 md:mb-5 xl:mb-6" onManage={() => onNavigate("pledges")} />

      {/* 섹션 카드들 — PC에서 3열, 카드들은 상단 정렬 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
        <SectionCard
          title="나의 목표"
          subtitle="단기 · 중기 · 장기"
          
          actionLabel="목표 관리"
          onAction={() => onNavigate("goals")}
        >
          <GoalsPreview userId={user.id} />
        </SectionCard>

        <SectionCard
          title="오늘의 명상"
          subtitle="짧게 읽고 바로 실천"
          
          actionLabel="명상 보기"
          onAction={() => onNavigate("meditation")}
        >
          <MeditationOfTheDay variant="inline" className="mt-1" />
        </SectionCard>

        <SectionCard
          title="오늘의 할 일 (Top 3)"
          subtitle="핵심만 실행"
          
          actionLabel="할 일 관리"
          onAction={() => onNavigate("todos")}
        >
          <TodosPreview userId={user.id} />
        </SectionCard>

        <SectionCard
          title="기념일 챙기기"
          subtitle="다가오는 일정"
          
          actionLabel="기념일 관리"
          onAction={() => onNavigate("anniversaries")}
        >
          <AnniversariesPreview userId={user.id} />
        </SectionCard>

        <SectionCard
          title="주요 뉴스"
          subtitle="타이틀만 빠르게"
          
          actionLabel="뉴스 보기"
          onAction={() => onNavigate("news")}
        >
          <div className="text-sm text-slate-700">
            <NewsFeed
              feeds={[
                "https://www.hankyung.com/feed/economy",
                "https://www.hankyung.com/feed/finance",
                "https://biz.chosun.com/rss.xml",
                "https://www.mk.co.kr/rss/30100041/",
                "https://www.edaily.co.kr/rss/news/economy.xml",
              ]}
              limit={6}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="안부·연락처"
          subtitle="오늘 3명에게 안부"
          
          actionLabel="연락처 관리"
          onAction={() => onNavigate("contacts")}
        >
          <div className="text-sm [&_h2]:hidden [&_h3]:hidden [&_button]:text-[11px] [&_button]:px-2 [&_button]:py-1">
            <CarePing />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            팁: 미연락 기간/중요도/다가오는 기념일 기준으로 추천돼요.
          </p>
        </SectionCard>

        <SectionCard
          title="리워드 미션"
          subtitle="연속 7일 루틴"
          
          actionLabel="미션 보기"
          onAction={() => onNavigate("mission")}
        >
          <p className="text-sm text-slate-700">
            7일 연속 완료 시 스탬프가 쌓입니다 🎁
            <br />
            <span className="text-xs text-slate-500">3개 모이면 커피 쿠폰 자동 지급!</span>
          </p>
        </SectionCard>

        <SectionCard
          title="나의 버킷리스트"
          subtitle="홈 선택 3개"
          
          actionLabel="버킷 관리"
          onAction={() => onNavigate("bucket")}
        >
          <BucketPreview userId={user.id} />
        </SectionCard>

        <SectionCard
          title="감사일기"
          subtitle="최근 3개"
          
          actionLabel="감사일기 보기"
          onAction={() => onNavigate("gratitude")}
        >
          <GratitudePreview userId={user.id} />
        </SectionCard>
      </div>
    </div>
      </PageShell>
  );
}