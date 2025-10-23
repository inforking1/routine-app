// src/lib/anniversariesStore.ts
export const ANNIV_STORAGE_KEY = "anniversaries.v2";
export const ANNIV_CHANGED_EVENT = "anniversaries:changed";

export type Anniversary = { id: number; title: string; date: string }; // YYYY-MM-DD

export function readAnniversaries(): Anniversary[] {
  try {
    const raw = localStorage.getItem(ANNIV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeAnniversaries(items: Anniversary[]) {
  try {
    localStorage.setItem(ANNIV_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function broadcastAnniversaries(items?: Anniversary[]) {
  window.dispatchEvent(
    new CustomEvent(ANNIV_CHANGED_EVENT, { detail: items ?? null })
  );
}

export function onAnniversariesChanged(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(ANNIV_CHANGED_EVENT, handler);
  return () => window.removeEventListener(ANNIV_CHANGED_EVENT, handler);
}
