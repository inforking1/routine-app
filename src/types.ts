export type Goal = { id: number; text: string; progress: number; term: "short" | "mid" | "long"; };
export type Todo = { id: number; text: string; done: boolean };
export type Anniversary = { id: number; title: string; date: string };
export type Meditation = {
  id: number;
  duration: number;     // 총 명상 시간 (분 단위)
  remaining: number;    // 남은 시간 (초 단위)
  isRunning: boolean;   // 진행 중 여부
  startedAt?: string;   // ISO 타임스탬프 (선택)
};
export type Message = { id: number; text: string; at: string };
export type BucketItem = { id: number; text: string; done: boolean };
export type GratitudeItem = { id: number; text: string; date: string };

export type Comment = {
  id: number;
  author: string;         // 간단히 닉네임 저장 (차후 계정 연동 가능)
  content: string;
  createdAt: string;      // ISO 문자열
};

export type Post = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: Comment[];
  title?: string;
};


export type View =
  | "home" | "goals" | "todos" | "anniversaries" | "meditation" | "contacts"
  | "news" | "mission" | "bucket" | "gratitude" | "community" | "settings" | "pledges" ;
