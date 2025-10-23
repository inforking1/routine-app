import { useEffect, useMemo, useRef, useState } from "react";

type Props = { minutes?: number };

type Saved = {
  secondsLeft: number;
  running: boolean;
  lastTick: number | null;
};

const STORAGE_KEY = "meditation_timer_v1";

export default function MeditationTimer({ minutes = 3 }: Props) {
  const total = minutes * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(total);
  const [running, setRunning] = useState<boolean>(false);
  const tickRef = useRef<number | null>(null);

  // load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Saved = JSON.parse(raw);
        // 보정: 백그라운드 동안 흐른 시간 반영
        if (saved.running && saved.lastTick) {
          const delta = Math.floor((Date.now() - saved.lastTick) / 1000);
          const next = Math.max(0, saved.secondsLeft - delta);
          setSecondsLeft(next);
          setRunning(next > 0);
        } else {
          setSecondsLeft(saved.secondsLeft ?? total);
          setRunning(saved.running ?? false);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save to localStorage
  useEffect(() => {
    const payload: Saved = {
      secondsLeft,
      running,
      lastTick: running ? Date.now() : null,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [secondsLeft, running]);

  // timer
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000) as unknown as number;
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  // 완료 처리
  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
      // 간단 알림
      try {
        new AudioContext(); // 일부 브라우저 깨어나게
      } catch {}
      alert("명상 완료! 수고하셨어요 🙏");
    }
  }, [secondsLeft, running]);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  const progress = ((total - secondsLeft) / total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold tabular-nums">{mmss}</div>
        {!running ? (
          <button
            className="rounded-xl bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            onClick={() => {
              if (secondsLeft === 0) setSecondsLeft(total);
              setRunning(true);
            }}
          >
            시작
          </button>
        ) : (
          <button
            className="rounded-xl border px-4 py-2 hover:bg-slate-50"
            onClick={() => setRunning(false)}
          >
            일시정지
          </button>
        )}
        <button
          className="rounded-xl border px-4 py-2 hover:bg-slate-50"
          onClick={() => {
            setRunning(false);
            setSecondsLeft(total);
          }}
        >
          리셋
        </button>
      </div>

      <div className="h-2.5 rounded-full bg-slate-200">
        <div
          className="h-2.5 rounded-full bg-blue-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
          aria-label={`진행률 ${Math.round(progress)}%`}
        />
      </div>
      <p className="text-xs text-slate-500">앱을 닫아도 남은 시간이 저장됩니다.</p>
    </div>
  );
}
