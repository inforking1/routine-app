// src/hooks/useAnniversaries.ts
import { useEffect } from "react";
import { subscribeAnniversaries } from "../data/anniversaries"; // 경로 OK
import { useAnnivStore } from "../store/annivStore";            // 공백 제거

export default function useAnniversaries(enabled: boolean) {
  const set = useAnnivStore((s) => s.set);
  const setReady = useAnnivStore((s) => s.setReady);

  useEffect(() => {
    if (!enabled) return;

    const unsub = subscribeAnniversaries((rows) => {
      set(rows);
      setReady(true);
    });

    return () => { unsub && unsub(); };
  }, [enabled, set, setReady]);
}
