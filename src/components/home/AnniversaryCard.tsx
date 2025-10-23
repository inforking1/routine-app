import { useEffect, useState } from "react";
import { getMyAnniversaries } from "../../data/anniversaries";
import type { Anniv } from "../../types/tables";

export default function AnniversaryCard() {
  const [list, setList] = useState<Anniv[]>([]);
  useEffect(() => { (async () => {
    try { setList(await getMyAnniversaries()); } catch {}
  })(); }, []);

  const today = new Date();
  const upcoming = list
    .map(a => ({ ...a, d: dday(today, new Date(a.date)) }))
    .filter(x => x.d >= -1) // 지나간 지 하루까지만
    .sort((a,b) => a.d - b.d)
    .slice(0, 5);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">기념일 챙기기</h3>
      <ul className="text-sm space-y-2">
        {upcoming.length === 0 && <li className="text-slate-500">다가오는 기념일이 없습니다.</li>}
        {upcoming.map(x => (
          <li key={x.id} className="flex items-center justify-between">
            <span>{x.title}</span>
            <span className="text-xs">{x.d === 0 ? "D-DAY" : x.d > 0 ? `D-${x.d}` : `D+${Math.abs(x.d)}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
function dday(base: Date, target: Date) {
  const one = 24 * 60 * 60 * 1000;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.ceil((t - b) / one);
}
