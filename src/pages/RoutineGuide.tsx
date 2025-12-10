// src/pages/RoutineGuide.tsx
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { Brain, CheckCircle2, Users, Gift, Moon, ArrowRight } from "lucide-react";
// NOTE: 위 아이콘은 이미 프로젝트에서 lucide-react를 사용 중일 때 동작합니다.
// 만약 아이콘 패키지를 아직 안쓴다면 `npm i lucide-react` 후 사용하세요.

function Bullet({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <h4 className="text-base font-semibold">{title}</h4>
        <p className="text-sm text-slate-600">{desc}</p>
      </div>
    </div>
  );
}

export default function RoutineGuidePage() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="성공을 부르는 루틴 가이드"
      onHome={() => navigate("/")}
    >
      {/* 상단 인트로 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <p className="text-slate-700">
          이 앱은 하루를 구조화해{" "}
          <span className="font-semibold">성공 습관을 자동화</span>하도록 돕는
          개인 리추얼 시스템입니다. 아침엔 나를 세우고, 낮엔 세상을
          관리하며, 밤엔 마음을 정리하세요. 이 흐름이 당신의 하루를, 그리고
          인생을 바꿀 거예요.
        </p>

        {/* 오늘의 여정 진행도 (시각적 안내) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border px-3 py-1">💭 마음 (Mind)</span>
          <ArrowRight className="h-4 w-4" />
          <span className="rounded-full border px-3 py-1">💪 행동 (Action)</span>
          <ArrowRight className="h-4 w-4" />
          <span className="rounded-full border px-3 py-1">
            🤝 관계 (Relation)
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className="rounded-full border px-3 py-1">🎁 보상 (Reward)</span>
          <ArrowRight className="h-4 w-4" />
          <span className="rounded-full border px-3 py-1">
            🌙 성찰 (Reflection)
          </span>
        </div>
      </div>

      {/* 5단계 가이드 */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Bullet
          icon={<Brain className="h-5 w-5 text-slate-700" />}
          title="1) 마음 (Mind) — 하루의 방향을 세우기"
          desc="목표와 명상으로 정신을 정렬합니다. 홈 상단에 목표 요약을 고정하고, ‘오늘의 한 문장’으로 마음을 리셋하세요."
        />
        <Bullet
          icon={<CheckCircle2 className="h-5 w-5 text-slate-700" />}
          title="2) 행동 (Action) — 작은 실천의 누적"
          desc="오늘 꼭 해야 할 3가지를 정하세요. 가능한 한 작게 쪼개고, 완료 체크로 성취감을 쌓습니다."
        />
        <Bullet
          icon={<Users className="h-5 w-5 text-slate-700" />}
          title="3) 관계 (Relation) — 소중한 사람을 잊지 않기"
          desc="기념일과 안부를 챙기면 신뢰가 쌓입니다. 연락처 3명 추천/완료 체크로 관계 루틴을 유지하세요."
        />
        <Bullet
          icon={<Gift className="h-5 w-5 text-slate-700" />}
          title="4) 보상 (Reward) — 동기부여의 순환"
          desc="리워드 미션으로 재미와 보상을 더합니다. 루틴을 지킬수록 혜택과 성취감이 커집니다."
        />
        <Bullet
          icon={<Moon className="h-5 w-5 text-slate-700" />}
          title="5) 성찰 (Reflection) — 오늘을 정리하고 내일을 준비"
          desc="감사일기 1~3줄로 하루를 마무리하세요. 작지만 꾸준한 성찰이 삶의 품질을 바꿉니다."
        />
      </div>

      {/* 루틴 사용 가이드 */}
      <div className="mt-5 grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-base font-semibold">하루 UX 흐름</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>
              <span className="font-medium">아침</span> — 목표 요약 → 오늘의
              명상/문구 → 오늘의 할 일
            </li>
            <li>
              <span className="font-medium">낮</span> — 기념일 → 뉴스 →
              안부/연락처 → 리워드 미션
            </li>
            <li>
              <span className="font-medium">저녁</span> — 버킷리스트 점검 →
              감사일기
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-base font-semibold">작동 원칙</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>복잡함보다 일관성: 매일 같은 자리, 같은 흐름</li>
            <li>작게 시작, 즉시 완료: 3분 이내에 끝낼 수 있게</li>
            <li>기록은 곧 보상: 완료 체크가 동기를 만든다</li>
          </ul>
        </div>
      </div>

      {/* 성공 루틴 지도 카드 (Static Guide) - Moved from Home */}
      <div className="mt-5 rounded-[22px] bg-[#F3F5FE] shadow-sm px-5 py-6 space-y-3">
        <h3 className="text-[18px] font-semibold text-slate-900 mb-1">이 앱은 ‘성공 루틴 지도’입니다</h3>
        <p className="text-[13px] text-slate-600 mb-3">하루를 성공으로 이끄는 모든 루틴을 한 곳에 모아둔 앱입니다.</p>

        <div className="space-y-3">
          {/* 1. 아침 */}
          <div className="rounded-[16px] bg-white/80 px-4 py-3 border border-indigo-50">
            <h4 className="text-[14px] font-semibold text-slate-900">아침 – 마음 루틴</h4>
            <p className="text-[13px] text-slate-700 mt-1">오늘의 다짐, 아침 루틴으로 하루의 방향과 컨디션을 먼저 세웁니다.</p>
          </div>

          {/* 2. 낮 */}
          <div className="rounded-[16px] bg-white/80 px-4 py-3 border border-indigo-50">
            <h4 className="text-[14px] font-semibold text-slate-900">낮 – 행동 루틴</h4>
            <p className="text-[13px] text-slate-700 mt-1">목표, 오늘의 할 일, 뉴스/정보 루틴으로 ‘해야 할 것’을 실행으로 연결합니다.</p>
          </div>

          {/* 3. 저녁 */}
          <div className="rounded-[16px] bg-white/80 px-4 py-3 border border-indigo-50">
            <h4 className="text-[14px] font-semibold text-slate-900">저녁 – 회고 루틴</h4>
            <p className="text-[13px] text-slate-700 mt-1">명상, 감사일기, (앞으로 추가될) 저녁 루틴으로 하루를 정리하고 회고합니다.</p>
          </div>

          {/* 4. 항상 */}
          <div className="rounded-[16px] bg-white/80 px-4 py-3 border border-indigo-50">
            <h4 className="text-[14px] font-semibold text-slate-900">항상 – 관계·동기 루틴</h4>
            <p className="text-[13px] text-slate-700 mt-1">안부, 기념일, 리워드/보상 루틴으로 사람과 동기부여를 관리합니다.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          홈으로
        </button>
        <button
          onClick={() => navigate("/")}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          오늘의 루틴 시작하기
        </button>
      </div>
    </PageShell>
  );
}
