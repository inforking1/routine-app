import { useEffect, useMemo, useState } from "react";
import SectionCard from "../SectionCard"; // 프로젝트 구조에 맞게 경로 조정
import {
  onAnniversariesChanged,
  readAnniversaries,
  type Anniversary,
} from "../../lib/anniversariesStore";

function parseYMD(ymd: string) {
  const [y, m, dd] = ymd.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, dd || 1);
}
function nextOccurrenceDate(ymd: string, today: Date): Date {
  const d = parseYMD(ymd);
  const y = today.getFullYear();
  const thisYear = new Date(y, d.getMonth(), d.getDate());
  const todayDate = new Date(y, today.getMonth(), today.getDate());
  if (d.getFullYear() > y) return d;
  if (thisYear >= todayDate) return thisYear;
  return new Date(y + 1, d.getMonth(), d.getDate());
}

export default function HomeAnniversariesCard() {
  const [items, setItems] = useState<Anniversary[]>(() => readAnniversaries());

  useEffect(() => {
    // 처음 진입 시 로드 + 변경 이벤트 구독
    const stop = onAnniversariesChanged(() => {
      setItems(readAnniversaries());
    });
    // 혹시 다른 곳에서 이미 바뀌어 들어왔으면 즉시 한번 동기화
    setItems(readAnniversaries());
    return stop;
  }, []);

  const upcoming3 = useMemo(() => {
    const today = new Date();
    const withNext = items.map((it) => ({ it, next: nextOccurrenceDate(it.date, today) }));
    withNext.sort((a, b) => a.next.getTime() - b.next.getTime());
    return withNext.slice(0, 3).map((x) => x.it);
  }, [items]);

  return (
    <SectionCard title="다가오는 기념일" subtitle="3개만 보여드려요">
      <ul className="text-sm divide-y divide-slate-200">
        {upcoming3.map((a) => (
          <li key={a.id} className="py-2 flex items-center gap-2">
            <span className="truncate">{a.title}</span>
            <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-slate-600">
              {a.date}
            </span>
          </li>
        ))}
        {upcoming3.length === 0 && (
          <li className="py-4 text-center text-slate-500">
            다가오는 기념일이 없어요.
          </li>
        )}
      </ul>
    </SectionCard>
  );
}
