// src/pages/PledgesPage.tsx
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { createSource, type MindPledge } from "../utils/dataSource";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard"; // ✅ 공통 카드로 통일
import { Trash2 } from "lucide-react"; // ✅ 아이콘 버튼 톤 통일

const MAX_SELECTED = 2;

// 공용 작은 아이콘 버튼 (다른 섹션과 동일 톤)
const IconBtn = ({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className="rounded-full p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100
               focus:outline-none focus:ring-2 focus:ring-emerald-300 transition disabled:opacity-50"
  >
    {children}
  </button>
);

export default function PledgesPage({ onBack }: { onBack?: () => void }) {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;

  const [items, setItems] = useState<MindPledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCount = useMemo(
    () => items.filter((i) => i.selected).length,
    [items]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const src = createSource(user.id);
        const rows = await src.listPledges();
        if (!alive) return;
        setItems(rows);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const add = async () => {
    const text = input.trim();
    if (!text || !user?.id) return;
    try {
      const src = createSource(user.id);
      const row = await src.addPledge(text);
      setItems((p) => [row, ...p]);
      setInput("");
      inputRef.current?.focus();
    } catch (e) {
      console.error(e);
      alert("다짐 저장에 실패했습니다.");
    }
  };

  const toggle = async (id: string) => {
    if (!user?.id) return;
    const target = items.find((i) => i.id === id);
    if (!target) return;
    if (!target.selected && selectedCount >= MAX_SELECTED) {
      alert(`홈에 고정할 수 있는 다짐은 최대 ${MAX_SELECTED}개입니다.`);
      return;
    }
    setBusyId(id);
    setItems((p) =>
      p.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
    try {
      const src = createSource(user.id);
      await src.updatePledge(id, { selected: !target.selected });
    } catch (e) {
      console.error(e);
      setItems((p) =>
        p.map((i) => (i.id === id ? { ...i, selected: target.selected } : i))
      );
      alert("선택 상태 저장 실패");
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (!user?.id) return;
    if (!confirm("이 다짐을 삭제할까요?")) return;
    setBusyId(id);
    try {
      const src = createSource(user.id);
      await src.removePledge(id);
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell title="오늘의 다짐 관리" onHome={onBack}>
      <div className="space-y-3">
        <p className="text-xs sm:text-sm text-slate-500">
          전체 목록을 보고 추가·선택(최대 {MAX_SELECTED}개)할 수 있어요.
        </p>

        {/* ✅ 공통 카드 컴포넌트로 통일: 여백/테두리/그림자 전역 톤 일치 */}
        <SectionCard
          title="오늘의 다짐 (Mind Pledges)"
          subtitle="오늘 집중할 다짐을 관리하세요."
          className="!h-auto !min-h-0 p-3 md:p-4"
        >
          {/* 입력줄: 모바일 세로, PC 가로 */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="오늘의 다짐을 입력하고 Enter 또는 추가"
              inputMode="text"
            />
            <button
              onClick={add}
              className="w-full sm:w-auto rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 active:scale-[0.99]"
            >
              추가
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            전체 {items.length}개 · 선택 {selectedCount}/{MAX_SELECTED}
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="text-sm text-slate-500">불러오는 중…</div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                아직 등록된 다짐이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {items.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-start justify-between gap-3 py-2 text-sm"
                  >
                    <label className="flex min-w-0 items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={!!i.selected}
                        onChange={() => toggle(i.id)}
                        disabled={busyId === i.id}
                        className="mt-0.5 h-5 w-5 accent-emerald-500"
                        title="홈 고정"
                      />
                      <span className="whitespace-pre-wrap break-words text-slate-800">
                        {i.text}
                      </span>
                    </label>

                    {/* 삭제 버튼: 텍스트 → 아이콘 버튼(통일 톤) */}
                    <IconBtn
                      title="삭제"
                      onClick={() => removeItem(i.id)}
                      disabled={busyId === i.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
