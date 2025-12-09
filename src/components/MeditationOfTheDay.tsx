// src/components/MeditationOfTheDay.tsx
import { useEffect, useState } from "react";
import { MEDITATION_QUOTES, type MeditationQuote } from "../utils/meditationData";

type Props = { variant?: "inline" | "card"; className?: string };

export default function MeditationOfTheDay({ variant = "inline", className = "" }: Props) {
  const [quote, setQuote] = useState<MeditationQuote | null>(null);
  const [idx, setIdx] = useState(0);

  // 시간대/랜덤 기반 추천
  useEffect(() => {
    // 셔플 후 하나 선택 (단순화: 매번 랜덤)
    pickRandom();
  }, []);

  const pickRandom = () => {
    const randomIdx = Math.floor(Math.random() * MEDITATION_QUOTES.length);
    setQuote(MEDITATION_QUOTES[randomIdx]);
    setIdx((prev) => prev + 1);
  };

  if (!quote) return null;

  // ── INLINE: 카드·제목 없이 내용만 (Home의 SectionCard 내부용)
  if (variant === "inline") {
    return (
      <div className={`rounded-xl border border-slate-200 bg-purple-50/50 p-4 shadow-sm ${className}`}>
        <blockquote className="relative p-2">
          <p className="text-[15px] font-medium text-slate-800 leading-relaxed break-keep">
            “{quote.text}”
          </p>
          <footer className="mt-2 text-xs text-slate-500 font-medium opacity-80">
            — {quote.author}
          </footer>
        </blockquote>
      </div>
    );
  }

  // ── CARD: 단독 페이지용 (배경 이미지 or 그라데이션)
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm ${className}`}>

      <div className="relative z-10">
        <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-900 mb-3 opacity-90">
          ✨ 오늘의 문장
        </h3>

        <blockquote className="mb-4">
          <p className="text-lg font-semibold text-slate-800 leading-relaxed break-keep">
            “{quote.text}”
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-600 font-medium">— {quote.author}</span>
          </div>
        </blockquote>

        <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
          <span className="text-[11px] text-slate-400">성공루틴이 준비한 오늘의 문장</span>
          <button
            onClick={pickRandom}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 transition active:scale-95"
          >
            다른 문장 보기 ›
          </button>
        </div>
      </div>

      {/* 장식용 배경 원 */}
      <div className="pointer-events-none absolute -right-4 -top-10 h-32 w-32 rounded-full bg-purple-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-indigo-200/30 blur-2xl" />
    </section>
  );
}
