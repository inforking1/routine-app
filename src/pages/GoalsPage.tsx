// src/pages/GoalsPage.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
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

export default function GoalsPage({ onHome }: Props) {
  /** ------- State ------- */
  const [items, setItems] = useState<Goal[]>([]);
  const [picks, setPicks] = useState<Record<Term, string | null>>({ short: null, mid: null, long: null });
  const [activeTerm, setActiveTerm] = useState<Term>("short");
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

  /** ------- Load ------- */
  const { user, ready } = useAuth();

  /** ------- Load ------- */
  useEffect(() => {
    if (!ready) return; // 아직 로드 중이면 대기
    if (!user) {
      // 로그인 안된 상태면 로딩 끄고 에러 처리하거나 리다이렉트 (여기선 목록 빈배열)
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const uid = user.id;

        // goals: 항상 본인 것만
        const { data: goalsData, error: goalsErr } = await sb
          .from("goals")
          .select("id,user_id,text,progress,term,created_at,start_date,end_date")
          .eq("user_id", uid)
          .order("created_at", { ascending: true });
        if (goalsErr) throw goalsErr;

        // goal_picks: 본인 것만
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
  }, [ready, user]); // user가 바뀌면 재로딩

  /** ------- Derived ------- */
  const filtered = useMemo(() => items.filter((g) => g.term === activeTerm), [items, activeTerm]);

  /** ------- Form utils ------- */
  const resetForm = () => {
    setText("");
    setTerm(activeTerm);
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
          .eq("user_id", uid); // 안전 필터
        if (error) {
          setItems(backup);
          throw error;
        }
      } else {
        // optimistic temp
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
    setEditingId(g.id);
    setText(g.text);
    setTerm(g.term);
    setProgress(g.progress);
    setStartDate(fmt(g.start_date));
    setEndDate(fmt(g.end_date));
  };

  const handleDelete = async (id: string) => {
    const backup = items;
    setItems((prev) => prev.filter((g) => g.id !== id));
    try {
      if (user) {
        const uid = user.id;
        // 홈 표시 중이었다면 goal_picks도 정리
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

  /** ------- Render ------- */
  if (loading) return <div className="p-4 text-sm text-slate-500">불러오는 중…</div>;

  return (
    <PageShell title="나의 목표" onHome={onHome}>
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          오류: {error}
        </div>
      )}

      <div className="space-y-3">
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

        {/* 탭/필터 */}
        <div className="flex flex-wrap gap-1.5">
          {(["short", "mid", "long"] as Term[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setActiveTerm(t);
                if (editingId == null) setTerm(t);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${activeTerm === t
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
            >
              {TERM_LABEL[t]}
            </button>
          ))}
        </div>

        {/* 입력/수정 폼 — 공백 축소 */}
        <SectionCard title={editingId ? "목표 수정" : "목표 추가"} subtitle="간단히 텍스트와 진행률만 입력, 기간은 선택" className="!h-auto !min-h-0 self-start p-3 md:p-4">
          <form onSubmit={handleSubmit} className="grid gap-2 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs text-slate-500">목표 내용</label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예) 월 500 달성"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs text-slate-500">구분</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as Term)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                <option value="short">단기</option>
                <option value="mid">중기</option>
                <option value="long">장기</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs text-slate-500">진행률(%)</label>
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
            <div className="md:col-span-12">
              <label className="mb-1 block text-xs text-slate-500">기간(선택)</label>
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
            <div className="md:col-span-12 flex gap-1.5">
              <button type="submit" className="rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
                {editingId ? "수정 완료" : "추가"}
              </button>
              {editingId != null && (
                <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  취소
                </button>
              )}
            </div>
          </form>
        </SectionCard>

        {/* 목록 — 공백 축소 */}
        <SectionCard title={`${TERM_LABEL[activeTerm]} 목표 목록`} subtitle="목표를 클릭하면 수정, 🏠표시로 홈 노출 설정" className="!h-auto !min-h-0 self-start p-3 md:p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">아직 등록된 목표가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filtered.map((g) => {
                const isPicked = picks[g.term] === g.id;
                return (
                  <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                    <button className="min-w-0 flex-1 truncate text-left" onClick={() => handleEdit(g)} title="클릭하여 수정">
                      <span className="truncate text-sm text-slate-800">{g.text}</span>{" "}
                      <span className="text-xs text-slate-500">{metaLine(g)}</span>
                      {isPicked && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">홈 표시중</span>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {isPicked ? (
                        <button onClick={() => setHomePick(g.term, null)} disabled={savingPick === g.term} className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors" title="홈 표시 해제">
                          🏠 해제
                        </button>
                      ) : (
                        <button onClick={() => setHomePick(g.term, g.id)} disabled={savingPick === g.term} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors" title="이 목표를 홈에 표시">
                          🏠 표시
                        </button>
                      )}
                      <button onClick={() => handleDelete(g.id)} className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-100" title="삭제">
                        🗑
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
