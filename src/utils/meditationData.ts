// src/utils/meditationData.ts

export type Sentiment = "positive" | "neutral" | "negative";

export type MeditationQuote = {
    text: string;
    author: string;
    tags: string[]; // e.g. "morning", "night", "stress", "calm"
};

export const MEDITATION_QUOTES: MeditationQuote[] = [
    { text: "고요함 속에서 우리는 답을 찾는다.", author: "성공루틴", tags: ["calm", "morning"] },
    { text: "숨을 깊게 들이마시며, 지금 이 순간에 집중하세요.", author: "성공루틴", tags: ["focus", "stress"] },
    { text: "오늘의 스트레스는 내일의 성장을 위한 거름이 됩니다.", author: "성공루틴", tags: ["stress", "night"] },
    { text: "작은 성공이 모여 큰 변화를 만듭니다.", author: "성공루틴", tags: ["motivation", "morning"] },
    { text: "당신은 충분히 잘하고 있습니다.", author: "성공루틴", tags: ["comfort", "night"] },
    { text: "생각은 구름과 같아서, 왔다가 사라집니다.", author: "티벳 속담", tags: ["calm"] },
    { text: "가장 위대한 영광은 한 번도 실패하지 않는 것이 아니라, 실패할 때마다 일어서는 데 있다.", author: "공자", tags: ["motivation"] },
    { text: "평온함은 세상이 조용하기를 바라는 것이 아니라, 마음이 고요해지는 것이다.", author: "Unknown", tags: ["calm", "stress"] },
];

export const DAILY_QUESTIONS = [
    "지금 이 순간, 내 몸에서 가장 긴장된 곳은 어디인가요?",
    "오늘 나에게 감사한 3가지는 무엇인가요?",
    "지금 머릿속을 맴도는 생각 하나를 내려놓는다면 무엇인가요?",
    "오늘 하루, 나를 가장 기쁘게 한 순간은 언제였나요?",
    "내가 듣고 싶은 위로의 말은 무엇인가요?",
    "내일의 나를 위해 지금 해줄 수 있는 작은 선물은?",
    "최근에 느낀 작은 성취감은 무엇인가요?",
];

// 간단한 키워드 기반 감정 분석
export function analyzeSentiment(text: string): Sentiment {
    const positives = ["감사", "행복", "좋아", "편안", "기쁨", "성공", "뿌듯", "맑음", "기대", "사랑"];
    const negatives = ["불안", "짜증", "힘듦", "우울", "걱정", "실패", "화남", "지침", "스트레스", "후회"];

    let score = 0;
    positives.forEach(word => { if (text.includes(word)) score++; });
    negatives.forEach(word => { if (text.includes(word)) score--; });

    if (score > 0) return "positive";
    if (score < 0) return "negative";
    return "neutral";
}

// 키워드 태그 추출
export function extractKeywords(text: string): string[] {
    const keywords = ["성공", "목표", "스트레스", "관계", "가족", "친구", "업무", "공부", "운동", "휴식", "돈", "건강", "잠"];
    return keywords.filter(k => text.includes(k));
}

// 로컬 스토리지 키 관리
export const STORAGE_KEYS = {
    LOGS: "meditation_logs_v2", // [{id, date, duration, note, sentiment, tags}]
    STREAK: "meditation_streak", // {current: 0, lastDate: null}
};
