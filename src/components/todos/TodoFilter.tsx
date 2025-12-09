import { useMemo } from "react";

type SortOption = "manual" | "priority" | "due";
const SORT_LABELS: Record<SortOption, string> = {
    manual: "수동 정렬",
    priority: "중요도순",
    due: "마감일순",
};

// 대표 태그 (하드코딩 추천)
const RECOMMENDED_TAGS = ["건강", "업무", "스터디", "약속", "루틴"];

type Props = {
    search: string;
    setSearch: (s: string) => void;
    filterTag: string | null;
    setFilterTag: (t: string | null) => void;
    sortBy: SortOption;
    setSortBy: (s: SortOption) => void;
    // 전체 태그 목록 (DB에서 수집된 것들)
    allTags: string[];
};

export default function TodoFilter({
    search,
    setSearch,
    filterTag,
    setFilterTag,
    sortBy,
    setSortBy,
    allTags,
}: Props) {
    // 추천 태그와 실제 사용된 태그 합치기 (중복 제거)
    const displayTags = useMemo(() => {
        const set = new Set([...RECOMMENDED_TAGS, ...allTags]);
        return Array.from(set);
    }, [allTags]);

    return (
        <div className="mb-4 space-y-3">
            {/* 1. 검색 + 정렬 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="검색 (제목, 메모, 태그)..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                >
                    {Object.entries(SORT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. 태그 필터 (가로 스크롤) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    onClick={() => setFilterTag(null)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${filterTag === null
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                >
                    전체
                </button>
                {displayTags.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${filterTag === tag
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        #{tag}
                    </button>
                ))}
            </div>
        </div>
    );
}
