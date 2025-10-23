// src/utils/rss.ts
export type RssItem = {
  title: string;
  link: string;
  pubDate?: Date | null;
  source?: string | null;
};

const PROXY = "https://api.allorigins.win/raw?url=";
// 위 프록시가 막히면 아래를 예비로 사용하세요.
// const PROXY = "https://r.jina.ai/http://"; // (Plain text로 변환, 요약엔 유용)

export async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`RSS fetch failed: ${url}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  const items = Array.from(doc.querySelectorAll("item")).map((el) => ({
    title: el.querySelector("title")?.textContent?.trim() ?? "",
    link: el.querySelector("link")?.textContent?.trim() ?? "",
    pubDate: el.querySelector("pubDate")
      ? new Date(el.querySelector("pubDate")!.textContent!)
      : null,
    source:
      el.querySelector("source")?.textContent?.trim() ??
      new URL(url).hostname.replace(/^www\./, ""),
  }));

  // 일부 RSS는 <entry> 형식(atom)
  if (items.length === 0) {
    const entries = Array.from(doc.querySelectorAll("entry")).map((el) => ({
      title: el.querySelector("title")?.textContent?.trim() ?? "",
      link:
        (el.querySelector("link") as Element | null)?.getAttribute("href") ?? "",
      pubDate: el.querySelector("updated")
        ? new Date(el.querySelector("updated")!.textContent!)
        : null,
      source: new URL(url).hostname.replace(/^www\./, ""),
    }));
    return entries;
  }

  return items;
}

/** 간단 요약: 문장 분리 후 앞 2~3문장 */
export function naiveSummary(text: string, maxSentences = 3): string {
  const sents = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？])\s+/)
    .filter(Boolean);
  return sents.slice(0, maxSentences).join(" ");
}

/** 기사 본문을 CORS 우회로 받아오기 (r.jina.ai는 읽기뷰 텍스트로 반환) */
export async function fetchReadableText(url: string): Promise<string> {
  const readerUrl = "https://r.jina.ai/http://";
  const res = await fetch(readerUrl + url.replace(/^https?:\/\//, ""));
  if (!res.ok) throw new Error("reader fetch failed");
  return await res.text();
}
