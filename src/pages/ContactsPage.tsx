// src/pages/ContactsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase, sb } from "../lib/supabaseClient";
import type { Contact } from "../types/contacts";
import ContactForm from "../components/ContactForm";
import PageShell from "../components/PageShell";

type Mode = "list" | "create" | "edit";

const fmtDate = (iso?: string | null) => {
  if (!iso || iso === "-") return "-";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return String(iso);
  }
};

const importanceDot = (n?: number | null) => {
  const v = (n ?? 1) as 1 | 2 | 3;
  return ({ 1: "🟢", 2: "🟡", 3: "🟥" } as const)[v] ?? "•";
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

  const handleCreate = async (
    payload: Omit<Contact, "id" | "created_at" | "user_id">
  ) => {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
          anniversary: payload.anniversary,
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
    payload: Omit<Contact, "id" | "created_at" | "user_id">
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
          anniversary: payload.anniversary,
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
    <PageShell title="연락처 관리" onHome={onHome}>
      {/* 상단 툴바: 겹침/밀림 방지 - 2그룹 플렉스, 자동 줄바꿈, 최소폭 보장 */}
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Left group: 검색 + 셀렉트 + 초기화 (wrap) */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색: 이름/전화/태그"
            className="h-10 flex-[2_1_260px] min-w-[220px] rounded-xl border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-10 flex-[1_1_160px] min-w-[150px] rounded-xl border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">태그 전체</option>
            {uniqueTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={impFilter}
            onChange={(e) => setImpFilter(e.target.value ? parseInt(e.target.value) : "")}
            className="h-10 flex-[1_1_160px] min-w-[150px] rounded-xl border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">중요도 전체</option>
            <option value="3">3 (높음)</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <button
            onClick={() => {
              setQ("");
              setTagFilter("");
              setImpFilter("");
            }}
            className="h-10 flex-[0_0_auto] rounded-xl border border-slate-300 px-4 text-sm hover:bg-slate-50"
          >
            필터 초기화
          </button>
        </div>

        {/* Right group: 액션 버튼 (한 줄 고정, 필요시 다음 줄로 전체 그룹 이동) */}
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

      {/* 목록 - 데스크톱: 표 / 모바일: 카드 */}
      {mode === "list" && (
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">불러오는 중…</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              등록된 연락처가 없습니다. “+ 연락처 추가”로 시작하세요.
            </div>
          ) : (
            <>
              {/* 📱 모바일 카드 리스트 */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {filtered.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-900">{c.name}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {importanceDot(c.importance)} {c.importance ?? 1}
                          </span>
                        </div>
                        <div className="mt-1 break-words text-sm text-slate-700">{c.phone ?? "-"}</div>
                        <div className="mt-1 break-words text-xs text-slate-500">
                          {(c.tags ?? []).join(", ") || "-"}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>생일: {fmtDate(c.birthday)}</div>
                          <div>기념일: {fmtDate(c.anniversary)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => startEdit(c)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleRemove(c.id)}
                          className="rounded-lg border border-rose-200 px-3 py-1 text-sm hover:bg-rose-50 disabled:opacity-50"
                          disabled={busy}
                        >
                          삭제
                        </button>
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
                      <th>태그</th>
                      <th>중요도</th>
                      <th>생일</th>
                      <th>기념일</th>
                      <th className="w-28 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3">
                        <td className="break-words">{c.name}</td>
                        <td className="break-words">{c.phone ?? "-"}</td>
                        <td className="break-words">{(c.tags ?? []).join(", ") || "-"}</td>
                        <td>
                          {importanceDot(c.importance)} {c.importance ?? 1}
                        </td>
                        <td>{fmtDate(c.birthday)}</td>
                        <td>{fmtDate(c.anniversary)}</td>
                        <td className="text-right">
                          <div className="inline-flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded-xl border border-slate-300 px-3 py-1 hover:bg-slate-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleRemove(c.id)}
                              className="rounded-xl border border-rose-200 px-3 py-1 hover:bg-rose-50 disabled:opacity-50"
                              disabled={busy}
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
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {mode === "create" ? "연락처 추가" : "연락처 수정"}
            </h3>
            <button
              className="text-sm text-slate-600 hover:underline"
              onClick={() => setMode("list")}
            >
              목록으로
            </button>
          </div>
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
