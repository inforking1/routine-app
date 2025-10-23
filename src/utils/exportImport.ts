// src/utils/exportImport.ts
// 통합 백업/복원 유틸 (완성본)

/**
 * 백업 파일의 메타 정보와 실제 데이터 페이로드 구조
 */
export type BackupPayload = {
  app: {
    name: "성공루틴";
    version: string;
    exportedAt: string; // ISO string
  };
  data: {
    goals?: unknown;
    todos?: unknown;
    anniversaries?: unknown;
    bucket?: unknown;
    gratitude?: unknown;
    posts?: unknown;      // 커뮤니티 글
    comments?: unknown;   // 커뮤니티 댓글
    contacts?: unknown;
    settings?: unknown;   // 테마/언어/레이아웃 등
    // 필요 시 섹션 추가 가능
  };
};

const VERSION = "2025.10.14";

/**
 * 현재 앱 상태에서 전체 스냅샷을 구성합니다.
 * 각 getter는 undefined 가능하며, 제공된 것만 스냅샷에 포함됩니다.
 */
export function buildBackupSnapshot(getters: {
  getGoals?: () => unknown;
  getTodos?: () => unknown;
  getAnniversaries?: () => unknown;
  getBucket?: () => unknown;
  getGratitude?: () => unknown;
  getPosts?: () => unknown;
  getComments?: () => unknown;
  getContacts?: () => unknown;
  getSettings?: () => unknown;
}): BackupPayload {
  const payload: BackupPayload = {
    app: {
      name: "성공루틴",
      version: VERSION,
      exportedAt: new Date().toISOString(),
    },
    data: {},
  };

  // 주어진 getter만 실행해서 data에 채웁니다.
  const map = {
    goals: getters.getGoals,
    todos: getters.getTodos,
    anniversaries: getters.getAnniversaries,
    bucket: getters.getBucket,
    gratitude: getters.getGratitude,
    posts: getters.getPosts,
    comments: getters.getComments,
    contacts: getters.getContacts,
    settings: getters.getSettings,
  } as const;

  for (const [key, fn] of Object.entries(map)) {
    if (typeof fn === "function") {
      try {
        // @ts-expect-error 안전한 대입
        payload.data[key] = fn();
      } catch {
        // 특정 섹션 읽기 실패 시 건너뜀
      }
    }
  }

  return payload;
}

/**
 * 객체를 JSON 파일로 다운로드합니다.
 */
export function downloadJSON(filename: string, payload: any) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 파일 선택기를 띄워 JSON을 읽어 객체로 반환합니다.
 * 실패 시 null을 반환합니다.
 */
export async function pickAndReadJSON<T = unknown>(): Promise<T | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(String(reader.result));
          resolve(obj as T);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * 백업 파일의 형식을 가볍게 검사합니다.
 * (필수 필드만 체크)
 */
export function validateBackupPayload(
  payload: any
): payload is BackupPayload {
  return (
    payload &&
    payload.app?.name === "성공루틴" &&
    typeof payload.app?.version === "string" &&
    typeof payload.app?.exportedAt === "string" &&
    typeof payload.data === "object"
  );
}

/**
 * 백업 스냅샷의 섹션별 개수를 요약해 반환합니다.
 * UI에서 "무엇이 몇 건 들어있는지" 확인용으로 사용하세요.
 */
export function summarizeSnapshot(payload: BackupPayload) {
  const d = payload.data || {};
  const size = (v: any) =>
    Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : (v ? 1 : 0);

  return {
    goals: size(d.goals),
    todos: size(d.todos),
    anniversaries: size(d.anniversaries),
    bucket: size(d.bucket),
    gratitude: size(d.gratitude),
    posts: size(d.posts),
    comments: size(d.comments),
    contacts: size(d.contacts),
    settings: size(d.settings),
  };
}
