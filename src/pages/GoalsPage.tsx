import { type FormEvent, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import { supabase } from "../lib/supabaseClient";
import useAuth from "../hooks/useAuth";

// 기존 스타일 유지: sb 별칭
const sb = supabase as any;

/** ------- Types ------- */
type Term = "short" | "mid" | "long";

type Goal = {
  id: string;
  user_id: string;
  text: string;
  progress: number; // 0~100
  term: Term;
  created_at: string; // ISO
  start_date?: string | null;
  end_date?: string | null;
};

type GoalPickRow = { user_id: string; term: Term; goal_id: string | null; updated_at?: string };

const TERM_LABEL: Record<Term, string> = { short: "단기", mid: "중기", long: "장기" };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const fmt = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const dday = (end?: string | null) => {
  if (!end) return null;
  const today = new Date(new Date().toDateString());
  const until = new Date(end);
  return Math.ceil((until.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
const metaLine = (g?: Goal | null) => {
  if (!g) return "";
  const d = dday(g.end_date);
  const dStr = d == null ? "" : ` ⏳ ${d >= 0 ? `D-${d}` : `D+${Math.abs(d)}`}`;
  return `(${clamp(g.progress, 0, 100)}%)${dStr}`;
};

type Props = { onHome: () => void };

const SAMPLE_GOALS: Goal[] = [
  { id: 'sample-1', user_id: 'sample', text: '하루 10분 걷기 (예시)', term: 'short', progress: 30, created_at: new Date().toISOString() },
  { id: 'sample-2', user_id: 'sample', text: '하루 10분 독서하기 (예시)', term: 'short', progress: 0, created_at: new Date().toISOString() },
  { id: 'sample-3', user_id: 'sample', text: '물 1잔 더 마시기 (예시)', term: 'short', progress: 50, created_at: new Date().toISOString() },
];

export default function GoalsPage({ onHome }: Props) {
  /** ------- State ------- */
  const [items, setItems] = useState<Goal[]>([]);
  const [picks, setPicks] = useState<Record<Term, string | null>>({ short: null, mid: null, long: null });
  const [loading, setLoading] = useState(true);
  const [savingPick, setSavingPick] = useState<Term | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form
  const [text, setText] = useState("");
  const [term, setTerm] = useState<Term>("short");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 🔄 Local Routine State
  const [routineIds, setRoutineIds] = useState<string[]>([]);
  const [dailyDoneIds, setDailyDoneIds] = useState<string[]>([]);

  const isEmpty = items.length === 0;

  /** ------- Load ------- */
  const { user, ready } = useAuth();

  /** ------- Effects ------- */
  useEffect(() => {
    // 1. Load routine config
    const savedConfig = localStorage.getItem("my_routine_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.ids) setRoutineIds(parsed.ids);
      } catch (e) { console.error("Failed to parse routine config", e); }
    }

    // 2. Load daily status & Reset if needed
    const savedDaily = localStorage.getItem("my_routine_daily");
    const todayStr = new Date().toDateString(); // "Tue Dec 10 2024" format is stable enough per day in local time

    if (savedDaily) {
      try {
        const parsed = JSON.parse(savedDaily);
        if (parsed.date === todayStr) {
          setDailyDoneIds(parsed.doneIds || []);
        } else {
          // Date changed, reset
          setDailyDoneIds([]);
          localStorage.setItem("my_routine_daily", JSON.stringify({ date: todayStr, doneIds: [] }));
        }
      } catch (e) {
        setDailyDoneIds([]);
      }
    } else {
      // First time
      localStorage.setItem("my_routine_daily", JSON.stringify({ date: todayStr, doneIds: [] }));
    }
  }, []);

  useEffect(() => {
    if (!ready) return; // 아직 로드 중이면 대기
    if (!user) {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const uid = user.id;

        // goals
        const { data: goalsData, error: goalsErr } = await sb
          .from("goals")
          .select("id,user_id,text,progress,term,created_at,start_date,end_date")
          .eq("user_id", uid)
          .order("created_at", { ascending: true });
        if (goalsErr) throw goalsErr;

        // goal_picks
        const { data: picksData, error: picksErr } = await sb
          .from("goal_picks")
          .select("term,goal_id")
          .eq("user_id", uid);
        if (picksErr) throw picksErr;

        if (!alive) return;
        setItems((goalsData ?? []) as Goal[]);

        const next: Record<Term, string | null> = { short: null, mid: null, long: null };
        (picksData as GoalPickRow[] | undefined)?.forEach((p) => (next[p.term] = p.goal_id ?? null));
        setPicks(next);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, user]);

  /** ------- Form utils ------- */
  const resetForm = () => {
    setText("");
    setTerm("short");
    setProgress(0);
    setStartDate("");
    setEndDate("");
    setEditingId(null);
  };

  /** ------- Submit ------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const uid = user.id;

      if (editingId) {
        const backup = items;
        const next = items.map((g) =>
          g.id === editingId
            ? {
              ...g,
              text: trimmed,
              term,
              progress: clamp(progress, 0, 100),
              start_date: startDate || null,
              end_date: endDate || null,
            }
            : g
        );
        setItems(next);

        const { error } = await sb
          .from("goals")
          .update({
            text: trimmed,
            term,
            progress: clamp(progress, 0, 100),
            start_date: startDate || null,
            end_date: endDate || null,
          } as any)
          .eq("id", editingId)
          .eq("user_id", uid);
        if (error) {
          setItems(backup);
          throw error;
        }
      } else {
        const temp: Goal = {
          id: crypto.randomUUID(),
          user_id: uid,
          text: trimmed,
          term,
          progress: clamp(progress, 0, 100),
          created_at: new Date().toISOString(),
          start_date: startDate || null,
          end_date: endDate || null,
        };
        setItems((prev) => [...prev, temp]);

        const { data, error } = await sb
          .from("goals")
          .insert({
            user_id: uid,
            text: temp.text,
            term: temp.term,
            progress: temp.progress,
            start_date: temp.start_date,
            end_date: temp.end_date,
          } as any)
          .select("id,user_id,text,progress,term,created_at,start_date,end_date")
          .single();

        if (error) {
          setItems((prev) => prev.filter((g) => g.id !== temp.id));
          throw error;
        }
        setItems((prev) => [...prev.filter((g) => g.id !== temp.id), (data as any) as Goal]);
      }
      resetForm();
    } catch (e: any) {
      setError("저장 실패: " + (e?.message ?? String(e)));
    }
  };

  /** ------- Edit/Delete ------- */
  const handleEdit = (g: Goal) => {
    if (g.user_id === 'sample') return;
    setEditingId(g.id);
    setText(g.text);
    setTerm(g.term);
    setProgress(g.progress);
    setStartDate(fmt(g.start_date));
    setEndDate(fmt(g.end_date));
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('sample-')) return;
    const backup = items;
    setItems((prev) => prev.filter((g) => g.id !== id));

    // Also remove from routine config if present
    if (routineIds.includes(id)) {
      toggleRoutine(id); // effectively remove
    }

    try {
      if (user) {
        const uid = user.id;
        const removed = backup.find((g) => g.id === id);
        if (removed && picks[removed.term] === id) {
          await sb.from("goal_picks").delete().match({ user_id: uid, term: removed.term } as any);
          setPicks((prev) => ({ ...prev, [removed.term]: null }));
        }
      }
      const { error } = await sb.from("goals").delete().eq("id", id);
      if (error) {
        setItems(backup);
        throw error;
      }
      if (editingId === id) resetForm();
    } catch (e: any) {
      setError("삭제 실패: " + (e?.message ?? String(e)));
    }
  };

  /** ------- Pick for Home ------- */
  const setHomePick = async (term: Term, goalId: string | null) => {
    if (goalId?.startsWith('sample-')) return;
    try {
      if (!user) throw new Error("로그인이 필요합니다.");
      const uid = user.id;

      setSavingPick(term);

      if (goalId) {
        const { error } = await sb
          .from("goal_picks")
          .upsert(
            {
              user_id: uid,
              term,
              goal_id: goalId,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "user_id,term" }
          );
        if (error) throw error;
        setPicks((prev) => ({ ...prev, [term]: goalId }));
      } else {
        const { error } = await sb.from("goal_picks").delete().match({ user_id: uid, term } as any);
        if (error) throw error;
        setPicks((prev) => ({ ...prev, [term]: null }));
      }
    } catch (e: any) {
      setError("선택 저장 실패: " + (e?.message ?? String(e)));
    } finally {
      setSavingPick(null);
    }
  };

  /** ------- Routine Logic ------- */
  const toggleRoutine = (id: string) => {
    if (id.startsWith('sample-')) return;
    let next: string[];
    if (routineIds.includes(id)) {
      next = routineIds.filter(rid => rid !== id);
    } else {
      next = [...routineIds, id];
    }
    setRoutineIds(next);
    localStorage.setItem("my_routine_config", JSON.stringify({ ids: next }));
  };

  const toggleDailyCheck = (id: string) => {
    let next: string[];
    if (dailyDoneIds.includes(id)) {
      next = dailyDoneIds.filter(did => did !== id);
    } else {
      next = [...dailyDoneIds, id];
    }
    setDailyDoneIds(next);
    const todayStr = new Date().toDateString();
    localStorage.setItem("my_routine_daily", JSON.stringify({ date: todayStr, doneIds: next }));
  };

  /** ------- Render ------- */
  if (loading) return <div className="p-4 text-sm text-slate-500">불러오는 중…</div>;

  const activeRoutines = items.filter(g => routineIds.includes(g.id));

  return (
    <PageShell title="나의 목표" onHome={onHome}>
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          오류: {error}
        </div>
      )}

      {/* 🚀 Onboarding Guide Card */}
      {isEmpty && (
        <div className="mb-6 rounded-2xl bg-indigo-50 p-5 shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🌱</span>
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-1">처음 사용이시군요 😊</h3>
              <p className="text-sm text-indigo-700 leading-relaxed">
                가장 이루고 싶은 목표부터 가볍게 시작해보세요.<br />
                아래 예시처럼 <strong>단기 목표</strong>부터 등록해보는 건 어떨까요?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 💡 Big Goal Breakdown Hint */}
      {isEmpty && (
        <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed shadow-sm">
          <p className="font-semibold text-slate-900 mb-1">💡 목표 설정 팁</p>
          <p>
            큰 목표가 있다면, 작게 쪼개서 매일 실천할 수 있도록 만들어보세요.<br />
            <span className="text-slate-500 text-xs">예) 월 1천만 원 벌기 → 하루 1가지 수익 행동하기</span>
          </p>
        </div>
      )}

      {/* ☀️ Today's Routine Card */}
      {!isEmpty && activeRoutines.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-sm border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">☀️</span>
            <h3 className="font-bold text-indigo-900">오늘의 목표 루틴</h3>
          </div>
          <div className="space-y-2">
            {activeRoutines.map(g => {
              const isDone = dailyDoneIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleDailyCheck(g.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-all ${isDone
                      ? "bg-indigo-100 border-indigo-200"
                      : "bg-white border-white hover:border-indigo-200"
                    }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isDone ? "bg-indigo-500 border-indigo-500" : "border-slate-300 bg-white"
                    }`}>
                    {isDone && <span className="text-[10px] text-white">✔</span>}
                  </div>
                  <span className={`text-sm font-medium ${isDone ? "text-indigo-800 line-through opacity-70" : "text-slate-700"}`}>
                    {g.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ✅ 카드 하단 공백 축소: className으로 h-auto p-3 md:p-4 만 덮어쓰기 */}
        <SectionCard title="홈 표시 현황" subtitle="단기·중기·장기 중 홈에 노출할 목표 1개씩" className="!h-auto !min-h-0 self-start p-3 md:p-4">
          <ul className="divide-y divide-slate-200 text-sm">
            {(["short", "mid", "long"] as Term[]).map((t) => {
              const pickedId = picks[t];
              const picked = items.find((g) => g.id === pickedId) || null;
              return (
                <li key={t} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-slate-800">{TERM_LABEL[t]}목표 :</span>{" "}
                    <span className="truncate text-slate-700">
                      {picked ? picked.text : "홈에 표시할 목표를 선택하세요."}
                    </span>{" "}
                    <span className="text-slate-500">{picked ? metaLine(picked) : ""}</span>
                  </div>
                  <div className="shrink-0">
                    {picked ? (
                      <button
                        onClick={() => setHomePick(t, null)}
                        disabled={savingPick === t}
                        className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="홈 표시 해제"
                      >
                        🏠 해제
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">미선택</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* 입력/수정 폼 */}
        <SectionCard
          title={editingId ? "목표 수정" : "목표 추가"}
          subtitle="목표 입력"
          className="!h-auto !min-h-0 self-start p-3 md:p-4"
        >
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-12">

            {/* 1. 목표 내용 (Top) */}
            <div className="md:col-span-12">
              <label className="mb-1 block text-xs font-semibold text-slate-600">목표 내용</label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isEmpty ? "예) 하루 10분 독서하기" : "예) 월 500 달성"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            {/* 2. 구분 (Line 2) */}
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-600">구분 (필수)</label>
              <div className="flex rounded-lg bg-slate-100 p-1">
                {(["short", "mid", "long"] as Term[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTerm(t)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${term === t
                      ? "bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    {TERM_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 진행률 (Line 2) */}
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-600">진행률 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setProgress(clamp(Number.isNaN(v) ? 0 : v, 0, 100));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            {/* 4. 기간 (Line 3) */}
            <div className="md:col-span-12">
              <label className="mb-1 block text-xs font-semibold text-slate-600">기간 (선택)</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
                <span className="text-xs text-slate-400">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">기간은 비워도 됩니다.</p>
            </div>

            {/* Buttons */}
            <div className="md:col-span-12 flex gap-2 pt-2">
              <button type="submit" className="flex-1 rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm">
                {editingId ? "수정 완료" : "목표 저장하기"}
              </button>
              {editingId != null && (
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  취소
                </button>
              )}
            </div>
          </form>
        </SectionCard>

        {/* 목록 (전체 펼치기) */}
        <div className="space-y-6">
          {(["short", "mid", "long"] as Term[]).map((t) => {
            const realList = items.filter((g) => g.term === t);
            // 만약 전체가 비어있다면, 샘플 리스트 중 해당 term에 맞는 것만 표시
            const displayList = isEmpty ? SAMPLE_GOALS.filter(g => g.term === t) : realList;

            return (
              <SectionCard
                key={t}
                title={`${TERM_LABEL[t]} 목표`}
                subtitle={`${displayList.length}개의 목표가 있습니다.`}
                className="!h-auto !min-h-0 p-3 md:p-4"
              >
                {displayList.length === 0 ? (
                  <div className="py-4 text-center text-sm text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    등록된 {TERM_LABEL[t]} 목표가 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {displayList.map((g) => {
                      const isSample = g.user_id === 'sample';
                      const isPicked = picks[g.term] === g.id;
                      const isRoutine = routineIds.includes(g.id);

                      return (
                        <li key={g.id} className={`flex items-center justify-between gap-2 py-3 transition-colors rounded-lg px-2 -mx-2 ${isSample ? 'bg-slate-50 opacity-80' : 'hover:bg-slate-50/50'}`}>
                          <button
                            className="min-w-0 flex-1 truncate text-left group cursor-default"
                            onClick={() => !isSample && handleEdit(g)}
                            disabled={isSample}
                            title={isSample ? '예시 항목입니다' : '클릭하여 수정'}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`truncate text-sm font-medium ${isSample ? 'text-slate-600' : 'text-slate-800 group-hover:text-emerald-700'} transition-colors`}>
                                {g.text}
                              </span>
                              {isPicked && (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">홈 PICK</span>
                              )}
                              {isRoutine && (
                                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">루틴</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {metaLine(g)} {g.start_date || g.end_date ? `(${fmt(g.start_date)}~${fmt(g.end_date)})` : ""}
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-1">
                            {!isSample && (
                              <>
                                <button
                                  onClick={() => toggleRoutine(g.id)}
                                  className={`rounded-md p-1.5 transition-colors ${isRoutine ? "text-indigo-600 bg-indigo-50" : "text-slate-300 hover:text-indigo-400"}`}
                                  title={isRoutine ? "루틴 해제" : "루틴으로 설정"}
                                >
                                  🔄
                                </button>
                                {isPicked ? (
                                  <button onClick={() => setHomePick(g.term, null)} disabled={savingPick === g.term} className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-600 font-medium hover:bg-emerald-100" title="홈 표시 해제">
                                    해제
                                  </button>
                                ) : (
                                  <button onClick={() => setHomePick(g.term, g.id)} disabled={savingPick === g.term} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-emerald-600" title="홈 표시">
                                    표시
                                  </button>
                                )}
                                <button onClick={() => handleDelete(g.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors" title="삭제">
                                  🗑
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            );
          })}
        </div>
      </div>
    </PageShell >
  );
}
