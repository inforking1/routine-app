import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setSupported(true);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt as any);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (installed) return null;
  if (!supported && !deferredPrompt) return null;

  return (
    <button
      onClick={onInstall}
      className="px-3 py-2 rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow"
      title="홈 화면에 앱 설치"
    >
      앱 설치
    </button>
  );
}
