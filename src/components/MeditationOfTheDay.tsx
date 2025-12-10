// src/components/MeditationOfTheDay.tsx
import { useEffect, useState } from "react";
import { MEDITATION_QUOTES, type MeditationQuote } from "../utils/meditationData";

type Props = { variant?: "inline" | "card"; className?: string };

export default function MeditationOfTheDay({ variant = "inline", className = "" }: Props) {
  const [quote, setQuote] = useState<MeditationQuote | null>(null);


  // 시간대/랜덤 기반 추천
  useEffect(() => {
    // 셔플 후 하나 선택 (단순화: 매번 랜덤)
    pickRandom();
  }, []);

  const pickRandom = () => {
    const randomIdx = Math.floor(Math.random() * MEDITATION_QUOTES.length);
    setQuote(MEDITATION_QUOTES[randomIdx]);

  };

  if (!quote) return null;

  // ── INLINE: 카드·제목 없이 내용만 (Home의 SectionCard 내부용)
  if (variant === "inline") {
    // Inline variant styling: Updated radius to 16px
    return (
      <blockquote className={`rounded-[16px] border border-[rgba(148,163,184,0.15)] bg-white px-[20px] py-[18px] shadow-none ${className}`}>
        <p className="text-[17px] font-medium text-slate-900 leading-relaxed break-keep">
          “{quote.text}”
        </p>
        <footer className="mt-4 flex items-center justify-center">
          <span className="text-sm text-slate-600 font-medium">— {quote.author}</span>
        </footer>
      </blockquote>
    );
  }

  // ── CARD: 단독 페이지용 (배경 이미지 or 그라데이션)
  // Outer container 22px, Inner quote 16px
  return (
    <section className={`relative overflow-hidden rounded-[22px] bg-[#F3F5FE] px-5 py-6 shadow-sm ${className}`}>

      <div className="relative z-10 text-center">
        <h3 className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-indigo-900 mb-5 border border-indigo-100/50">
          ✨ 오늘의 문장
        </h3>

        {/* Inner White Card */}
        <blockquote className="mb-6 rounded-[16px] border border-[rgba(148,163,184,0.15)] bg-white px-[20px] py-[18px] shadow-none">
          <p className="text-[17px] font-medium text-slate-900 leading-relaxed break-keep">
            “{quote.text}”
          </p>
          <div className="mt-4 flex items-center justify-center">
            <span className="text-sm text-slate-600 font-medium">— {quote.author}</span>
          </div>
        </blockquote>

        <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-2">
          <span className="text-[12px] text-slate-500">성공루틴이 준비한 오늘의 문장</span>
          <button
            onClick={pickRandom}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 transition active:scale-95"
          >
            다른 문장 보기 ›
          </button>
        </div>
      </div>

      {/* 장식용 배경 원 - 은은하게 */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-purple-100/40 blur-3xl opacity-60" />
    </section>
  );
}
