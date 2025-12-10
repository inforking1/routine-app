// src/pages/Gratitude.tsx
import { type FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import useAuth from "../hooks/useAuth";
import { createSource, type Gratitude as DbGratitude } from "../utils/dataSource";

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

const SAMPLE_GRATITUDE: DbGratitude[] = [
  { id: 'sample-1', user_id: 'sample', text: '아침에 마신 따뜻한 커피 한 잔에 감사합니다. (예시)', created_at: new Date().toISOString(), date: new Date().toISOString().slice(0, 10) },
  { id: 'sample-2', user_id: 'sample', text: '오늘도 건강하게 하루를 시작할 수 있어 감사합니다. (예시)', created_at: new Date().toISOString(), date: new Date().toISOString().slice(0, 10) },
];

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

  const [selectedEntry, setSelectedEntry] = useState<DbGratitude | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const isEmpty = items.length === 0;

  // Modal open 시 edit state 초기화
  useEffect(() => {
    if (selectedEntry) {
      setEditContent(selectedEntry.text);
      setIsEditing(false);
    }
  }, [selectedEntry]);

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

  const handleUpdate = async () => {
    if (!user?.id || !selectedEntry) return;
    if (selectedEntry.user_id === 'sample') return;

    const newText = editContent.trim();
    if (!newText) {
      alert("내용을 입력해주세요.");
      return;
    }

    setBusy(true);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource & { updateGratitude: (id: string, text: string) => Promise<DbGratitude> };

      const updated = await src.updateGratitude(selectedEntry.id, newText);

      // Update local state
      setItems(prev => prev.map(it => it.id === updated.id ? updated : it));
      setSelectedEntry(updated);
      setIsEditing(false);
    } catch (e: any) {
      console.error(e);
      alert("수정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const t = text.trim();
    if (!t) return;

    setBusy(true);
    setError(null);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource;
      const saved = await src.addGratitude(t, date);
      setItems((prev) => [saved, ...prev].sort(byRecent));
      setText("");
      setDate(today());
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
    const idStr = String(id);
    if (idStr.startsWith('sample-')) return;
    if (!confirm("이 감사 기록을 삭제할까요?")) return;


    setBusy(true);
    setError(null);
    try {
      const src = createSource(user.id) as unknown as GratitudeSource;
      await src.removeGratitude(idStr);
      setItems((prev) => prev.filter((it) => String(it.id) !== idStr));
      if (selectedEntry?.id === idStr) setSelectedEntry(null);
    } catch (e: any) {
      console.error(e);
      setError("삭제에 실패했습니다.");
      alert("삭제에 실패했습니다.");
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const getDisplayDate = (g: DbGratitude) =>
    g.date ?? g.created_at.slice(0, 10);

  // 검색/필터
  const [q, setQ] = useState("");
  const displayItems = useMemo(() => {
    // 🚀 Show SCAMPLES if empty and no search query
    if (isEmpty && !q) return SAMPLE_GRATITUDE;

    const s = q.trim();
    if (!s) return items;
    return items.filter((it) =>
      it.text.toLowerCase().includes(s.toLowerCase())
    );
  }, [items, q, isEmpty]);

  return (
    <PageShell title="감사일기" onHome={onHome}>
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        {/* 1. 작성 카드 */}
        <SectionCard
          title="오늘의 감사"
          subtitle="작은 감사가 행복을 키웁니다"
        >
          {/* 🚀 Onboarding Hint */}
          {isEmpty && (
            <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span>📔</span>
              <p>하루에 3가지 감사한 일을 적어보세요. 삶의 만족도가 올라갑니다.</p>
            </div>
          )}

          {!user && (
            <p className="mb-3 text-sm text-rose-600">
              로그인 후 감사일기를 기록하고 저장할 수 있습니다.
            </p>
          )}

          <form
            className="mb-1 grid grid-cols-1 gap-2 sm:grid-cols-[auto,1fr,auto] sm:items-center"
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
              placeholder={isEmpty ? "예) 맛있는 점심을 먹어 감사합니다." : "예) 아침 햇살 덕분에 기분이 좋았다"}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm outline-none focus:ring-2 focus:ring-rose-300"
              disabled={!user || busy}
            />
            <button
              className="rounded-xl bg-rose-500 px-4 py-3 text-base text-white hover:bg-rose-600 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm font-bold shadow-sm"
              disabled={!user || busy}
            >
              {busy ? "기록 중…" : "기록"}
            </button>
          </form>

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </SectionCard>

        {/* 2. 기록 카드 */}
        <SectionCard
          title="내 기록"
          subtitle="쌓여가는 감사 마음"
        >
          <div className="mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="키워드로 검색..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-rose-300"
              disabled={isEmpty && !q}
            />
          </div>

          <div>
            {loading ? (
              <p className="text-sm text-slate-500 py-4 text-center">불러오는 중…</p>
            ) : displayItems.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-2xl block mb-2">🍃</span>
                <p className="text-sm text-slate-500">아직 기록이 없습니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 text-sm">
                {displayItems.map((it) => {
                  const isSample = it.user_id === 'sample';
                  return (
                    <li
                      key={it.id}
                      className={`group relative flex items-center justify-between py-3 px-2 -mx-2 rounded-lg transition-colors cursor-pointer active:bg-slate-100 ${isSample ? 'bg-slate-50/50 opacity-80' : 'hover:bg-slate-50'}`}
                      onClick={() => !isSample && setSelectedEntry(it)} // Sample not clickable for detail? Or allow detail but block edit.
                    // Let's allow clicking sample to see detail, but hide edit buttons there.
                    // Actually, let's block clicking samples to avoid confusion if they can't edit.
                    // User req: "Samples... disable interaction (buttons)". Detail view IS interaction.
                    // I will disable click for samples.
                    >
                      <div className="flex min-w-0 items-center gap-3 flex-1 mr-3">
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 font-medium">
                          {getDisplayDate(it)}
                        </span>
                        <span className={`truncate ${isSample ? 'text-slate-600' : 'text-slate-800'}`}>{it.text} {isSample && "(예시)"}</span>
                      </div>
                      {!isSample && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 부모(리스트 아이템) 클릭 방지
                            handleRemove(it.id);
                          }}
                          className="shrink-0 rounded-lg text-xs text-slate-400 hover:text-rose-600 px-2 py-1 hover:bg-rose-50 transition-colors ml-auto z-10"
                          disabled={busy}
                          title="삭제"
                        >
                          삭제
                        </button>
                      )}
                      {!isSample && (
                        /* PC hover시 보이는 '더보기' 아이콘 (선택 사항) */
                        <span className="absolute right-12 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity md:block hidden">
                          🔍
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 3. 상세 보기 모달 */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 transition-opacity animate-in fade-in duration-200">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200 p-6 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div>
                <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 mb-1">
                  감사일기
                </span>
                <h3 className="text-xl font-bold text-slate-800">
                  {getDisplayDate(selectedEntry)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="닫기"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 p-4 rounded-xl">
              {isEditing ? (
                <textarea
                  className="w-full h-full min-h-[150px] bg-white rounded-lg p-3 text-slate-800 text-[15px] leading-relaxed resize-none outline-none focus:ring-2 focus:ring-rose-200 border border-slate-200"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="감사한 내용을 수정해보세요."
                  autoFocus
                />
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
                  {selectedEntry.text}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 shrink-0">
              {/* If sample, disable edit/delete here too? 
                  But wait, I disabled clicking sample, so selectedEntry shouldn't be a sample.
                  Safe guard anyway.
               */}
              {selectedEntry.user_id !== 'sample' && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={busy}
                        className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-600 transition-transform active:scale-95"
                      >
                        저장
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 삭제 버튼 - 좌측 배치 */}
                      <button
                        onClick={() => {
                          if (confirm("정말 삭제하시겠습니까?")) {
                            handleRemove(selectedEntry.id);
                            setSelectedEntry(null);
                          }
                        }}
                        className="rounded-xl px-2 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors mr-auto"
                      >
                        삭제
                      </button>

                      <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100"
                      >
                        수정
                      </button>

                      <button
                        onClick={() => setSelectedEntry(null)}
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition-transform active:scale-95"
                      >
                        창 닫기
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
