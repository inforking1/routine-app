// src/components/NewsFeed.tsx
import { useEffect, useState } from "react";
import { fetchRss, type RssItem } from "../utils/rss";

type Props = { feeds: string[]; limit?: number };

const CACHE_KEY = "news_titles_v1";

export default function NewsFeed({ feeds, limit = 20 }: Props) {
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // 1) 15분 캐시 먼저 표시
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { savedAt: number; items: RssItem[] };
        const fresh = Date.now() - data.savedAt < 15 * 60 * 1000;
        if (fresh && data.items?.length) setItems(data.items.slice(0, limit));
      }
    } catch { }

    // 2) 백그라운드 최신 데이터 가져오기
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const settled = await Promise.allSettled(feeds.map(fetchRss));
        const merged = settled.flatMap(r => (r.status === "fulfilled" ? r.value : []))
          .flat()
          .filter(x => x.title && x.link);

        merged.sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

        if (!alive) return;
        const top = merged.slice(0, limit);
        setItems(top);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: top }));
      } catch (e: any) {
        if (alive) setError(e?.message ?? "뉴스 로딩 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [feeds, limit]);

  return (
    <div className="space-y-2">
      {loading && items.length === 0 && (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      )}
      {error && <p className="text-sm text-rose-600">오류: {error}</p>}

      <ul className="list-disc pl-5 space-y-1">
        {items.map((it) => (
          <li key={it.link} className="text-sm">
            <a
              href={it.link}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              {it.title}
            </a>
            {it.source && (
              <span className="ml-2 text-xs text-slate-500">· {it.source}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
