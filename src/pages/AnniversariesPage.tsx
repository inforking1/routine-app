// src/pages/AnniversariesPage.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import { supabase } from "../lib/supabase";

/** ===== types ===== */
export type Anniversary = {
  id: string;          // uuid
  user_id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  created_at: string;  // ISO
  // note?: string | null;     // (스키마에 있을 수 있으나 UI 미사용)
  // pinned?: boolean;         // (스키마에 있을 수 있으나 UI 미사용)
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
  // 그 외 이상치는 오늘로 보정
  return fmtYMD(new Date());
}

/** 다가오는 순 정렬을 위한 다음 발생일 계산 */
function nextOccurrenceDate(ymd: string, today: Date): Date {
  const d = parseYMD(normalizeDateStr(ymd));
  const tY = today.getFullYear();
  const thisYear = new Date(tY, d.getMonth(), d.getDate());
  const today0 = new Date(tY, today.getMonth(), today.getDate());
  if (d.getFullYear() > tY) return d; // 명시적으로 미래 연도면 그대로
  if (thisYear >= today0) return thisYear;
  return new Date(tY + 1, d.getMonth(), d.getDate()); // 이미 지났다면 내년
}

export default function AnniversariesPage({ onHome }: Props) {
  /** ===== state ===== */
  const [items, setItems] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 입력 폼
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  // 수정 폼
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

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
          .select("id,user_id,title,date,created_at")
          .eq("user_id", auth.user.id)
          .order("date", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        const normalized = (data ?? []).map((it) => ({
          ...it,
          date: normalizeDateStr(String(it.date)),
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

      // optimistic
      const temp: Anniversary = {
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        title: t,
        date: d,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, temp]);

      const { data, error } = await supabase
        .from("anniversaries")
        .insert({
          user_id: auth.user.id,
          title: t,
          date: d,
        })
        .select("id,user_id,title,date,created_at")
        .single();

      if (error) throw error;

      // temp → real 로 교체
      setItems((prev) => [data as Anniversary, ...prev.filter((x) => x.id !== temp.id)]);
      setTitle("");
      setDate("");
    } catch (e: any) {
      setError("추가 실패: " + (e?.message ?? String(e)));
      // 롤백
      setItems((prev) => prev.filter((x) => x.title !== title || x.date !== date));
    }
  };

  /** ===== edit ===== */
  const startEdit = (a: Anniversary) => {
    setEditId(a.id);
    setEditTitle(a.title);
    setEditDate(a.date);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditTitle("");
    setEditDate("");
  };
  const saveEdit = async (id: string) => {
    const t = editTitle.trim();
    const d = normalizeDateStr(editDate);
    if (!t || !d) return;

    const backup = items;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, title: t, date: d } : it)));

    try {
      const { error } = await supabase.from("anniversaries").update({ title: t, date: d }).eq("id", id);
      if (error) throw error;
      cancelEdit();
    } catch (e: any) {
      setError("수정 실패: " + (e?.message ?? String(e)));
      setItems(backup);
    }
  };

  /** ===== remove ===== */
  const removeItem = async (id: string) => {
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
    const withNext = items.map((it) => ({ it, next: nextOccurrenceDate(it.date, today) }));
    withNext.sort((a, b) => a.next.getTime() - b.next.getTime());
    return withNext.slice(0, 3).map((x) => x.it);
  }, [items]);

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
      const d = parseYMD(normalizeDateStr(it.date));
      if (d.getFullYear() === y && d.getMonth() === m) {
        map.get(d.getDate())!.push(it);
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
          • Supabase 스키마(anniversaries의 title/date/user_id) 확인<br />
          • Settings → API → Reload로 스키마 캐시 갱신
        </p>
      </div>
    );
  }

  return (
    <PageShell title="기념일" onHome={onHome}>
      <SectionCard title="기념일(Anniversaries)" subtitle="중요한 날 잊지 않기">
        {/* 입력 */}
        <form className="mb-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (예: 부모님 결혼기념일)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button type="submit" className="rounded-xl bg-rose-500 px-3 py-2 text-white hover:bg-rose-600">
            추가
          </button>
        </form>

        {/* 다가오는 3개 */}
        <ul className="divide-y divide-slate-200 text-sm">
          {upcoming3.map((a) => {
            const isEditing = editId === a.id;
            return (
              <li key={a.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-rose-300"
                        placeholder="제목"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </>
                  ) : (
                    <>
                      <span className="truncate">{a.title}</span>
                      <span className="ml-auto rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600">
                        {normalizeDateStr(a.date)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(a.id)}
                        className="rounded-lg bg-emerald-500 px-2 py-1 text-white hover:bg-emerald-600"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg bg-slate-200 px-2 py-1 hover:bg-slate-300"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="rounded-lg bg-slate-200 px-2 py-1 hover:bg-slate-300"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(a.id)}
                        className="rounded-lg bg-rose-100 px-2 py-1 text-rose-700 hover:bg-rose-200"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {upcoming3.length === 0 && (
            <li className="py-6 text-center text-slate-500">
              다가오는 3개의 기념일이 없어요. 위에서 추가해 보세요.
            </li>
          )}
        </ul>

        <p className="mt-2 text-xs text-slate-500">
          리스트에는 ‘다가오는 3개’만 보여주고, 전체는 아래 달력에서 확인합니다.
        </p>
      </SectionCard>

      {/* 달력 */}
      <SectionCard title="달력" subtitle="이번 달 기념일 한눈에 보기">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-lg bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300"
          >
            ← 이전
          </button>
          <div className="text-sm font-semibold">
            {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-lg bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300"
          >
            다음 →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {/* 시작 공백 */}
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 rounded-lg bg-slate-50" />
          ))}

          {/* 실제 날짜 */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const cellDate = new Date(
              viewDate.getFullYear(),
              viewDate.getMonth(),
              dayNum
            );
            const todayFlag = isSameDay(cellDate, new Date());
            const dayItems = (itemsByDay.get(dayNum) || []).slice();

            // 기본: 뱃지 없음
            let badge: { icon: string; label: string; color: string } | null = null;

            // 기념일이 있는 칸에만 D-X 뱃지 계산/표시
            if (dayItems.length > 0) {
              const a = new Date();
              a.setHours(0, 0, 0, 0);
              const b = new Date(cellDate);
              b.setHours(0, 0, 0, 0);
              const diff = Math.ceil(
                (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
              ); // 오늘 D-0

              if (diff >= 0 && diff <= 7) {
                badge = {
                  icon: "🟥",
                  label: `D-${diff}`,
                  color: "bg-rose-100 text-rose-700",
                };
              } else if (diff > 7 && diff <= 14) {
                badge = {
                  icon: "🟧",
                  label: `D-${diff}`,
                  color: "bg-amber-100 text-amber-700",
                };
              } else if (diff > 14 && diff <= 30) {
                badge = {
                  icon: "🟡",
                  label: `D-${diff}`,
                  color: "bg-yellow-100 text-yellow-700",
                };
              }
            }

            return (
              <div
                key={dayNum}
                className={`h-24 rounded-lg border p-1 ${
                  todayFlag ? "border-rose-400" : "border-slate-200"
                } bg-white`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-xs ${
                      todayFlag ? "text-rose-600 font-semibold" : "text-slate-600"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {badge && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badge.color}`}
                    >
                      <span aria-hidden>{badge.icon}</span>
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 overflow-y-auto text-[11px] leading-tight">
                  {dayItems.slice(0, 3).map((it) => (
                    <div
                      key={it.id}
                      className="truncate rounded bg-rose-50 px-1 py-0.5 text-rose-700"
                    >
                      {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-slate-500">
                      +{dayItems.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          목록에서 추가·수정·삭제하면 달력에도 즉시 반영됩니다.
        </p>
      </SectionCard>
    </PageShell>
  );
}
