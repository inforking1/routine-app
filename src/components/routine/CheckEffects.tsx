import { useEffect, useState } from "react";

type AnimationType = "scale" | "sparkle" | "fill";

type Props = {
    isActive: boolean;
    type: AnimationType;
    children: React.ReactNode;
    className?: string;
};

/**
 * CheckEffects Component
 * - Wraps a checkbox or card to provide animation feedback upon completion.
 * - Uses pure Tailwind/CSS logic (no heavy libraries).
 */
export default function CheckEffect({ isActive, type, children, className = "" }: Props) {
    const [trigger, setTrigger] = useState(false);

    useEffect(() => {
        if (isActive) {
            setTrigger(true);
            const t = setTimeout(() => setTrigger(false), 800);
            return () => clearTimeout(t);
        }
    }, [isActive]);

    // 1. Scale Pop Effect
    if (type === "scale") {
        return (
            <div className={`${className} transition-transform duration-300 ${trigger ? "scale-105" : "scale-100"}`}>
                {children}
            </div>
        );
    }

    // 2. Sparkle Effect (CSS Particles)
    if (type === "sparkle") {
        return (
            <div className={`relative ${className}`}>
                {trigger && (
                    <>
                        <span className="absolute -top-2 -left-2 animate-ping text-yellow-400 text-xs">✨</span>
                        <span className="absolute -top-4 right-0 animate-bounce text-yellow-400 text-xs delay-75">✨</span>
                        <span className="absolute bottom-0 -right-2 animate-pulse text-yellow-400 text-xs delay-150">✨</span>
                    </>
                )}
                {children}
            </div>
        );
    }

    // 3. Filled Progress Effect (Background Sweep)
    if (type === "fill") {
        return (
            <div className={`relative overflow-hidden ${className}`}>
                <div
                    className={`absolute inset-0 bg-green-400/20 transition-transform duration-500 origin-left ${isActive ? "scale-x-100" : "scale-x-0"
                        }`}
                    style={{ zIndex: 0 }}
                />
                <div className="relative z-10">
                    {children}
                </div>
            </div>
        );
    }

    return <div className={className}>{children}</div>;
}
