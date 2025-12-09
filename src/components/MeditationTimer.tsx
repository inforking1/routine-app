import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  defaultMinutes?: number;
  onComplete?: () => void;
};

const STORAGE_KEY = "meditation_timer_v2";

export default function MeditationTimer({ defaultMinutes = 3, onComplete }: Props) {
  const [targetMin, setTargetMin] = useState(defaultMinutes);
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [completedParams, setCompletedParams] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });

  const tickRef = useRef<number | null>(null);

  // 로드: 저장된 시간이 있으면 복원 (단, 목표 시간이 다르면 리셋)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // 만약 저장된 목표 시간과 현재 설정이 같다면 복원
        if (saved.targetMin === targetMin) {
          if (saved.running && saved.lastTick) {
            const delta = Math.floor((Date.now() - saved.lastTick) / 1000);
            const next = Math.max(0, saved.secondsLeft - delta);
            setSecondsLeft(next);
            setRunning(next > 0);
          } else {
            setSecondsLeft(saved.secondsLeft);
            setRunning(saved.running);
          }
        }
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 저장
  useEffect(() => {
    const payload = {
      targetMin,
      secondsLeft,
      running,
      lastTick: running ? Date.now() : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [secondsLeft, running, targetMin]);

  // 타이머 로직
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const handleComplete = () => {
    setRunning(false);
    setCompletedParams({ show: true, msg: "좋아요! 오늘도 루틴을 지켰어요! 🌿" });
    if (onComplete) onComplete();
    // 3초 후 메시지 숨김
    setTimeout(() => setCompletedParams({ show: false, msg: "" }), 4000);
  };

  const changeDuration = (m: number) => {
    setRunning(false);
    setTargetMin(m);
    setSecondsLeft(m * 60);
    setCompletedParams({ show: false, msg: "" });
  };

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  const total = targetMin * 60;
  const progress = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <div className="relative">
      {/* 완료 메시지 오버레이 */}
      {completedParams.show && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-bold text-emerald-600">{completedParams.msg}</div>
          </div>
        </div>
      )}

      {/* 시간 선택 & 설정 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[1, 3, 5, 10].map((m) => (
            <button
              key={m}
              onClick={() => changeDuration(m)}
              disabled={running}
              className={clsx(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                targetMin === m
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                running && "opacity-50 cursor-not-allowed"
              )}
            >
              {m}분
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 hover:text-slate-700">
            <input
              type="checkbox"
              checked={showAnimation}
              onChange={(e) => setShowAnimation(e.target.checked)}
              className="accent-emerald-500"
            />
            호흡 가이드
          </label>
        </div>
      </div>

      {/* 메인 타이머 UI */}
      <div className="flex flex-col items-center justify-start py-1 gap-y-2">
        {/* 시간 텍스트 (항상 표시 / 애니메이션 없을 땐 크게) */}
        {!showAnimation && (
          <div className="mb-2 text-center animate-in fade-in slide-in-from-bottom-2">
            <div className="text-6xl font-light text-slate-800 tracking-tight tabular-nums font-mono">
              {mmss}
            </div>
            <div className="mt-2 text-xs uppercase tracking-widest text-slate-400">
              {running ? "Focusing..." : "Ready"}
            </div>
          </div>
        )}

        {/* 호흡 애니메이션 원 (Toggle ON 일 때만 렌더링) */}
        {showAnimation && (
          <div className="relative mb-4 flex h-48 w-48 items-center justify-center animate-in zoom-in duration-300">
            {/* 배경 원 */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />

            {/* 진행률 SVG Circle */}
            <svg className="absolute inset-0 h-full w-full -rotate-90 text-emerald-500 transition-all duration-1000 ease-linear">
              <circle
                cx="50%" cy="50%" r="46%"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * progress) / 100}
                strokeLinecap="round"
                className="transition-[stroke-dashoffset] duration-1000"
              />
            </svg>

            {/* 호흡 애니메이션 (Pulse) */}
            {running && (
              <>
                <div className="absolute inset-0 z-0 animate-[ping_4s_ease-in-out_infinite] rounded-full bg-emerald-100 opacity-30" />
                <div className="absolute inset-4 z-0 animate-[pulse_4s_ease-in-out_infinite] rounded-full bg-emerald-50 opacity-50" />
              </>
            )}

            {/* 시간 텍스트 (원 내부) */}
            <div className="z-10 text-center">
              <div className="text-4xl font-light text-slate-700 tracking-wider tabular-nums">
                {mmss}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                {running ? "Focus" : "Ready"}
              </div>
            </div>
          </div>
        )}

        {/* 제어 버튼 */}
        <div className="flex gap-4">
          {!running ? (
            <button
              onClick={() => {
                if (secondsLeft === 0) setSecondsLeft(total);
                setRunning(true);
              }}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="text-lg">▶</span> 시작하기
            </button>
          ) : (
            <button
              onClick={() => setRunning(false)}
              className="rounded-full border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              일시정지
            </button>
          )}
          <button
            onClick={() => {
              setRunning(false);
              setSecondsLeft(total);
            }}
            className="rounded-full p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="리셋"
            aria-label="리셋"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
