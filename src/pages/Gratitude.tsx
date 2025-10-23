// src/pages/Gratitude.tsx
import { useEffect, useMemo, useState, FormEvent } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import useAuth from "../hooks/useAuth";
import { createSource, Gratitude as DbGratitude } from "../utils/dataSource";

const today = () => new Date().toISOString().slice(0, 10);

function byRecent(a: DbGratitude, b: DbGratitude) {
  const ad = (a.date ?? a.created_at.slice(0, 10)) + " " + a.created_at;
  const bd = (b.date ?? b.created_at.slice(0, 10)) + " " + b.created_at;
  return bd.localeCompare(ad);
}

// createSource(userId)가 실제로 제공하는 감사일기 메서드 시그니처를
// 이 파일에서 명시적으로 좁혀서 타입 오류 제거
interface GratitudeSource {
  listGratitude: (limit?: number) => Promise<DbGratitude[]>;
  addGratitude: (text: string, date?: string) => Promise<DbGratitude>;
  removeGratitude: (id: string) => Promise<void>;
}

export default function Gratitude({ onHome }: { onHome: () => void }) {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;

  // ---- form state
  const [date, setDate] = useState<string>(today());
  const [text, setText] = useState<string>("");

  // ---- data state
  const [items, setItems] = useState<DbGratitude[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ---- hybrid: mobile tab (write | list). md 이상에서는 항상 2컬럼
  const [mobileTab, setMobileTab] = useState<"write" | "list">("write");

  // fetch
  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource;
      const list = await src.listGratitude(200);
      list.sort(byRecent);
      setItems(list);
    } catch (e: any) {
      console.error(e);
      setError("감사일기를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const t = text.trim();
    if (!t) return;

    setBusy(true);
    setError(null);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource;
      // ✅ 시그니처에 맞게 객체가 아니라 문자열 인자 전달
      const saved = await src.addGratitude(t, date);
      setItems((prev) => [saved, ...prev].sort(byRecent));
      setText("");
      setDate(today());
      // 모바일에서는 저장 후 '기록' 탭으로 자동 전환
      setMobileTab("list");
    } catch (e: any) {
      console.error(e);
      setError("기록 저장에 실패했습니다.");
      alert("기록 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string | number) => {
    if (!user?.id) return;
    if (!confirm("이 감사 기록을 삭제할까요?")) return;

    const idStr = String(id); // ✅ 숫자/문자 통일

    setBusy(true);
    setError(null);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource;

      // 런타임에 id 타입 이슈 방지
      await src.removeGratitude(idStr);

      // 낙관적 업데이트: 문자열 비교로 통일
      setItems((prev) => prev.filter((it) => String(it.id) !== idStr));
    } catch (e: any) {
      console.error(e);
      setError("삭제에 실패했습니다.");
      alert("삭제에 실패했습니다.");
    } finally {
      setBusy(false);
      // ✅ 백엔드와 최종 동기화 (권장)
      refresh();
    }
  };

  const getDisplayDate = (g: DbGratitude) =>
    g.date ?? g.created_at.slice(0, 10);

  // 검색/필터
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return items;
    return items.filter((it) =>
      it.text.toLowerCase().includes(s.toLowerCase())
    );
  }, [items, q]);

  return (
    <PageShell title="감사일기" onHome={onHome}>
      {/* 모바일 전용 탭: md 이상에서는 숨김 */}
      <div className="mb-3 grid grid-cols-2 gap-1 md:hidden">
        <button
          className={`rounded-xl border px-3 py-2 text-sm ${
            mobileTab === "write"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-white border-slate-200 text-slate-700"
          }`}
          onClick={() => setMobileTab("write")}
        >
          작성
        </button>
        <button
          className={`rounded-xl border px-3 py-2 text-sm ${
            mobileTab === "list"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-white border-slate-200 text-slate-700"
          }`}
          onClick={() => setMobileTab("list")}
        >
          기록
        </button>
      </div>

      {/* HYBRID 레이아웃: md 이상 2열, 모바일은 탭에 따라 1열 전환 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 작성 카드 */}
        <div className={`${mobileTab === "list" ? "hidden md:block" : "block"}`}>
          <SectionCard
            title="오늘의 감사"
            subtitle="작은 감사가 행복을 키웁니다"
          >
            {!user && (
              <p className="mb-3 text-sm text-rose-600">
                로그인 후 감사일기를 기록하고 저장할 수 있습니다.
              </p>
            )}

            <form
              className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[auto,1fr,auto] sm:items-center"
              onSubmit={handleAdd}
            >
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm outline-none focus:ring-2 focus:ring-rose-300"
                disabled={!user || busy}
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예) 아침 햇살 덕분에 기분이 좋았다"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm outline-none focus:ring-2 focus:ring-rose-300"
                disabled={!user || busy}
              />
              <button
                className="rounded-xl bg-rose-500 px-4 py-3 text-base text-white hover:bg-rose-600 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
                disabled={!user || busy}
              >
                {busy ? "기록 중…" : "기록"}
              </button>
            </form>

            {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}

            {/* 모바일 안내 */}
            <p className="text-xs text-slate-400 md:hidden">
              저장 후 자동으로 ‘기록’ 탭으로 이동합니다.
            </p>
          </SectionCard>
        </div>

        {/* 기록 카드 */}
        <div className={`${mobileTab === "write" ? "hidden md:block" : "block"}`}>
          <SectionCard
            title="내 기록"
            subtitle="최근 순 · 검색 가능"
          >
            <div className="mb-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="키워드로 검색"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-rose-300 md:py-2 md:text-sm"
              />
            </div>

            <div className="md:max-h-[60vh] md:overflow-auto">
              {loading ? (
                <p className="text-sm text-slate-500">불러오는 중…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-400">기록이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-200 text-sm">
                  {filtered.map((it) => (
                    <li key={it.id} className="flex items-center justify-between py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600">
                          {getDisplayDate(it)}
                        </span>
                        <span className="truncate">{it.text}</span>
                      </div>
                      <button
                        onClick={() => handleRemove(it.id)}
                        className="rounded-lg border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        disabled={busy}
                        title="삭제"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
