// src/pages/MeditationPage.tsx
import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import MeditationTimer from "../components/MeditationTimer";
import MeditationOfTheDay from "../components/MeditationOfTheDay";
import {
  DAILY_QUESTIONS,
  STORAGE_KEYS,
  analyzeSentiment,
  extractKeywords,
  type Sentiment
} from "../utils/meditationData";
import clsx from "clsx";
import useAuth from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { Trash2 } from "lucide-react";

type Log = {
  id: string;
  date: string;
  note: string;
  sentiment: Sentiment;
  tags: string[];
};

export default function MeditationPage({
  note,
  setNote,
  onHome,
}: {
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  onHome: () => void;
}) {
  const { user } = useAuth();

  // ── States ──
  const [logs, setLogs] = useState<Log[]>([]);
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);

  // 오늘의 질문
  const [dailyQ, setDailyQ] = useState("");
  const [dailyAnswer, setDailyAnswer] = useState("");

  useEffect(() => {
    // 날짜별 고정 질문
    const idx = new Date().getDate() % DAILY_QUESTIONS.length;
    setDailyQ(DAILY_QUESTIONS[idx]);
  }, []);

  // ── Load Data ──
  // 로그인 상태(user)가 변경될 때마다 데이터를 다시 로드합니다.
  useEffect(() => {
    const loadData = async () => {
      const today = new Date().toISOString().slice(0, 10);

      if (user) {
        // [로그인 상태] Supabase에서만 데이터 조회
        try {
          // 1. Logs 조회
          const { data: logData, error: logError } = await supabase
            .from("meditation_logs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (logError) throw logError;

          if (logData) {
            const mappedLogs: Log[] = logData.map(d => ({
              id: d.id,
              date: d.created_at,
              note: d.note,
              sentiment: d.sentiment as Sentiment,
              tags: d.tags || []
            }));
            setLogs(mappedLogs);
          }

          // 2. Streak 조회
          const { data: streakData, error: streakError } = await supabase
            .from("meditation_streaks")
            .select("current, last_date")
            .eq("user_id", user.id)
            .single();

          if (streakError && streakError.code !== 'PGRST116') throw streakError; // PGRST116 is "No rows found", which is fine for first time users

          if (streakData) {
            setStreak(streakData.current);
            if (streakData.last_date === today) {
              setCheckedInToday(true);
            } else {
              setCheckedInToday(false);
            }
          } else {
            // 데이터가 없으면 초기화
            setStreak(0);
            setCheckedInToday(false);
          }

        } catch (e) {
          console.error("Supabase load error:", e);
        }

      } else {
        // [비로그인 상태] LocalStorage에서만 데이터 조회
        try {
          // 1. Logs
          const rawLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
          if (rawLogs) {
            setLogs(JSON.parse(rawLogs));
          } else {
            setLogs([]);
          }

          // 2. Streak
          const rawStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
          if (rawStreak) {
            const { current, lastDate } = JSON.parse(rawStreak);
            setStreak(current);
            if (lastDate === today) {
              setCheckedInToday(true);
            } else {
              setCheckedInToday(false);
            }
          } else {
            setStreak(0);
            setCheckedInToday(false);
          }
        } catch (e) {
          console.error("LocalStorage load error:", e);
        }
      }
    };

    loadData();
  }, [user]);

  // ── Handlers ──

  // 1. 오늘의 질문 답변 저장
  const handleSaveAnswer = async () => {
    if (!dailyAnswer.trim()) return;

    const fullNote = `Q. ${dailyQ}\n\nA. ${dailyAnswer.trim()}`;
    const sentiment = analyzeSentiment(dailyAnswer);
    const tags = ["오늘의질문", ...extractKeywords(dailyAnswer)];
    const newDate = new Date().toISOString();

    // 임시 ID 생성 (UI 낙관적 업데이트용)
    const tempId = crypto.randomUUID();

    const newLog: Log = {
      id: tempId,
      date: newDate,
      note: fullNote,
      sentiment,
      tags,
    };

    // UI 우선 업데이트 (Optimistic Update)
    const nextLogs = [newLog, ...logs];
    setLogs(nextLogs);
    setDailyAnswer("");

    try {
      if (user) {
        // [로그인] Supabase 저장
        const { error } = await supabase.from("meditation_logs").insert({
          user_id: user.id,
          note: fullNote,
          sentiment,
          tags,
          created_at: newDate
        });
        if (error) throw error;
      } else {
        // [비로그인] LocalStorage 저장
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(nextLogs));
      }

      alert("답변이 저장되었습니다. 지난 기록에서 확인하세요!");

      // 자동 체크인 시도
      if (!checkedInToday) handleCheckIn();

    } catch (e) {
      console.error(e);
      alert("저장에 실패했습니다.");
      setLogs(logs); // 롤백
    }
  };

  // 2. 일반 명상 메모 저장
  const handleSaveLog = async () => {
    if (!note.trim()) return;

    const sentiment = analyzeSentiment(note);
    const tags = extractKeywords(note);
    const newDate = new Date().toISOString();
    const tempId = crypto.randomUUID();

    const newLog: Log = {
      id: tempId,
      date: newDate,
      note: note.trim(),
      sentiment,
      tags,
    };

    // UI 우선 업데이트
    const nextLogs = [newLog, ...logs];
    setLogs(nextLogs);
    setNote("");

    try {
      if (user) {
        // [로그인] Supabase 저장
        const { error } = await supabase.from("meditation_logs").insert({
          user_id: user.id,
          note: note.trim(),
          sentiment,
          tags,
          created_at: newDate
        });
        if (error) throw error;
      } else {
        // [비로그인] LocalStorage 저장
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(nextLogs));
      }

      alert("명상 기록이 저장되었습니다.");
      if (!checkedInToday) handleCheckIn();

    } catch (e) {
      console.error(e);
      alert("저장에 실패했습니다.");
      setLogs(logs); // 롤백
    }
  };

  // 3. 체크인
  const handleCheckIn = async () => {
    if (checkedInToday) return;

    const today = new Date().toISOString().slice(0, 10);
    const nextStreak = streak + 1;

    // UI 우선 업데이트
    setStreak(nextStreak);
    setCheckedInToday(true);

    try {
      if (user) {
        // [로그인] Supabase Upsert
        // streaks 테이블은 user_id가 PK 혹은 Unique여야 함
        const { error } = await supabase.from("meditation_streaks").upsert({
          user_id: user.id,
          current: nextStreak,
          last_date: today
        });
        if (error) throw error;
      } else {
        // [비로그인] LocalStorage 저장
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({ current: nextStreak, lastDate: today }));
      }
    } catch (e) {
      console.error(e);
      // 체크인 실패 시 UI 되돌리기는 애매하므로 에러 로그만 남김 (사용자 경험상 유지가 나을 수 있음)
    }
  };

  // 4. 기록 삭제
  const handleDeleteLog = async (id: string) => {
    if (!confirm("이 기록을 삭제하시겠습니까?")) return;

    const prevLogs = [...logs];
    const nextLogs = logs.filter(l => l.id !== id);
    setLogs(nextLogs);

    try {
      if (user) {
        // [로그인] Supabase 삭제
        const { error } = await supabase.from("meditation_logs").delete().eq("id", id);
        if (error) throw error;
      } else {
        // [비로그인] LocalStorage 삭제
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(nextLogs));
      }
    } catch (e) {
      console.error(e);
      alert("삭제에 실패했습니다.");
      setLogs(prevLogs); // 롤백
    }
  };

  // ── Render Helpers ──
  const getSentimentIcon = (s: Sentiment) => {
    if (s === "positive") return "🌞";
    if (s === "negative") return "🌧️";
    return "☁️";
  };

  return (
    <PageShell title="명상" onHome={onHome}>
      <div className="max-w-6xl mx-auto px-4 space-y-6 pb-10">

        {/* Row 1: 오늘의 명상 & 나의 루틴 */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:min-h-[320px]">
          {/* Card 1: 오늘의 명상 */}
          <MeditationOfTheDay variant="card" className="h-full" />

          {/* Card 2: 스트릭 (나의 루틴) */}
          <SectionCard title="나의 루틴" className="h-full bg-white/60 border-indigo-100 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
              <div className="text-5xl font-bold text-indigo-600 mb-2 tabular-nums">
                {streak}<span className="text-lg text-indigo-400 font-normal">일</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">연속 명상 달성 중!</p>

              <button
                onClick={handleCheckIn}
                disabled={checkedInToday}
                className={clsx(
                  "rounded-full px-6 py-2.5 text-sm font-semibold transition-all shadow-sm",
                  checkedInToday
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95"
                )}
              >
                {checkedInToday ? "오늘 완료함 ✅" : "오늘 명상 완료 체크"}
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Row 2: 집중 타이머 (Full Width) */}
        <SectionCard
          title="집중 타이머"
          subtitle="호흡에 온전히 집중해보세요"
          className="bg-white/80 border-emerald-100 w-full"
        >
          <div className="mx-auto max-w-3xl py-2">
            <MeditationTimer defaultMinutes={3} onComplete={handleCheckIn} />
          </div>
        </SectionCard>

        {/* Row 3: 2 Column Layout (PC) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Left Column: Question + Memo */}
          <div className="flex flex-col gap-6">
            {/* Card 1: 오늘의 질문 */}
            <SectionCard title="오늘의 질문" className="bg-amber-50/60 border-amber-100 flex flex-col">
              <p className="text-lg font-medium text-amber-900 leading-relaxed mb-4 min-h-[3.5rem]">
                Q. {dailyQ}
              </p>

              <div className="flex-1 flex flex-col space-y-3">
                <textarea
                  value={dailyAnswer}
                  onChange={(e) => setDailyAnswer(e.target.value)}
                  placeholder="여기에 답변을 적어보세요."
                  className="w-full flex-1 min-h-[120px] rounded-lg border border-amber-200 bg-white/50 p-3 text-sm placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAnswer}
                    disabled={!dailyAnswer.trim()}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    답변 저장하기
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Card 2: 자유 메모 */}
            <SectionCard
              title="자유 메모"
              subtitle="떠오르는 생각 기록"
              className="bg-white flex flex-col flex-1"
            >
              <div className="flex-1 flex flex-col">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="답변을 적거나, 지금 느끼는 감정을 기록하세요..."
                  className="w-full flex-1 min-h-[160px] rounded-xl border border-slate-200 p-4 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition"
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {note && (
                      <span className="flex items-center gap-1">
                        분석: {getSentimentIcon(analyzeSentiment(note))} {analyzeSentiment(note)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSaveLog}
                    disabled={!note.trim()}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    저장
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column: 지난 기록 */}
          <SectionCard
            title="지난 기록"
            subtitle={`총 ${logs.length}개`}
            className="bg-slate-50/50 border-slate-200 h-full flex flex-col min-h-[500px] lg:min-h-auto"
          >
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[600px] lg:max-h-[calc(100%-3rem)]">
              {logs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                  아직 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {logs.map((log) => (
                    <div key={log.id} className="group relative rounded-xl bg-white p-3 shadow-sm border border-slate-100 transition hover:shadow-md">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400">
                            {new Date(log.date).toLocaleDateString()}
                          </span>
                          <span title={`감정: ${log.sentiment}`} className="cursor-help text-xs">
                            {getSentimentIcon(log.sentiment)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {log.note}
                      </p>
                      {log.tags && log.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {log.tags.map((t) => (
                            <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
