export function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";

  // KakaoTalk
  if (ua.includes("KAKAOTALK")) return true;

  // Instagram
  if (ua.includes("Instagram")) return true;

  // Facebook (FBAN: Facebook App for iOS, FBAV: Facebook App Version)
  if (ua.includes("FBAN") || ua.includes("FBAV")) return true;

  // Naver InApp
  if (ua.includes("NAVER(inapp)")) return true;

  // Daum InApp
  if (ua.includes("DaumApps")) return true;

  // Line
  if (ua.includes("Line")) return true;

  return false;
}
