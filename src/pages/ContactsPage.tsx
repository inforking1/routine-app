// src/pages/ContactsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase, sb } from "../lib/supabaseClient";
import type { Contact } from "../types/contacts";
import ContactForm from "../components/ContactForm";
import PageShell from "../components/PageShell";
import { useCarePicks } from "../hooks/useCarePicks";

type Mode = "list" | "create" | "edit";

const fmtDate = (iso?: string | null) => {
  if (!iso || iso === "-") return "-";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return String(iso);
  }
};

const getDaysDiff = (iso?: string | null) => {
  if (!iso) return Infinity;
  const now = new Date();
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;

  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
};

const importanceIcon = (n?: number | null) => {
  const v = (n ?? 1) as 1 | 2 | 3;
  // ★ 최우선 / ● 보통 / ○ 가벼움
  return ({ 3: "★", 2: "●", 1: "○" } as const)[v] ?? "○";
};

// 생일/기념일 배지 (오늘/이번주)
const EventBadge = ({ date, type }: { date?: string | null, type: '생일' | '기념일' }) => {
  if (!date) return null;

  // Parse date safely
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compare Month/Date only for recurrence
  const currentYear = today.getFullYear();
  const target = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());

  // If already passed this year, check next year (for upcoming logic)
  if (target < today) {
    target.setFullYear(currentYear + 1);
  }

  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-600">🎂 오늘 {type}</span>;
  if (diff > 0 && diff <= 7) return <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">D-{diff} {type}</span>;
  return null;
};

