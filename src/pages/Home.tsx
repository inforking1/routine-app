// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSource } from "../utils/dataSource";
import type { Todo, Anniversary, Gratitude } from "../utils/dataSource"; // Fixed type names
import { supabase } from "../lib/supabaseClient";
import useAuth from "../hooks/useAuth";
import PageShell from "../components/PageShell";
import MindTrigger from "../components/MindTrigger";
import SectionCard from "../components/SectionCard";
import MeditationOfTheDay from "../components/MeditationOfTheDay";
import NewsFeed from "../components/NewsFeed";
import CarePing from "../components/CarePing";
import RoutineCardMinimal from "../components/routine/RoutineCardMinimal";
// getSolarDateFromLunar removed
import { getNextAnniversaryDate, getDDayLabel } from "../utils/date";


/* ===== 프리뷰 ===== */
function TodosPreview({ userId }: { userId?: string }) {
  const [items, setItems] = useState<Todo[]>([]);
  useEffect(() => {
    if (!userId) return;
    const src = createSource(userId);
    (async () => {
      // 1. Fetch ALL (or large limit) to filter client side for 'Today'
      const all = await src.listTodos();
      const todayStr = new Date().toISOString().split("T")[0];

      // 2. Filter: Incomplete AND Due Today
      const filtered = all.filter(t => !t.done && t.due === todayStr);

      // 3. Sort (Pinned > Priority > Order)
      filtered.sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      });

      // 4. Take top 5
      setItems(filtered.slice(0, 5));
    })();
  }, [userId]);

  return items.length ? (
    <ul className="divide-y divide-indigo-100 text-[14px] text-slate-800 leading-relaxed">
      {items.map((t) => (
        <li key={t.id} className="flex items-center py-2">
          {/* Badge Style matching TodosPage */}
          <span className="text-rose-500 font-bold text-xs shrink-0 mr-1.5">[오늘]</span>
          <span className="truncate">{t.text}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-[13px] text-slate-600">
      오늘 할 일은 없습니다. 할 일 페이지에서 새 할 일을 추가해 보세요.
    </p>
  );
}

function AnniversariesPreview({ userId }: { userId: string }) {
  const [items, setItems] = useState<Anniversary[]>([]); // Fixed Type
  useEffect(() => {
    const src = createSource(userId);
    (async () => setItems(await src.listAnniversaries(50)))();
  }, [userId]);
  const today = new Date();
  const upcoming3 = useMemo(() => {
    return items
      .map((it) => ({ it, next: getNextAnniversaryDate(it.date, it.type, it.is_recurring, today) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 3);
  }, [items]);
  return upcoming3.length ? (
    <ul className="divide-y divide-indigo-100 text-[14px] text-slate-800 leading-relaxed">
      {upcoming3.map(({ it, next }) => (
        <li key={it.id} className="flex items-center justify-between py-2">
          <span className="truncate">{it.title}</span>
          <span className="rounded-full bg-indigo-100/70 px-3 py-[2px] text-[12px] text-indigo-600">
            {getDDayLabel(next).label}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-[13px] text-slate-600">다가오는 기념일이 없습니다.</p>
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
    // Updated: Uses divide-y with light indigo to match request
    <div className="divide-y divide-[#E1E6FF]">
      {rows.map(({ label, g }) => (
        <div key={label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
          <span className="text-[15px] text-slate-800 leading-relaxed font-medium">
            <span className="font-semibold mr-1">{label} :</span>
            {g?.text ?? "목표 미설정"}
          </span>
          <span className="text-[12px] text-slate-500">({g?.progress ?? 0}%)</span>
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
    <ul className="divide-y divide-indigo-100 text-[14px] text-slate-800 leading-relaxed">
      {items.map((b) => (
        <li key={b.id} className="py-2">
          {b.title}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-[13px] text-slate-600">
      홈에 표시할 버킷을 아직 선택하지 않았어요. ★로 최대 3개 선택!
    </p>
  );
}

function GratitudePreview({ userId }: { userId: string }) {
  const [items, setItems] = useState<Gratitude[]>([]); // Fixed Type
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

  const getDisplayDate = (g: Gratitude) =>
    g.date ?? g.created_at.slice(0, 10);

  return items.length ? (
    <ul className="divide-y divide-indigo-100 text-[14px] text-slate-800 leading-relaxed">
      {items.map((g) => (
        <li key={g.id} className="flex items-center gap-3 py-2">
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[12px] text-slate-500">
            {getDisplayDate(g)}
          </span>
          <span className="truncate">{g.text}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-[13px] text-slate-600">오늘의 감사가 아직 없어요.</p>
  );
}

export default function Home({ onNavigate }: { onNavigate: (v: any) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Morning Routine State
  const [morningRoutines, setMorningRoutines] = useState<{ id: string; title: string; isDoneToday: boolean }[]>([]);


  useEffect(() => {
    if (!user) return;

    let mounted = true;
    (async () => {
      try {
        // 1. Fetch Routines
        let { data: routines } = await supabase
          .from('routines')
          .select('id, title')
          .eq('user_id', user.id)
          .eq('category', 'morning')
          .order('order_index');

        // 2. Auto-Seed if empty
        if (!routines || routines.length === 0) {
          const seeds = [
            { user_id: user.id, title: '물 한 잔 마시기', category: 'morning', order_index: 0 },
            { user_id: user.id, title: '스트레칭 5분', category: 'morning', order_index: 1 },
            { user_id: user.id, title: '오늘의 다짐 읽기', category: 'morning', order_index: 2 },
          ];
          const { data: inserted } = await supabase.from('routines').insert(seeds).select('id, title');
          routines = inserted || [];
        }

        // 3. Fetch Today's Logs
        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase
          .from('routine_logs')
          .select('routine_id, is_done')
          .eq('user_id', user.id)
          .eq('date', today);

        if (!mounted) return;

        // 4. Merge
        const merged = (routines || []).map((r) => {
          const log = logs?.find((l) => l.routine_id === r.id);
          return {
            id: r.id,
            title: r.title,
            isDoneToday: log ? log.is_done : false,
          };
        });
        setMorningRoutines(merged);
      } catch (e) {
        console.error("Failed to load morning routines:", e);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  const handleToggleMorningRoutine = async (id: string, nextValue: boolean) => {
    if (!user) return;

    // 1. Optimistic Update
    setMorningRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDoneToday: nextValue } : r))
    );

    // 2. DB Update
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check for existing log
      const { data: existing } = await supabase
        .from('routine_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('routine_id', id)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('routine_logs')
          .update({ is_done: nextValue })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('routine_logs')
          .insert({
            user_id: user.id,
            routine_id: id,
            date: today,
            is_done: nextValue,
          });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Failed to toggle routine:", e);
      // Rollback on error could be implemented here
    }
  };

  if (!user) return null;

  return (
    <PageShell showHeader={false}>
      {/* Updated Spacing: space-y-5 */}
      <div className="space-y-5">
        {/* 히어로 영역: 오늘의 다짐 [2] Wrapper Updated in MindTrigger.tsx */}
        <MindTrigger onManage={() => onNavigate("pledges")} />

        {/* 루틴 미니멀 카드 (DB 연동) */}
        <RoutineCardMinimal
          title="아침 루틴"
          icon="☀️"
          items={morningRoutines.map(r => ({
            id: r.id,
            label: r.title,
            isDone: r.isDoneToday
          }))}
          onToggle={handleToggleMorningRoutine}
          onManage={() => navigate('/routines')}
        />



        {/* 그리드 레이아웃: 섹션 간 구분감 강화 (높이 통일을 위해 items-stretch) */}
        {/* Updated Spacing: space-y-0 but grid gap remains */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 items-stretch space-y-0">

          {/* 1. 목표 (bg-[#F3F5FE]) - [3] */}
          <SectionCard
            title="나의 목표"
            subtitle="목표를 명확히 하고, 한걸음 더 실천하세요"
            actionLabel="목표 관리"
            onAction={() => onNavigate("goals")}
            color={undefined}
            className="bg-[#F3F5FE]"
          >
            <GoalsPreview userId={user.id} />
          </SectionCard>

          {/* 2. 할 일 (bg-[#F5F7FF]) - [4] */}
          {/* Tone differentiation: #F5F7FF for Todos */}
          <SectionCard
            title="오늘의 할 일 (Top 3)"
            subtitle="하루에 중요한 3가지는 꼭 실천하세요"
            actionLabel="할 일 관리"
            onAction={() => onNavigate("todos")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <TodosPreview userId={user.id} />
          </SectionCard>

          {/* 3. 명상 (bg-[#F3F5FE]) - [5] */}
          <SectionCard
            title="오늘의 명상"
            subtitle="잠시 멈추고, 명상을 자신의 삶에 대입해보세요"
            actionLabel="명상 보기"
            onAction={() => onNavigate("meditation")}
            color={undefined}
            className="bg-[#F3F5FE]"
          >
            <MeditationOfTheDay variant="inline" className="mt-1" />
          </SectionCard>

          {/* 4. 기념일 (bg-[#F3F5FE]) - [6] */}
          <SectionCard
            title="기념일 챙기기"
            subtitle="소중한 사람의 기념일을 꼭 챙기세요"
            actionLabel="기념일 관리"
            onAction={() => onNavigate("anniversaries")}
            color={undefined}
            className="bg-[#F3F5FE]"
          >
            <AnniversariesPreview userId={user.id} />
          </SectionCard>

          {/* 5. 안부/연락처 (bg-[#F5F7FF]) - [7] */}
          {/* Tone differentiation: #F5F7FF for Contacts */}
          <SectionCard
            title="안부·연락처"
            subtitle="오늘 한통의 안부를 전해보세요"
            actionLabel="연락처 관리"
            onAction={() => onNavigate("contacts")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <div className="[&_h2]:hidden [&_h3]:hidden [&_button]:text-[11px] [&_button]:px-2 [&_button]:py-1">
              <CarePing />
            </div>
            <p className="mt-2 text-[12px] text-slate-500 opacity-80">팁: 미연락 기간/중요도/다가오는 기념일 기준</p>
          </SectionCard>

          {/* 6. 뉴스 (bg-[#F5F7FF]) */}
          <SectionCard
            title="주요 뉴스"
            subtitle="세상의 흐름을 빠르게 확인하세요"
            actionLabel="뉴스 보기"
            onAction={() => onNavigate("news")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <div className="text-[14px] text-slate-800 leading-relaxed">
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

          {/* 7. 리워드 미션 (bg-[#F5F7FF]) - [8] */}
          <SectionCard
            title="리워드 미션"
            subtitle="도전하고 보상을 받으세요"
            actionLabel="미션 보기"
            onAction={() => onNavigate("mission")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <ul className="divide-y divide-indigo-100 text-[14px] leading-relaxed">
              <li className="py-2 text-slate-800 font-medium">
                🎁 7일 연속 완료 시 스탬프 적립
              </li>
              <li className="py-2 text-[12px] text-slate-500">
                3개 모이면 커피 쿠폰 자동 지급! 현재 미션 진행 중...
              </li>
            </ul>
          </SectionCard>

          {/* 8. 버킷리스트 (bg-[#F5F7FF]) - [8] */}
          <SectionCard
            title="나의 버킷리스트"
            subtitle="꿈을 적으면 현실이 됩니다"
            actionLabel="버킷 관리"
            onAction={() => onNavigate("bucket")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <BucketPreview userId={user.id} />
          </SectionCard>

          {/* 9. 감사일기 (bg-[#F5F7FF]) - [8] */}
          <SectionCard
            title="감사일기"
            subtitle="오늘도 감사한 마음을 기록하세요"
            actionLabel="감사일기 보기"
            onAction={() => onNavigate("gratitude")}
            color={undefined}
            className="bg-[#F5F7FF]"
          >
            <GratitudePreview userId={user.id} />
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}