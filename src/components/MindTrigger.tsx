// src/components/MindTrigger.tsx
import { useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth";
import { createSource, type MindPledge } from "../utils/dataSource";

type Props = {
  className?: string;
  onManage?: () => void; // 전용 페이지로 이동
};

const MAX_SELECTED = 2;

export default function MindTrigger({ className = "", onManage }: Props) {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;

  const [items, setItems] = useState<MindPledge[]>([]);
  const [loading, setLoading] = useState(true);

  // DB에서 읽어오기
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
    return () => { alive = false; };
  }, [user?.id]);

  const selected = useMemo(
    () => items.filter(i => i.selected).slice(0, MAX_SELECTED),
    [items]
  );

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            오늘의 다짐
          </h2>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            오늘도 10번씩만 읽어보세요. 반드시 실천할 수 있습니다.
          </p>
        </div>
        <button
          onClick={onManage}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          관리
        </button>
      </div>

      {/* 예전 스타일: 선택된 2개 카드 */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading && (
          <div className="col-span-2 text-sm text-slate-500">불러오는 중…</div>
        )}

        {!loading && selected.length === 0 && (
          <div className="col-span-2">
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              아직 선택된 다짐이 없어요. <span className="underline decoration-slate-300">관리</span>에서 추가·선택해 보세요.
            </div>
          </div>
        )}

        {selected.map((item, idx) => (
          <div
            key={item.id}
            className={[
              "rounded-xl p-4 text-sm leading-relaxed shadow-sm",
              idx === 0
                ? "border border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-100"
                : "border border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-100",
            ].join(" ")}
          >
            <span className="block text-xs opacity-70">{idx === 0 ? "다짐 1" : "다짐 2"}</span>
            <p className="mt-1 text-[15px] break-words">“{item.text}”</p>
          </div>
        ))}
      </div>
    </section>
  );
}