export default function ContactsPage({ onHome }: { onHome?: () => void }) {
  const [mode, setMode] = useState<Mode>("list");
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);

  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [impFilter, setImpFilter] = useState<number | "">("");

  // Care Picks Hook
  const { picks, deferContact, todayContactCount } = useCarePicks(items);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setItems(((data ?? []) as Contact[]).map((c) => ({ ...c })));

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleContacted = async (id: string) => {
    const nowStr = new Date().toISOString(); // timestamptz format

    // Optimistic Update
    setItems(prev => prev.map(c => c.id === id ? { ...c, last_contacted_at: nowStr } : c));

    // DB Update
    try {
      const { error } = await sb.from("contacts").update({ last_contacted_at: nowStr }).eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("연락 기록 업데이트 실패");
      fetchAll(); // Rollback
    }
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const uniqueTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((c) => (c.tags ?? []).forEach((t) => t && s.add(t)));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let arr = [...items];
    const keyword = q.trim().toLowerCase();
    if (keyword) {
      arr = arr.filter((c) =>
        [c.name, c.phone, (c.tags ?? []).join(", ")].some((v) =>
          (v ?? "").toLowerCase().includes(keyword)
        )
      );
    }
    if (tagFilter.trim()) {
      const t = tagFilter.trim().toLowerCase();
      arr = arr.filter((c) => (c.tags ?? []).some((x) => (x ?? "").toLowerCase() === t));
    }
    if (impFilter) {
      arr = arr.filter((c) => (c.importance ?? 1) === impFilter);
    }
    return arr;
  }, [items, q, tagFilter, impFilter]);

  // ... (Existing Handlers: Create, Update, Remove)
  const handleCreate = async (
    payload: Omit<Contact, "id" | "created_at" | "user_id" | "last_contacted_at">
  ) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data, error } = await sb
        .from("contacts")
        .insert({
          user_id: user.id,
          name: payload.name,
          phone: payload.phone,
          tags: payload.tags ?? [],
          importance: payload.importance ?? 1,
          birthday: payload.birthday,
          birthday_type: payload.birthday_type ?? 'solar',
          anniversary: payload.anniversary,
          anniversary_type: payload.anniversary_type ?? 'solar',
          last_contacted_at: null,
        })
        .select("*")
        .single();

      if (error) throw error;
      setItems((prev) => [data as Contact, ...prev]);
      setMode("list");
    } catch (e: any) {
      alert(e.message ?? "연락처 추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (
    payload: Omit<Contact, "id" | "created_at" | "user_id" | "last_contacted_at">
  ) => {
    if (!editing) return;
    setBusy(true);
    try {
      const { data, error } = await sb
        .from("contacts")
        .update({
          name: payload.name,
          phone: payload.phone,
          tags: payload.tags ?? [],
          importance: payload.importance ?? 1,
          birthday: payload.birthday,
          birthday_type: payload.birthday_type ?? 'solar',
          anniversary: payload.anniversary,
          anniversary_type: payload.anniversary_type ?? 'solar',
        })
        .eq("id", editing.id)
        .select("*")
        .single();

      if (error) throw error;
      setItems((prev) =>
        prev.map((c) => (c.id === editing.id ? (data as Contact) : c))
      );
      setEditing(null);
      setMode("list");
    } catch (e: any) {
      alert(e.message ?? "연락처 수정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("해당 연락처를 삭제할까요?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.message ?? "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: Contact) => {
    setEditing(c);
    setMode("edit");
  };

  return (
    <PageShell title="안부 (Contacts)" onHome={onHome}>
      {/* 1. Today's Care Picks */}
      {mode === "list" && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm border border-indigo-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-indigo-900">오늘의 안부 👋</h2>
              <p className="text-xs text-indigo-600">하루 3명에게 안부를 전해보세요.</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-indigo-500 block">오늘 완료</span>
              <span className="text-xl font-bold text-indigo-700">{todayContactCount} / 3</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {picks.length === 0 ? (
              <div className="col-span-3 py-4 text-center text-sm text-indigo-400">
                {items.length === 0 ? "연락처를 먼저 추가해주세요." : "오늘 추천할 안부 대상이 없습니다."}
              </div>
            ) : (
              picks.map(p => {
                // Check if contacted today (KST) safely
                let isDone = false;
                try {
                  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
                  if (p.last_contacted_at) {
                    const d = new Date(p.last_contacted_at);
                    if (!isNaN(d.getTime())) {
                      const lastContactKst = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
                      isDone = lastContactKst === nowKst;
                    }
                  }
                } catch (e) {
                  // Ignore date parse errors
                }

                return (
                  <div key={p.id} className={`rounded-xl border p-3 bg-white shadow-sm transition-all ${isDone ? "opacity-60 border-indigo-100 bg-indigo-50/50" : "border-indigo-100 hover:border-indigo-300 hover:shadow-md"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          {p.name}
                          <EventBadge date={p.birthday} type="생일" />
                          <EventBadge date={p.anniversary} type="기념일" />
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {importanceIcon(p.importance)} {p.last_contacted_at ? `${getDaysDiff(p.last_contacted_at)}일 전 연락` : "아직 연락 없음"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {isDone ? (
                        <button disabled className="flex-1 rounded-lg bg-indigo-100 py-1.5 text-xs font-bold text-indigo-400 cursor-default">
                          완료됨 ✅
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleContacted(p.id)}
                            className="flex-1 rounded-lg bg-indigo-500 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 transition-colors"
                          >
                            연락 완료
                          </button>
                          <button
                            onClick={() => deferContact(p.id)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200"
                          >
                            미루기
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 상단 툴바 */}
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Left group */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색: 이름/전화/태그"
            className="h-10 flex-[2_1_220px] min-w-[200px] rounded-xl border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-10 flex-[1_1_150px] min-w-[120px] rounded-xl border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">태그 전체</option>
            {uniqueTags.map((t) => (
              <option key={t} value={t}> {t} </option>
            ))}
          </select>
          <select
            value={impFilter}
            onChange={(e) => setImpFilter(e.target.value ? parseInt(e.target.value) : "")}
            className="h-10 flex-[1_1_150px] min-w-[120px] rounded-xl border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">중요도 전체</option>
            <option value="3">★ 최우선</option>
            <option value="2">● 보통</option>
            <option value="1">○ 가벼움</option>
          </select>
          <button
            onClick={() => { setQ(""); setTagFilter(""); setImpFilter(""); }}
            className="h-10 rounded-xl border border-slate-300 px-4 text-sm hover:bg-slate-50"
          >
            초기화
          </button>
        </div>

        {/* Right group */}
        <div className="flex flex-none flex-nowrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => setMode("create")}
            className="h-10 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50"
          >
            + 연락처 추가
          </button>
          <button
            onClick={fetchAll}
            className="h-10 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={loading || busy}
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 목록 */}
      {mode === "list" && (
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">불러오는 중…</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              검색 결과가 없습니다.
            </div>
          ) : (
            <>
              {/* 📱 모바일 카드 */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {filtered.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="truncate font-medium text-slate-900">{c.name}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {importanceIcon(c.importance)}
                          </span>
                          {c.birthday && (
                            <div className="flex items-center">
                              <EventBadge date={c.birthday} type="생일" />
                              {c.birthday_type === 'lunar' && <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded ml-1">음</span>}
                            </div>
                          )}
                          {c.anniversary && (
                            <div className="flex items-center">
                              <EventBadge date={c.anniversary} type="기념일" />
                              {c.anniversary_type === 'lunar' && <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded ml-1">음</span>}
                            </div>
                          )}
                        </div>
                        <div
                          className="mt-1 break-words text-sm text-slate-700 cursor-pointer hover:text-indigo-600"
                          onClick={() => handleCall(c.phone)}
                        >
                          {c.phone ? `📞 ${c.phone}` : "-"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {c.last_contacted_at ? `${getDaysDiff(c.last_contacted_at)}일 전 연락` : "연락 기록 없음"}
                        </div>
                        <div className="mt-1 break-words text-xs text-slate-400">
                          {(c.tags ?? []).join(", ")}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          onClick={() => handleContacted(c.id)}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-100"
                        >
                          연락함
                        </button>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(c)} className="rounded border px-2 py-1 text-xs">수정</button>
                          <button onClick={() => handleRemove(c.id)} className="rounded border border-rose-100 px-2 py-1 text-xs text-rose-600">삭제</button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 🖥️ 데스크톱 표 */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="[&>th]:px-4 [&>th]:py-3">
                      <th>이름</th>
                      <th>전화</th>
                      <th>중요도</th>
                      <th>마지막 연락</th>
                      <th>관련 날짜</th>
                      <th className="w-32 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3">
                        <td>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-slate-400">{(c.tags ?? []).join(", ")}</div>
                        </td>
                        <td
                          className="text-slate-600 cursor-pointer hover:text-indigo-600"
                          onClick={() => handleCall(c.phone)}
                          title="클릭하여 전화걸기"
                        >
                          {c.phone ?? "-"}
                        </td>
                        <td className="text-slate-500">{importanceIcon(c.importance)}</td>
                        <td className="text-slate-600">
                          {c.last_contacted_at ? (
                            <span title={c.last_contacted_at.slice(0, 10)}>
                              {getDaysDiff(c.last_contacted_at)}일 전
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            {c.birthday && (
                              <span className="text-xs flex items-center">
                                🎂 {fmtDate(c.birthday)}
                                {c.birthday_type === 'lunar' && <span className="ml-1 text-[10px] text-slate-500 bg-slate-100 px-1 rounded">음력</span>}
                                <EventBadge date={c.birthday} type="생일" />
                              </span>
                            )}
                            {c.anniversary && (
                              <span className="text-xs flex items-center">
                                🎉 {fmtDate(c.anniversary)}
                                {c.anniversary_type === 'lunar' && <span className="ml-1 text-[10px] text-slate-500 bg-slate-100 px-1 rounded">음력</span>}
                                <EventBadge date={c.anniversary} type="기념일" />
                              </span>
                            )}
                            {!c.birthday && !c.anniversary && <span className="text-slate-300 text-xs">-</span>}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleContacted(c.id)}
                              className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100"
                              title="오늘 연락함 처리"
                            >
                              연락함
                            </button>
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleRemove(c.id)}
                              className="rounded border border-rose-100 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 추가 / 수정 */}
      {(mode === "create" || (mode === "edit" && editing)) && (
        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          {/* Header is now inside ContactForm for better cohesion, providing a clean card */}
          <ContactForm
            initial={mode === "edit" ? editing ?? undefined : undefined}
            onSubmit={mode === "edit" ? handleUpdate : handleCreate}
            onCancel={() => setMode("list")}
            busy={busy}
          />
        </div>
      )}
    </PageShell>
  );
}
