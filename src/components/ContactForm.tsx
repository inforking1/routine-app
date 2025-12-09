import { useEffect, useState } from "react";
import type { Contact } from "../types/contacts";

type Props = {
  initial?: Partial<Contact>;
  onSubmit: (values: Omit<Contact, "id" | "created_at" | "user_id">) => Promise<void> | void;
  onCancel?: () => void;
  busy?: boolean;
};

const PRESET_TAGS = ["가족", "친구", "업무", "멘토", "고객", "귀인"];

function toYYYYMMDD(date: string | null | undefined) {
  if (!date) return "";
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
  const [importance, setImportance] = useState<number>(initial?.importance ?? 1);

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? []);
  const [customTagInput, setCustomTagInput] = useState("");

  // Dates
  const [birthday, setBirthday] = useState<string>(toYYYYMMDD(initial?.birthday ?? null));
  const [birthdayType, setBirthdayType] = useState<"solar" | "lunar">(initial?.birthday_type ?? "solar");

  const [anniversary, setAnniversary] = useState<string>(toYYYYMMDD(initial?.anniversary ?? null));
  const [anniversaryType, setAnniversaryType] = useState<"solar" | "lunar">(initial?.anniversary_type ?? "solar");

  const [note, setNote] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setPhone(initial?.phone ?? "");
    setImportance(initial?.importance ?? 1);
    setSelectedTags(initial?.tags ?? []);
    setBirthday(toYYYYMMDD(initial?.birthday ?? null));
    setBirthdayType(initial?.birthday_type ?? "solar");
    setAnniversary(toYYYYMMDD(initial?.anniversary ?? null));
    setAnniversaryType(initial?.anniversary_type ?? "solar");
  }, [initial?.id]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const val = customTagInput.trim();
    if (val && !selectedTags.includes(val)) {
      setSelectedTags(prev => [...prev, val]);
    }
    setCustomTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Omit<Contact, "id" | "created_at" | "user_id"> = {
      name: name.trim(),
      phone: phone.trim() || null,
      tags: selectedTags,
      importance: importance ?? 1,
      birthday: birthday ? birthday : null,
      birthday_type: birthday ? birthdayType : "solar",
      anniversary: anniversary ? anniversary : null,
      anniversary_type: anniversary ? anniversaryType : "solar",
      last_contacted_at: initial?.last_contacted_at ?? null,
      created_at: initial?.created_at ?? new Date().toISOString(),
      user_id: initial?.user_id ?? "",
      id: initial?.id ?? "",
    } as unknown as Omit<Contact, "id" | "created_at" | "user_id">;

    await onSubmit(payload);
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-1 border-b pb-2 mb-4">
        <h3 className="font-bold text-slate-800 text-lg">{initial ? "연락처 수정" : "새 연락처 추가"}</h3>
        <p className="text-xs text-slate-500">소중한 인맥을 등록하고 안부를 챙기세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

        {/* Row 1: 이름 / 중요도 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">이름 <span className="text-rose-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="예) 홍길동"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">중요도</label>
          <select
            value={importance}
            onChange={(e) => setImportance(parseInt(e.target.value))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value={1}>○ 1 - 가벼움</option>
            <option value={2}>● 2 - 보통</option>
            <option value={3}>★ 3 - 최우선</option>
          </select>
        </div>

        {/* Row 2: 전화번호 / 태그 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">전화번호</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="숫자만 입력 (예: 01012345678)"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">태그</label>
          {/* Preset Chips */}
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${selectedTags.includes(tag)
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {/* Custom Input */}
          <div className="flex gap-2">
            <input
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="직접 입력 (Enter로 추가)"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              추가
            </button>
          </div>
          {/* Selected Custom Tags Display */}
          <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
            {selectedTags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                {tag}
                <button type="button" onClick={() => toggleTag(tag)} className="text-slate-400 hover:text-rose-500">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Row 3: 생일 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">생일</label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">생일 유형</label>
          <div className="flex items-center gap-4 h-[42px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="birthdayType"
                value="solar"
                checked={birthdayType !== "lunar"}
                onChange={() => setBirthdayType("solar")}
                className="accent-indigo-600"
              />
              <span className="text-sm text-slate-700">🌞 양력</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="birthdayType"
                value="lunar"
                checked={birthdayType === "lunar"}
                onChange={() => setBirthdayType("lunar")}
                className="accent-indigo-600"
              />
              <span className="text-sm text-slate-700">🌙 음력</span>
            </label>
          </div>
        </div>

        {/* Row 4: 기념일 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">기념일</label>
          <input
            type="date"
            value={anniversary}
            onChange={(e) => setAnniversary(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">기념일 유형</label>
          <div className="flex items-center gap-4 h-[42px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="annivType"
                value="solar"
                checked={anniversaryType !== "lunar"}
                onChange={() => setAnniversaryType("solar")}
                className="accent-indigo-600"
              />
              <span className="text-sm text-slate-700">🌞 양력</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="annivType"
                value="lunar"
                checked={anniversaryType === "lunar"}
                onChange={() => setAnniversaryType("lunar")}
                className="accent-indigo-600"
              />
              <span className="text-sm text-slate-700">🌙 음력</span>
            </label>
          </div>
        </div>

      </div>

      <div className="pt-4 flex items-center justify-end gap-3 border-t mt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? "저장 중..." : "저장하기"}
        </button>
      </div>

    </form>
  );
}
