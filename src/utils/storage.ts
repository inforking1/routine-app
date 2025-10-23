// src/utils/storage.ts
export const APP_KEYS = [
  "todos",
  "anniversaries",
  "messages",
  "bucketList",
  "gratitudeList",
  "meditationNote",
  "community_posts",
  "theme",
  // 필요 시 여기에 추가 (예: "goals" 등)
] as const;

type AppKey = typeof APP_KEYS[number];

export function readKey<T = unknown>(key: AppKey): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeKey(key: AppKey, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKeys(keys: readonly AppKey[]) {
  keys.forEach(k => localStorage.removeItem(k));
}

export function exportAll() {
  const dump: Record<string, unknown> = {};
  APP_KEYS.forEach(k => (dump[k] = readKey(k)));
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `routine-data-backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** JSON 구조 검증 (최소한의 유효성만) */
export async function importFromFile(file: File): Promise<string | null> {
  const text = await file.text();
  try {
    const obj = JSON.parse(text);
    if (typeof obj !== "object" || obj === null) return "백업 파일 형식이 올바르지 않습니다.";
    // 존재하는 키만 반영
    (APP_KEYS as readonly string[]).forEach(k => {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        localStorage.setItem(k, JSON.stringify((obj as any)[k]));
      }
    });
    return null;
  } catch {
    return "JSON 파싱에 실패했습니다.";
  }
}

/** 전체 초기화 전 백업을 sessionStorage에 저장 → Undo 지원 */
const LAST_BACKUP_KEY = "app_last_backup";
export function backupToSession() {
  const dump: Record<string, unknown> = {};
  APP_KEYS.forEach(k => (dump[k] = readKey(k)));
  sessionStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(dump));
}

export function restoreFromSessionBackup(): boolean {
  const raw = sessionStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) return false;
  try {
    const dump = JSON.parse(raw) as Record<string, unknown>;
    (APP_KEYS as readonly string[]).forEach(k => {
      localStorage.setItem(k, JSON.stringify(dump[k]));
    });
    sessionStorage.removeItem(LAST_BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}
