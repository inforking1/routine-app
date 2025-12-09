import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Contact } from "../types/contacts";

const KST = 'Asia/Seoul';

function todayKST() {
  const now = new Date();
  const kst = new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now); // YYYY-MM-DD
  return kst;
}

// D-day 계산: YYYY-MM-DD(월/일만 비교)
function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const [, m, d] = dateStr.split("-").map(Number);
  const today = new Date();
  const ky = today.getFullYear();
  let next = new Date(ky, (m - 1), d);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next < t) next = new Date(ky + 1, (m - 1), d);
  const diff = Math.round((next.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return diff; // 0이면 오늘
}

// 스코어링
function scoreContact(c: Contact) {
  let score = 0;
  // 중요도
  const imp = c.importance ?? 1;
  score += imp * 10;

  // 마지막 연락으로부터 경과일 (최대 60점)
  if (c.last_contacted_at) {
    const days = Math.min(
      60,
      Math.max(0, Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)))
    );
    score += days;
  } else {
    // 연락 기록 없으면 기본 가산
    score += 30;
  }

  // 다가오는 이벤트 가산
  const bd = daysUntil(c.birthday);
  const an = daysUntil(c.anniversary);
  const minEvent = [bd, an].filter(v => v !== null).reduce<number | null>((a, v) => {
    if (a === null) return v as number;
    return Math.min(a, v as number);
  }, null);

  if (minEvent !== null && minEvent <= 30) {
    score += (30 - minEvent) + 20; // 가까울수록 높은 점수
  }

  return score;
}

// 안정적 “하루 랜덤성”: 날짜+id로 해시 정렬 (간단 버전)
function dayHashComparator(date: string) {
  return (a: Contact, b: Contact) => {
    const ha = (date + a.id).split("").reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
    const hb = (date + b.id).split("").reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
    return ha - hb;
  };
}

export function useCarePicks() {
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pickDate = todayKST();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("로그인이 필요합니다.");

        // 1) 이미 생성된 picks가 있으면 그대로 사용
        const { data: dp } = await supabase
          .from("daily_picks")
          .select("*")
          .eq("user_id", user.id)
          .eq("pick_date", pickDate)
          .maybeSingle();

        if (dp?.picks?.length) {
          const { data: contacts } = await supabase
            .from("contacts")
            .select("*")
            .in("id", dp.picks);
          if (mounted) {
            setPicks((contacts ?? []) as Contact[]);
            setLoading(false);
          }
          return;
        }

        // 2) 오늘 처음이면 전체에서 후보 계산
        const { data: all } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id);

        const contacts = (all ?? []) as Contact[];

        // 소량일 때 가드
        if (contacts.length <= 3) {
          // 전부 저장
          await supabase.from("daily_picks").insert({
            user_id: user.id,
            pick_date: pickDate,
            picks: contacts.map(c => c.id),
          });
          if (mounted) {
            setPicks(contacts);
            setLoading(false);
          }
          return;
        }

        // 스코어링 + 정렬
        const withScore = contacts
          .map(c => ({ c, score: scoreContact(c) }))
          .sort((a, b) => b.score - a.score);

        // 상위 30% 풀 만들고, 날짜 해시로 안정적 셔플
        const topN = Math.max(3, Math.floor(withScore.length * 0.3));
        const pool = withScore.slice(0, topN).map(x => x.c).sort(dayHashComparator(pickDate));

        // 태그 다양성(있으면) 살짝 고려
        const chosen: Contact[] = [];
        const seenTags = new Set<string>();

        for (const cand of pool) {
          const tags = (cand.tags ?? []);
          const hasNewTag = tags.some(t => !seenTags.has(t));
          if (chosen.length < 2 && hasNewTag) {
            chosen.push(cand);
            tags.forEach(t => seenTags.add(t));
          }
          if (chosen.length >= 3) break;
        }
        // 부족하면 순서대로 채움
        for (const cand of pool) {
          if (chosen.length >= 3) break;
          if (!chosen.find(x => x.id === cand.id)) chosen.push(cand);
        }

        const pickIds = chosen.slice(0, 3).map(c => c.id);

        await supabase.from("daily_picks").insert({
          user_id: user.id,
          pick_date: pickDate,
          picks: pickIds,
        });

        const { data: finalContacts } = await supabase
          .from("contacts")
          .select("*")
          .in("id", pickIds);

        if (mounted) {
          setPicks((finalContacts ?? []) as Contact[]);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message ?? "안부 추천을 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [pickDate]);

  return { picks, loading, error, pickDate };
}
