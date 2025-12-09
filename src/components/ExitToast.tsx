import { useEffect } from "react";

type Props = {
    message?: string;
    onClose?: () => void;
};

export default function ExitToast({ message = "한 번 더 누르면 앱이 종료됩니다.", onClose }: Props) {
    useEffect(() => {
        // 2.5초 뒤 자동 언마운트를 부모가 제어하도록
        const timer = setTimeout(() => {
            onClose?.();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                {message}
            </div>
        </div>
    );
}
