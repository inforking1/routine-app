// src/pages/BucketList.tsx
import { type FormEvent, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import useAuth from "../hooks/useAuth";
import { supabase, sb } from "../lib/supabaseClient";
import { Star, StarOff, CheckCircle, Circle, Trash2, Edit3 } from "lucide-react";

type DbBucketItem = {
  id: string;
  user_id: string;
  title: string;
  done: boolean | null;
  created_at: string;
};


const SAMPLE_BUCKET_ITEMS: DbBucketItem[] = [
  { id: 'sample-1', user_id: 'sample', title: '스카이다이빙 도전하기 (예시)', done: false, created_at: new Date().toISOString() },
  { id: 'sample-2', user_id: 'sample', title: '부모님과 해외여행 가기 (예시)', done: false, created_at: new Date().toISOString() },
];

export default function BucketList({
  onHome,
}: {
  onHome: () => void;
}) {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;

  const [items, setItems] = useState<DbBucketItem[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 홈 노출용 선택(최대 3개)
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const isEmpty = items.length === 0;

  // ---- 로드 ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      // 버킷 항목
      const { data: rows, error } = await supabase
        .from("bucket_items")
        .select("id,user_id,title,done,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && rows) setItems(rows as DbBucketItem[]);

      // 선택된 3개
      const { data: picks } = await supabase
        .from("bucket_picks")
        .select("item_id")
        .eq("user_id", user.id);
      if (picks && picks.length > 0) {
        setPickedIds(new Set(picks.map((p: any) => p.item_id as string)));
      } else {
        setPickedIds(new Set());
      }
    })();
  }, [user]);



  // ---- 추가 ----
  const addItem = async (title: string) => {
    if (!user) return;
    const payload = { user_id: user.id, title, done: false };
    const { data, error } = await sb
      .from("bucket_items")
      .insert(payload)
      .select("id,user_id,title,done,created_at")
      .single();
    if (error) {
      alert("추가에 실패했습니다.");
      return;
    }
    setItems((prev) => [data as DbBucketItem, ...prev]);
  };

  // ---- 완료 토글 ----
  const toggleItem = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;
    if (target.user_id === 'sample') return; // Sample check

    setBusyId(id);
    const nextDone = !target.done;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: nextDone } : it)));
    try {
      const { error } = await sb
        .from("bucket_items")
        .update({ done: nextDone })
        .eq("id", id);
      if (error) throw error;
    } catch (e) {
      // 롤백
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: target.done } : it)));
      alert("저장에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  // ---- 삭제 ----
  const removeItem = async (id: string) => {
    if (id.startsWith('sample-')) return;
    if (!confirm("삭제하시겠습니까?")) return;
    const prev = items;
    setItems((p) => p.filter((it) => it.id !== id));
    try {
      // 선택 목록에도 있으면 제거
      setPickedIds((set) => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
      const { error } = await sb.from("bucket_items").delete().eq("id", id);
      if (error) throw error;
      // picks 테이블도 정리
      await sb.from("bucket_picks").delete().eq("item_id", id);
    } catch (e) {
      setItems(prev);
      alert("삭제에 실패했습니다.");
    }
  };

  // ---- 홈 표시 선택(최대 3) ----
  const togglePick = (id: string) => {
    if (id.startsWith('sample-')) return;
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          alert("홈에는 최대 3개까지만 선택할 수 있어요.");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const savePicks = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 전체 삭제 후 현재 선택 삽입
      await sb.from("bucket_picks").delete().eq("user_id", user.id);
      if (pickedIds.size > 0) {
        const toInsert = Array.from(pickedIds).slice(0, 3).map((item_id) => ({
          user_id: user.id,
          item_id,
        }));
        const { error } = await sb.from("bucket_picks").insert(toInsert);
        if (error) throw error;
      }
      alert("홈 표시 항목을 저장했어요.");
    } catch (e) {
      alert("홈 표시 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <PageShell title="나의 버킷리스트" onHome={onHome}>
        <SectionCard title="로그인이 필요해요" subtitle="로그인 후 항목을 저장할 수 있어요">
          <p className="text-sm text-slate-600">홈 {'>'} 로그인/회원가입을 먼저 진행해 주세요.</p>
        </SectionCard>
      </PageShell>
    );
  }

  const displayList = isEmpty ? SAMPLE_BUCKET_ITEMS : items;

  return (
    <PageShell title="나의 버킷리스트" onHome={onHome}>
      <SectionCard title="버킷리스트" subtitle="올해 꼭 해보고 싶은 것들">
        {/* Onboarding Guide */}
        {isEmpty && (
          <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>✨</span>
            <p>마음속 품어왔던 <strong>버킷리스트</strong>를 작성하고, 홈 화면에 띄워보세요.</p>
          </div>
        )}

        <form
          className="mb-3 flex gap-2"
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            const v = input.trim();
            if (!v) return;
            await addItem(v);
            setInput("");
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isEmpty ? "예) 부모님과 제주 한라산 등반" : "이루고 싶은 꿈을 입력하세요"}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button className="rounded-xl bg-blue-500 px-3 py-2 text-white hover:bg-blue-600">
            추가
          </button>
        </form>

        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>홈 표시 선택: <b>{pickedIds.size}</b>/3</span>
          <button
            onClick={savePicks}
            disabled={saving || isEmpty}
            className="rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-60"
            title="홈 카드에 보여줄 3개 저장"
          >
            {saving ? "저장 중…" : "홈에 표시 저장"}
          </button>
        </div>

        <ul className="divide-y divide-slate-200">
          {displayList.map((it) => {
            const isSample = it.user_id === 'sample';
            const picked = pickedIds.has(it.id);
            const done = !!it.done;
            const isBusy = busyId === it.id;
            const isEditing = editId === it.id;

            const handleEditSave = async () => {
              if (isSample) return;
              if (!user || !editText.trim()) {
                setEditId(null);
                return;
              }
              try {
                await sb
                  .from("bucket_items")
                  .update({ title: editText.trim() })
                  .eq("id", it.id);
                setItems((prev) =>
                  prev.map((p) => (p.id === it.id ? { ...p, title: editText.trim() } : p))
                );
                setEditId(null);
              } catch {
                alert("수정에 실패했습니다.");
              }
            };

            return (
              <li key={it.id} className={`flex items-center justify-between py-2 ${isSample ? 'opacity-75' : ''}`}>
                <div className="flex items-center gap-3">
                  {/* 🌟 홈표시 토글 */}
                  <button
                    onClick={() => !isSample && togglePick(it.id)}
                    disabled={isSample}
                    title={picked ? "홈 표시에서 제거" : "홈에 표시 (최대 3개)"}
                    className={`rounded-full p-1 transition-colors ${picked
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-slate-400 hover:text-slate-600"
                      } ${isSample ? 'cursor-default opacity-50' : ''}`}
                  >
                    {picked ? (
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ) : (
                      <StarOff className="h-5 w-5" />
                    )}
                  </button>

                  {/* ✅ 완료 토글 */}
                  <button
                    onClick={() => !isSample && toggleItem(it.id)}
                    disabled={isBusy || isSample}
                    title={done ? "미완료로 변경" : "완료로 표시"}
                    className={`p-1 ${isSample ? 'cursor-default opacity-50' : ''}`}
                  >
                    {done ? (
                      <CheckCircle className="h-5 w-5 text-teal-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 hover:text-teal-600" />
                    )}
                  </button>

                  {/* ✏️ 제목 or 수정 input */}
                  {isEditing ? (
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") setEditId(null);
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-300"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`text-sm transition-colors ${done ? "line-through text-slate-400" : "text-slate-800"
                        }`}
                    >
                      {it.title} {isSample && "(예시)"}
                    </span>
                  )}
                </div>

                {/* ✏️ 수정 & 🗑️ 삭제 */}
                <div className="flex items-center gap-1">
                  {!isSample && (
                    <>
                      {isEditing ? (
                        <button
                          onClick={handleEditSave}
                          title="저장"
                          className="rounded-lg p-1 text-blue-600 hover:text-blue-800"
                        >
                          💾
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditId(it.id);
                            setEditText(it.title);
                          }}
                          title="수정"
                          className="rounded-lg p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => removeItem(it.id)}
                        title="삭제"
                        className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}

          {displayList.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">
              {/* Should not happen if samples exist, but fallback */}
              아직 등록된 버킷리스트가 없습니다. 위 입력창에서 추가해보세요.
            </li>
          )}
        </ul>
      </SectionCard>
    </PageShell>
  );
}
