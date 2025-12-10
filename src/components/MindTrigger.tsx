// src/components/MindTrigger.tsx
import { useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth";
import { createSource, type MindPledge } from "../utils/dataSource";

type Props = {
  className?: string;
  onManage?: () => void; // 전용 페이지로 이동
};

const SAMPLE_PLEDGES = [
  "오늘 나는 나를 위해 작은 실천 하나를 선택합니다. (예시)",
  "작은 다짐이 큰 변화를 만든다는 것을 기억합니다. (예시)",
];

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
    () => items.filter(i => i.selected),
    [items]
  );

  const hasPledge = selected.length > 0;

  return (
    <section
      onClick={onManage}
      className={`relative overflow-hidden rounded-[24px] shadow-md px-6 py-7 bg-gradient-to-br from-[#EEF1FF] via-[#F6F9FF] to-[#FFEFF4] transition-all hover:shadow-lg cursor-pointer ${className}`}
    >
      {/* Decorative background accent - subtle */}
      <div className="absolute -right-4 -top-10 h-32 w-32 rounded-full bg-white/40 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 opacity-90">
          <span className="text-[18px] font-semibold text-slate-900 tracking-tight">오늘의 다짐</span>
        </div>
        <div className="text-[22px] text-slate-400 opacity-90">✨</div>
      </div>

      {/* Content */}
      <div className="relative">
        {loading ? (
          <div className="text-sm text-slate-400">마음을 읽어오는 중...</div>
        ) : hasPledge ? (
          // Case 1: Real Pledge (Show Top 1)
          <div className="space-y-1">
            <p className="text-[17px] leading-relaxed text-slate-900 font-medium break-keep">
              &quot;{selected[0].text}&quot;
            </p>
            <p className="mt-3 text-[13px] text-slate-600">
              {selected.length > 1 ? `외 ${selected.length - 1}개의 다짐이 더 있어요` : '오늘도 멋진 하루를 응원합니다'}
            </p>
          </div>
        ) : (
          // Case 2: Samples (Show 2 items)
          <div className="space-y-2">
            {SAMPLE_PLEDGES.map((text, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="shrink-0 text-indigo-300 mt-1 text-[10px]">●</span>
                <p className="text-[17px] leading-relaxed text-slate-900 font-medium break-keep">
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interaction Hint */}
      <div className="absolute bottom-4 right-4 text-slate-400/50 text-[10px] pointer-events-none">
        탭하여 관리
      </div>
    </section>
  );
}
