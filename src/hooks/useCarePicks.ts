import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Contact } from "../types/contacts";

// 날짜 포맷 (YYYY-MM-DD) - Safe KST
function getTodayStr() {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 10);
}

// 날짜 비교 (MM-DD)
function isEventToday(dateStr: string | null) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (dateStr.length < 10) return false;
  const today = getTodayStr(); // YYYY-MM-DD
  return dateStr.slice(5) === today.slice(5);
}

// 하루 고정 랜덤 (Deterministic Random per Date + ID)
function dayHash(id: string, date: string) {
  let hash = 0;
  const str = id + date;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function useCarePicks(initialContacts?: Contact[]) {
  const [picks, setPicks] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(!initialContacts);
  const [error, setError] = useState<string | null>(null);
  const [deferredIds, setDeferredIds] = useState<Set<string>>(new Set());
  const dateStr = getTodayStr();

  // 내부 데이터 로딩 (initialContacts가 없을 때)
  const [internalContacts, setInternalContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (initialContacts) {
      setInternalContacts(initialContacts);
      setLoading(false);
      return;
    }

    const fetchContacts = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      if (error) setError(error.message);
      else setInternalContacts(data as Contact[]);

      setLoading(false);
    };

    fetchContacts();
  }, [initialContacts]);


  // 추천 로직 (internalContacts 기준)
  useEffect(() => {
    if (internalContacts.length === 0) {
      setPicks([]);
      return;
    }

    const candidates = internalContacts.filter(c => !deferredIds.has(c.id));

    // Group A: 오늘 생일/기념일
    const groupEvent = candidates.filter(c => isEventToday(c.birthday) || isEventToday(c.anniversary));

    // Group B: 나머지
    const others = candidates.filter(c => !groupEvent.includes(c));

    others.sort((a, b) => {
      const impA = a.importance ?? 1;
      const impB = b.importance ?? 1;
      if (impA !== impB) return impB - impA;
      const lastA = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
      const lastB = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
      return lastA - lastB;
    });

    let result: Contact[] = [];
    result.push(...groupEvent);

    if (result.length < 3) {
      const need = 3 - result.length;
      const poolSize = Math.max(need * 3, 10);
      const pool = others.slice(0, poolSize);
      pool.sort((a, b) => dayHash(a.id, dateStr) - dayHash(b.id, dateStr));
      result.push(...pool.slice(0, need));
    }

    setPicks(result.slice(0, 3));

  }, [internalContacts, deferredIds, dateStr]);

  const deferContact = (id: string) => {
    setDeferredIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return {
    picks,
    loading,
    error,
    pickDate: dateStr,
    deferContact,
    todayContactCount: internalContacts.filter(c =>
      c.last_contacted_at && c.last_contacted_at.startsWith(dateStr)
    ).length
  };
}
