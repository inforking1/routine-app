// src/pages/MeditationPage.tsx
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import MeditationOfTheDay from "../components/MeditationOfTheDay";
import MeditationTimer from "../components/MeditationTimer"; // ✅ 같은 폴더라 ./ 로 수정!

export default function MeditationPage({
  note,
  setNote,
  onHome,
}: {
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  onHome: () => void;
}) {
  return (
    <PageShell title="명상" onHome={onHome}>

      {/* 오늘의 명상 한 줄 */}
      <SectionCard title="오늘의 명상 한 줄" subtitle="하루 한 문장으로 마음 점검">
        <MeditationOfTheDay variant="inline" />
      </SectionCard>

      {/* 집중 타이머 */}
      <SectionCard title="집중 타이머" subtitle="3분 호흡부터 시작해요">
        <div className="max-w-md">
          <MeditationTimer minutes={3} />
        </div>
      </SectionCard>

      {/* 명상 메모 */}
      <SectionCard title="명상 메모" subtitle="느낌/생각을 간단히 기록 (자동 저장)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예) 3분 복식호흡. 어깨 힘이 풀리고 마음이 한결 가벼워짐."
          className="w-full min-h-[140px] rounded-lg border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="mt-2 text-xs text-slate-500">입력 즉시 저장됩니다.</p>
      </SectionCard>
    </PageShell>
  );
}
