// src/components/CarePing.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCarePicks } from "../hooks/useCarePicks";
import type { Contact } from "../types/contacts";
import { supabase } from "../lib/supabaseClient";
import { Phone, MessageCircle, Share2, Heart } from "lucide-react"; // 👈 아이콘 추가

type Props = {
  showHeader?: boolean;
  hideManageButton?: boolean;
};

const defaultMsg = (name?: string) =>
  `${name ? name + "님, " : ""}잘 지내시죠? 😊 문득 생각나 안부 전해요. 건강하시고 오늘도 평온하시길 바라요!`;

async function logPing(
  contactId: string,
  method: "call" | "sms" | "kakao" | "share" | "etc",
  note?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  await supabase.from("pings").insert({ user_id: user.id, contact_id: contactId, method, note: note ?? null });
  await supabase.from("contacts").update({ last_contacted_at: new Date().toISOString() }).eq("id", contactId);
}

/** 공통 아이콘 버튼 (접근성 + 작은 크기 + 은은한 호버) */
const IconBtn = ({
  title,
  onClick,
  children,
  as = "button",
  href,
  disabled,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  as?: "button" | "a";
  href?: string;
  disabled?: boolean;
}) => {
  const cls =
    "rounded-full p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-300 transition disabled:opacity-50";
  return as === "a" ? (
    <a href={href} onClick={onClick} title={title} aria-label={title} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={cls} disabled={disabled}>
      {children}
    </button>
  );
};

function ContactRow({ c }: { c: Contact }) {
  const [busy, setBusy] = useState(false);
  const tel = c.phone ? `tel:${c.phone}` : undefined;
  const sms = c.phone ? `sms:${c.phone}` : undefined;

  const handleShare = async () => {
    try {
      setBusy(true);
      const text = defaultMsg(c.name ?? undefined);
      if (navigator.share) {
        await navigator.share({ text, title: "안부 인사" });
        await logPing(c.id, "share", "Web Share");
      } else {
        await navigator.clipboard.writeText(text);
        await logPing(c.id, "etc", "copied message");
        alert("메시지를 클립보드에 복사했어요. 원하는 앱에서 붙여넣기 하세요.");
      }
    } finally {
      setBusy(false);
    }
  };

  const isImportant = (c.importance ?? 1) >= 3;
  const relation = c.relation ?? (c.tags?.length ? c.tags[0] : "");

  return (
    // 행 간격 살짝 압축
    <li className="flex items-start justify-between gap-3 py-1">
      {/* 왼쪽: 이름 + 서브정보 */}
      <div className="min-w-0 grow">
        <div className="truncate text-sm font-medium text-slate-800">
          {c.name}
          {isImportant && (
            <Heart className="ml-1 inline h-4 w-4 align-[-2px] text-emerald-500" aria-hidden />
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          {/* 별뱃지 → 하트 아이콘으로 대체했으므로 텍스트 뱃지는 제거 */}
          {relation && <span className="truncate text-xs text-slate-500">{relation}</span>}
        </div>
      </div>

      {/* 오른쪽: 액션 아이콘 3개 */}
      <div className="shrink-0 flex items-center gap-2">
        {tel && (
          <IconBtn title="전화" as="a" href={tel} onClick={() => logPing(c.id, "call")}>
            <Phone className="h-4 w-4" />
          </IconBtn>
        )}
        {sms && (
          <IconBtn title="문자" as="a" href={sms} onClick={() => logPing(c.id, "sms")}>
            <MessageCircle className="h-4 w-4" />
          </IconBtn>
        )}
        <IconBtn title="공유 / 메시지" onClick={handleShare} disabled={busy}>
          <Share2 className="h-4 w-4" />
        </IconBtn>
      </div>
    </li>
  );
}

export default function CarePing({ showHeader = false, hideManageButton = false }: Props) {
  const { picks, loading, error, pickDate } = useCarePicks();

  return (
    <div className="text-sm">
      {showHeader && (
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">오늘의 안부 3</h3>
            <p className="text-xs text-slate-500">{pickDate} · 매일 갱신(한국시간)</p>
          </div>
          {!hideManageButton && (
            <Link
              to="/contacts"
              className="h-7 inline-flex items-center rounded-lg border px-3 text-xs hover:bg-slate-50"
            >
              연락처 관리
            </Link>
          )}
        </div>
      )}

      {loading && <div className="py-4 text-slate-500">추천을 불러오는 중…</div>}
      {error && <div className="py-4 text-rose-600">{error}</div>}

      {!loading && !error && (
        picks.length === 0 ? (
          <div className="py-4 text-slate-600">추천할 사람이 없어요. 연락처를 등록해 주세요.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {picks.map((c) => <ContactRow key={c.id} c={c} />)}
          </ul>
        )
      )}
    </div>
  );
}
