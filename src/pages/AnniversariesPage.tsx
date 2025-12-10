// src/pages/AnniversariesPage.tsx
import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import { supabase } from "../lib/supabase";
import { getSolarDateFromLunar } from "../utils/lunar";

/** ===== types ===== */
export type Anniversary = {
  id: string;          // uuid
  user_id: string;
  title: string;
  date: string;        // YYYY-MM-DD (음력일 경우 음력 날짜 그대로 2023-10-23)
  type?: 'solar' | 'lunar';
  is_recurring?: boolean;
  created_at: string;  // ISO
};

type Props = {
  onHome: () => void;
};

/** ===== utils ===== */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmtYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYMD(ymd: string) {
  const [y, m, dd] = ymd.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, dd || 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** "MM/DD" → "YYYY-MM-DD" 보정 */
function normalizeDateStr(raw: string): string {
  if (/^\d{2}\/\d{2}$/.test(raw)) {
    const [mm, dd] = raw.split("/").map((v) => parseInt(v, 10));
    const y = new Date().getFullYear();
    return `${y}-${pad2(mm)}-${pad2(dd)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return fmtYMD(new Date());
}

/** 
 * 다가오는 다다음 발생일 계산 (Solar/Lunar 고려)
 */
function nextOccurrenceDate(
  ymd: string,
  type: 'solar' | 'lunar',
  isRecurring: boolean,
  today: Date
): Date {
  const d = parseYMD(normalizeDateStr(ymd));
  // d는 DB에 저장된 "기준 날짜" (양력 or 음력)

  // 1. 반복 안 함:
  if (!isRecurring) {
    if (type === 'solar') {
      return d;
    } else {
      // 음력 1회성: 그 해의 음력 날짜를 양력으로 변환
      const solarStr = getSolarDateFromLunar(normalizeDateStr(ymd), d.getFullYear());
      return parseYMD(solarStr);
    }
  }

  // 2. 반복 함:
  const tY = today.getFullYear();
  const today0 = new Date(tY, today.getMonth(), today.getDate());

  if (type === 'solar') {
    // 양력 매년 반복
    const thisYear = new Date(tY, d.getMonth(), d.getDate());
    if (thisYear >= today0) return thisYear;
    return new Date(tY + 1, d.getMonth(), d.getDate());
  } else {
    // 음력 매년 반복
    // Step 1: 올해(tY)의 음력 변환
    const thisYearSolarStr = getSolarDateFromLunar(normalizeDateStr(ymd), tY);
    const thisYearSolar = parseYMD(thisYearSolarStr);

    if (thisYearSolar >= today0) return thisYearSolar;

    // Step 2: 내년(tY+1)의 음력 변환
    const nextYearSolarStr = getSolarDateFromLunar(normalizeDateStr(ymd), tY + 1);
    return parseYMD(nextYearSolarStr);
  }
}

const SAMPLE_ANNIVERSARIES: Anniversary[] = [
  { id: 'sample-1', user_id: 'sample', title: '엄마 생일 (예시)', date: '1975-05-08', type: 'solar', is_recurring: true, created_at: new Date().toISOString() },
  { id: 'sample-2', user_id: 'sample', title: '부모님 결혼기념일 (예시)', date: '1990-10-10', type: 'solar', is_recurring: true, created_at: new Date().toISOString() },
];

export default function AnniversariesPage({ onHome }: Props) {
  const [items, setItems] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for Forms
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<'solar' | 'lunar'>('solar');
  const [isRecurring, setIsRecurring] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<'solar' | 'lunar'>('solar');
  const [editIsRecurring, setEditIsRecurring] = useState(true);

  const isEmpty = items.length === 0;

  /** ===== fetch ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) throw new Error("로그인이 필요합니다.");

        const { data, error } = await supabase
          .from("anniversaries")
          .select("id,user_id,title,date,type,is_recurring,created_at")
          .eq("user_id", auth.user.id)
          .order("date", { ascending: true }); // 날짜순 정렬 시 음력 날짜 그대로 정렬됨(OK)

        if (error) throw error;
        if (!alive) return;

        const normalized = (data ?? []).map((it) => ({
          ...it,
          date: normalizeDateStr(String(it.date)),
          type: it.type ?? 'solar',
          is_recurring: it.is_recurring ?? true,
        })) as Anniversary[];

        setItems(normalized);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** ===== add ===== */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const d = normalizeDateStr(date);
    if (!t || !d) return;

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("로그인이 필요합니다.");

      const temp: Anniversary = {
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        title: t,
        date: d,
        type: type,
        is_recurring: isRecurring,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, temp]);

      const { data, error } = await supabase
        .from("anniversaries")
        .insert({
          user_id: auth.user.id,
          title: t,
          date: d,
          type: type,
          is_recurring: isRecurring,
        })
        .select("id,user_id,title,date,type,is_recurring,created_at")
        .single();
      if (error) throw error;

      setItems((prev) => [data as Anniversary, ...prev.filter((x) => x.id !== temp.id)]);
      setTitle("");
      setDate("");
      setType('solar');
      setIsRecurring(true);
    } catch (e: any) {
      setError("추가 실패: " + (e?.message ?? String(e)));
      setItems((prev) => prev.filter((x) => x.title !== title || x.date !== date));
    }
  };

  /** ===== edit ===== */
  const startEdit = (a: Anniversary) => {
    if (a.user_id === 'sample') return;
    setEditId(a.id);
    setEditTitle(a.title);
    setEditDate(a.date);
    setEditType(a.type ?? 'solar');
    setEditIsRecurring(a.is_recurring ?? true);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditTitle("");
    setEditDate("");
    setEditType('solar');
    setEditIsRecurring(true);
  };
  const saveEdit = async (id: string) => {
    const t = editTitle.trim();
    const d = normalizeDateStr(editDate);
    if (!t || !d) return;

    const backup = items;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, title: t, date: d, type: editType, is_recurring: editIsRecurring } : it)));

    try {
      const { error } = await supabase.from("anniversaries")
        .update({ title: t, date: d, type: editType, is_recurring: editIsRecurring })
        .eq("id", id);
      if (error) throw error;
      cancelEdit();
    } catch (e: any) {
      setError("수정 실패: " + (e?.message ?? String(e)));
      setItems(backup);
    }
  };

  const removeItem = async (id: string) => {
    if (id.startsWith('sample-')) return;
    const backup = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      const { error } = await supabase.from("anniversaries").delete().eq("id", id);
      if (error) throw error;
      if (editId === id) cancelEdit();
    } catch (e: any) {
      setError("삭제 실패: " + (e?.message ?? String(e)));
      setItems(backup);
    }
  };

  /** ===== derived: upcoming 3 ===== */
  const today = new Date();
  const upcoming3 = useMemo(() => {
    // 🚀 Use SAMPLE_ANNIVERSARIES if empty
    const source = isEmpty ? SAMPLE_ANNIVERSARIES : items;

    const withNext = source.map((it) => ({
      it,
      next: nextOccurrenceDate(it.date, it.type ?? 'solar', it.is_recurring ?? true, today)
    }));

    today.setHours(0, 0, 0, 0);
    const future = withNext.filter(x => x.next >= today).sort((a, b) => a.next.getTime() - b.next.getTime());
    const past = withNext.filter(x => x.next < today).sort((a, b) => b.next.getTime() - a.next.getTime());

    return [...future, ...past].slice(0, 3).map(x => ({ ...x.it, next: x.next }));
  }, [items, isEmpty]);

  /** ===== calendar ===== */
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startWeekday = monthStart.getDay();
  const totalDays = monthEnd.getDate();

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const itemsByDay = useMemo(() => {
    const map = new Map<number, Anniversary[]>();
    for (let i = 1; i <= totalDays; i++) map.set(i, []);
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();

    items.forEach((it) => {
      // Helper to safely add unique item to a specific day
      const addToDay = (day: number) => {
        const list = map.get(day);
        if (list && !list.some(existing => existing.id === it.id)) {
          list.push(it);
        }
      };

      // 1. Solar Default:
      if (!it.type || it.type === 'solar') {
        const d = parseYMD(normalizeDateStr(it.date));
        const isRecur = it.is_recurring ?? true;

        if (isRecur) {
          if (d.getMonth() === m) addToDay(d.getDate());
        } else {
          if (d.getFullYear() === y && d.getMonth() === m) addToDay(d.getDate());
        }
      } else {
        // 2. Lunar
        const isRecur = it.is_recurring ?? true;
        if (isRecur) {
          // Check previous, current, next year for coverage
          [y - 1, y, y + 1].forEach(lunarYear => {
            const sStr = getSolarDateFromLunar(normalizeDateStr(it.date), lunarYear);
            const sDate = parseYMD(sStr);
            if (sDate.getFullYear() === y && sDate.getMonth() === m) {
              addToDay(sDate.getDate());
            }
          });
        } else {
          // One-time Lunar
          const sStr = getSolarDateFromLunar(normalizeDateStr(it.date), parseYMD(normalizeDateStr(it.date)).getFullYear());
          const sDate = parseYMD(sStr);
          if (sDate.getFullYear() === y && sDate.getMonth() === m) {
            addToDay(sDate.getDate());
          }
        }
      }
    });

    return map;
  }, [items, viewDate, totalDays]);

  /** ===== render ===== */
  if (loading) return <div className="p-4 text-sm text-slate-500">불러오는 중…</div>;

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-rose-600">오류: {error}</p>
        <p className="mt-2 text-xs text-slate-500">
          • 로그인 상태 확인<br />
          • Supabase 스키마 확인
        </p>
      </div>
    );
  }

  return (
    <PageShell title="기념일" onHome={onHome}>
      <SectionCard title="기념일(Anniversaries)" subtitle="중요한 날 잊지 않기">

        {/* 🚀 Onboarding Hint */}
        {isEmpty && (
          <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2">
            <span>💡</span>
            <p>소중한 사람의 <strong>생일·기념일</strong>을 등록해두면 달력에서 한눈에 볼 수 있어요.</p>
          </div>
        )}

        {/* 입력 */}
        <form className="mb-4 flex flex-col gap-2 p-3 bg-slate-50 rounded-xl" onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEmpty ? "예) 부모님 결혼기념일" : "제목 (예: 부모님 결혼기념일)"}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newType"
                    checked={type === 'solar'}
                    onChange={() => setType('solar')}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-slate-700">양력 🌞</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newType"
                    checked={type === 'lunar'}
                    onChange={() => setType('lunar')}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-slate-700">음력 🌙</span>
                </label>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer border-l pl-4 border-slate-300">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="accent-rose-500 w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-700 font-medium">매년 반복</span>
              </label>
            </div>
            <button type="submit" className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 shadow-sm ml-auto">
              추가
            </button>
          </div>
        </form>

        {/* 다가오는 3개 */}
        <ul className="divide-y divide-slate-200 text-sm">
          {upcoming3.map((item) => {
            const a = item as Anniversary & { next: Date };
            const isEditing = editId === a.id;
            const isSample = a.user_id === 'sample';

            // D-Day Calc
            const today0 = new Date();
            today0.setHours(0, 0, 0, 0);
            const aNext = new Date(a.next);
            aNext.setHours(0, 0, 0, 0);

            const diffTime = aNext.getTime() - today0.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let dDayStr = "";
            let dDayClass = "bg-slate-100 text-slate-600";

            if (diffDays === 0) {
              dDayStr = "D-Day";
              dDayClass = "bg-rose-100 text-rose-600 font-bold";
            } else if (diffDays > 0) {
              dDayStr = `D-${diffDays}`;
              if (diffDays <= 7) dDayClass = "bg-rose-100 text-rose-600 font-bold";
              else if (diffDays <= 30) dDayClass = "bg-amber-100 text-amber-700";
            } else {
              dDayStr = `지남 (${Math.abs(diffDays)}일 전)`;
              dDayClass = "bg-slate-200 text-slate-500 line-through";
            }

            // 음력일 경우 표시용 날짜: "음 2023-10-23 (양 2023-11-something)"
            // upcoming list shows the NEXT occurrence date in Solar?
            // Usually we show the stored date (Anniversary Date) and the calculated D-day.

            return (
              <li key={a.id} className={`py-3 ${isSample ? 'opacity-75' : ''}`}>
                {isEditing ? (
                  <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-lg">
                    {/* (Edit Form omitted for brevity - same as before but using state) */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-rose-300"
                        placeholder="제목"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`editType-${a.id}`}
                            checked={editType === 'solar'}
                            onChange={() => setEditType('solar')}
                            className="accent-rose-500"
                          />
                          <span className="text-xs text-slate-600">양력</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`editType-${a.id}`}
                            checked={editType === 'lunar'}
                            onChange={() => setEditType('lunar')}
                            className="accent-rose-500"
                          />
                          <span className="text-xs text-slate-600">음력</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer ml-2 border-l pl-3 border-slate-300">
                          <input
                            type="checkbox"
                            checked={editIsRecurring}
                            onChange={(e) => setEditIsRecurring(e.target.checked)}
                            className="accent-rose-500 w-3.5 h-3.5 rounded"
                          />
                          <span className="text-xs text-slate-600 font-medium">매년</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(a.id)}
                          className="rounded-lg bg-emerald-500 px-2 py-1 text-white hover:bg-emerald-600 text-xs"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg bg-slate-200 px-2 py-1 hover:bg-slate-300 text-xs"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`truncate font-medium ${isSample ? 'text-slate-600' : 'text-slate-700'} ${diffDays < 0 ? "text-slate-400" : ""}`}>{a.title} {isSample && "(예시)"}</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {normalizeDateStr(a.date)}
                          {a.type === 'lunar' && <span className="font-bold text-indigo-500 text-[10px]">(음)</span>}
                        </span>

                        {a.is_recurring ? (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">매년</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">1회</span>
                        )}

                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${dDayClass}`}>
                          {dDayStr}
                        </span>
                        {/* 디버깅용: 실제 Solar Date 표시? 
                        <span className="text-[9px] text-gray-300">{fmtYMD(a.next)}</span> 
                        */}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 ml-2">
                      {!isSample && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(a)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(a.id)}
                            className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {upcoming3.length === 0 && (
            <li className="py-6 text-center text-slate-500 text-xs">
              등록된 기념일이 없습니다.
            </li>
          )}
        </ul>
      </SectionCard>

      {/* 달력 */}
      <SectionCard title="달력" subtitle="월별 기념일 확인">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200"
          >
            ← 이전
          </button>
          <div className="text-sm font-bold text-slate-700">
            {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200"
          >
            다음 →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] rounded-lg bg-slate-50/50" />
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const cellDate = new Date(
              viewDate.getFullYear(),
              viewDate.getMonth(),
              dayNum
            );
            const todayFlag = isSameDay(cellDate, new Date());
            const dayItems = (itemsByDay.get(dayNum) || []).slice();

            let badge: { icon: string; label: string; color: string } | null = null;

            if (dayItems.length > 0) {
              // D-Day 계산을 위해 "가장 가까운 D-Day"를 찾자.
              // 여기 있는 dayItems는 이미 이 날짜에 match된 것들이다.
              // 즉 cellDate가 곧 기념일이다.
              // D-Day는 (cellDate - today)
              const today0 = new Date();
              today0.setHours(0, 0, 0, 0);
              const me = new Date(cellDate);
              me.setHours(0, 0, 0, 0);

              const diffTime = me.getTime() - today0.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays >= 0 && diffDays <= 7) {
                badge = {
                  icon: "",
                  label: diffDays === 0 ? "D-Day" : `D-${diffDays}`,
                  color: "bg-rose-100 text-rose-700 font-bold",
                };
              }
            }

            return (
              <div
                key={dayNum}
                className={`min-h-[80px] rounded-lg border p-1 ${todayFlag ? "border-rose-400 ring-1 ring-rose-100" : "border-slate-100"
                  } bg-white flex flex-col`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-xs ${todayFlag ? "text-rose-600 font-bold" : "text-slate-600"
                      }`}
                  >
                    {dayNum}
                  </span>
                  {badge && (
                    <span
                      className={`text-[9px] px-1 rounded ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayItems.slice(0, 3).map((it) => (
                    <div
                      key={it.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] ${it.type === 'lunar' ? "bg-indigo-50 text-indigo-700" : "bg-rose-50 text-rose-700"
                        } ${!it.is_recurring ? "border border-slate-200 opacity-80" : ""}`}
                    >
                      {it.type === 'lunar' && "🌙"} {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[9px] text-slate-400">
                      +{dayItems.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageShell>
  );
}
