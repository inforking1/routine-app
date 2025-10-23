import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import NewsFeed from "../components/NewsFeed";

export default function NewsPage({ onHome }: { onHome: () => void }) {
  return (
    <PageShell title="뉴스" onHome={onHome}>
      <SectionCard title="주요 뉴스" subtitle="타이틀 중심(요약은 추후)">
        <NewsFeed
          feeds={[
            "https://www.hankyung.com/feed/economy",
            "https://www.hankyung.com/feed/finance",
            "https://biz.chosun.com/rss.xml",
            "https://www.mk.co.kr/rss/30100041/",
            "https://www.edaily.co.kr/rss/news/economy.xml",
          ]}
          limit={20}
        />
      </SectionCard>
    </PageShell>
  );
}
