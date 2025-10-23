import { useEffect, useState } from "react";
import type { Contact } from "../types/contacts";

type Props = {
  initial?: Partial<Contact>;
  onSubmit: (values: Omit<Contact, "id" | "created_at" | "user_id">) => Promise<void> | void;
  onCancel?: () => void;
  busy?: boolean;
};

function toYYYYMMDD(date: string | null | undefined) {
  if (!date) return "";
  // 이미 YYYY-MM-DD 형식이면 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ContactForm({ initial, onSubmit, onCancel, busy }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(","));
  const [importance, setImportance] = useState<number>(initial?.importance ?? 1);
  const [birthday, setBirthday] = useState<string>(toYYYYMMDD(initial?.birthday ?? null));
  const [anniversary, setAnniversary] = useState<string>(toYYYYMMDD(initial?.anniversary ?? null));
  const [note, setNote] = useState(""); // UI 힌트용(옵션)

  useEffect(() => {
    // 편집 시작 시 타입 안정화
    setName(initial?.name ?? "");
    setPhone(initial?.phone ?? "");
    setTags((initial?.tags ?? []).join(","));
    setImportance(initial?.importance ?? 1);
    setBirthday(toYYYYMMDD(initial?.birthday ?? null));
    setAnniversary(toYYYYMMDD(initial?.anniversary ?? null));
  }, [initial?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // 빈 문자열은 null로
    const payload: Omit<Contact, "id" | "created_at" | "user_id"> = {
      name: name.trim(),
      phone: phone.trim() || null,
      tags: cleanTags.length ? cleanTags : [],
      importance: importance ?? 1,
      birthday: birthday ? birthday : null,
      anniversary: anniversary ? anniversary : null,
      last_contacted_at: initial?.last_contacted_at ?? null,
      // 타입 충족용 – 아래 필드는 실제 insert/update에서 무시됨(키만 맞추기).
      created_at: initial?.created_at ?? new Date().toISOString(),
      user_id: initial?.user_id ?? "",
      id: initial?.id ?? "",
    } as unknown as Omit<Contact, "id" | "created_at" | "user_id">;

    await onSubmit(payload);
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">이름 *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="예) 어머니"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">전화번호</label>
          <input
            value={phone ?? ""}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="예) 010-1234-5678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">중요도</label>
          <select
            value={importance}
            onChange={(e) => setImportance(parseInt(e.target.value))}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value={1}>1 (보통)</option>
            <option value={2}>2</option>
            <option value={3}>3 (중요)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">태그 (쉼표로 구분)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="예) 가족,친구,업무"
        />
        <p className="mt-1 text-xs text-slate-500">예: 가족, 친구, 업무</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">생일</label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">기념일</label>
          <input
            type="date"
            value={anniversary}
            onChange={(e) => setAnniversary(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
      </div>

      {note && <div className="text-xs text-slate-500">{note}</div>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          저장
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
