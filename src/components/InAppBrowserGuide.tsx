import { useEffect, useState } from "react";
import { isInAppBrowser } from "../utils/browser";

export default function InAppBrowserGuide() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 1. Check if it's an in-app browser
        const inApp = isInAppBrowser();
        if (!inApp) return;

        // 2. Check if user already dismissed it
        const dismissed = localStorage.getItem("inapp_guide_dismissed");
        if (dismissed === "true") return;

        setVisible(true);
    }, []);

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("주소가 복사되었습니다. 브라우저 주소창에 붙여넣기 해주세요.");
        } catch (err) {
            alert("주소 복사에 실패했습니다. 주소창을 길게 눌러 복사해주세요.");
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("inapp_guide_dismissed", "true");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                    기본 브라우저에서 열어주세요
                </h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    카카오톡, 인스타그램 등 <strong>인앱 브라우저</strong>에서는
                    <br />
                    <span className="text-rose-600 font-semibold">
                        Google 로그인 및 앱 설치
                    </span>
                    가 제한될 수 있습니다.
                </p>

                <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm text-slate-700 space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-900 min-w-[60px]">Android</span>
                        <span>우측 상단 <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-xs text-slate-600">⋮</span> 메뉴 → <strong>'다른 브라우저로 열기'</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-900 min-w-[60px]">iOS</span>
                        <span>하단 <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-xs text-slate-600">공유</span> 아이콘 → <strong>'Safari에서 열기'</strong></span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={copyUrl}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                    >
                        {/* Simple Copy Icon SVG */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        주소 복사하기
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                        닫기 (제한된 기능으로 계속)
                    </button>
                </div>

                <p className="mt-4 text-center text-xs text-slate-400">
                    일부 기능이 동작하지 않을 수 있습니다.
                </p>
            </div>
        </div>
    );
}
