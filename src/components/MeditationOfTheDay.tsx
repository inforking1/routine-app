// src/components/MeditationOfTheDay.tsx
import { useEffect, useState } from "react";

type Quote = { text: string; author: string; source: "quotable"|"zenquotes"|"favqs"|"local" };
type Props = { variant?: "inline" | "card"; className?: string };

const STORAGE_KEY_PREFIX = "meditation:";
const todayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${STORAGE_KEY_PREFIX}${yyyy}-${mm}-${dd}`;
};

const LOCAL_FALLBACK: Quote[] = [
  { text: "성공은 작은 노력을 날마다 반복한 결과다.", author: "로버트 콜리어", source: "local" },
  { text: "위대한 일을 하는 유일한 방법은 그 일을 사랑하는 것이다.", author: "스티브 잡스", source: "local" },
  { text: "느리더라도 멈추지 않는다면 상관없다.", author: "공자", source: "local" },
];

async function fetchFromQuotable(): Promise<Quote|null> {
  try {
    const r = await fetch("https://api.quotable.io/random?tags=famous-quotes|inspirational");
    if (!r.ok) throw new Error();
    const j = await r.json();
    return { text: j.content, author: j.author || "Unknown", source: "quotable" };
  } catch { return null; }
}
async function fetchFromZenQuotes(): Promise<Quote|null> {
  try {
    let r = await fetch("https://zenquotes.io/api/today");
    if (!r.ok) r = await fetch("https://zenquotes.io/api/random");
    if (!r.ok) throw new Error();
    const j = await r.json(); const q = Array.isArray(j) ? j[0] : j[0];
    return { text: q.q, author: q.a || "Unknown", source: "zenquotes" };
  } catch { return null; }
}
async function fetchFromFavQs(): Promise<Quote|null> {
  try {
    const r = await fetch("https://favqs.com/api/qotd");
    if (!r.ok) throw new Error();
    const j = await r.json(); const q = j.quote;
    return { text: q.body, author: q.author || "Unknown", source: "favqs" };
  } catch { return null; }
}
async function getQuoteOfTheDay(): Promise<Quote> {
  const q1 = await fetchFromQuotable(); if (q1) return q1;
  const q2 = await fetchFromZenQuotes(); if (q2) return q2;
  const q3 = await fetchFromFavQs(); if (q3) return q3;
  const idx = new Date().getDate() % LOCAL_FALLBACK.length;
  return LOCAL_FALLBACK[idx];
}

export default function MeditationOfTheDay({ variant="inline", className="" }: Props) {
  const [quote, setQuote] = useState<Quote|null>(null);

  useEffect(() => {
    const key = todayKey();
    const cached = localStorage.getItem(key);
    if (cached) { setQuote(JSON.parse(cached)); return; }
    getQuoteOfTheDay().then(q => {
      localStorage.setItem(key, JSON.stringify(q));
      setQuote(q);
    });
  }, []);

  // 로딩 동안 높이 안정화(점프 방지)
  if (!quote) {
    return (
      <div className={`h-[84px] rounded-lg bg-slate-100/60 animate-pulse ${className}`} />
    );
  }

  // ── INLINE: 카드·제목 없이 내용만(SectionCard 안에 넣을 때)
  if (variant === "inline") {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm ${className}`}>
        <blockquote className="rounded-lg bg-white/70 p-3 leading-relaxed">
          <p className="text-[15px] text-slate-800">“{quote.text}”</p>
          <footer className="mt-1 text-xs text-slate-500">— {quote.author}</footer>
        </blockquote>
        <div className="mt-1 text-[11px] text-slate-400">
          출처: {quote.source === "quotable" ? "Quotable" : quote.source === "zenquotes" ? "ZenQuotes" : quote.source === "favqs" ? "FavQs" : "로컬 컬렉션"}
        </div>
      </div>
    );
  }

  // ── CARD: 단독 페이지/섹션에서 사용할 때(이전 스타일)
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 ${className}`}>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">오늘의 명상</h3>
      <blockquote className="mt-3 rounded-xl border-l-4 border-indigo-400 bg-indigo-50/60 p-4 text-slate-800 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-slate-100">
        <p className="text-[15px] leading-relaxed">“{quote.text}”</p>
        <footer className="mt-2 text-xs text-slate-500">— {quote.author}</footer>
      </blockquote>
      <div className="mt-2 text-[11px] text-slate-400">
        출처: {quote.source === "quotable" ? "Quotable" : quote.source === "zenquotes" ? "ZenQuotes" : quote.source === "favqs" ? "FavQs" : "로컬 컬렉션"}
      </div>
    </section>
  );
}
