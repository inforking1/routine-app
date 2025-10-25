// vite.config.ts
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

/**
 * GitHub Actions 환경이면 GITHUB_REPOSITORY=owner/repo 형태가 들어있음.
 * repo 이름을 base 로 사용해 /repo/ 를 자동 설정.
 * 로컬/커스텀 도메인 배포면 base="/"
 *
 * 예) inforking1/routine-app  → base="/routine-app/"
 */
const repo =
  (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split("/")[1]) || "";
const isCI = !!process.env.CI;
const base = isCI && repo ? `/${repo}/` : "/";

/**
 * GitHub Pages에서 SPA 라우팅이 404로 떨어지지 않도록
 * 빌드가 끝난 후 dist/index.html을 dist/404.html로 복사하는 플러그인
 */
function spaFallback404(): Plugin {
  return {
    name: "spa-fallback-404",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      const notFoundPath = path.join(outDir, "404.html");
      try {
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, notFoundPath);
          // console.log("[spa-fallback-404] 404.html created");
        }
      } catch (err) {
        console.warn("[spa-fallback-404] failed:", err);
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),

    // ✅ PWA (웹앱 설치/오프라인 캐시)
    VitePWA({
      registerType: "prompt", // 새 버전 시 업데이트 안내
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-192x192.png",
        "pwa-maskable-512x512.png",
      ],
      // base(서브경로)에 맞춘 start_url/scope
      manifest: {
        name: "성공을부르는루틴",
        short_name: "성공루틴",
        description: "목표·할일·감사·버킷을 한 곳에서! Supabase 연동 루틴 앱",
        start_url: base, // 예: "/routine-app/"
        scope: base,
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // GitHub Pages에서 내부 라우팅 새로고침 가능하도록 index.html fallback
        navigateFallback: path.posix.join(base, "index.html"),
        runtimeCaching: [
          // 정적 리소스: StaleWhileRevalidate
          {
            urlPattern: ({ request }) =>
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "image" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Supabase API: NetworkFirst (민감데이터 캐시 X)
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // 개발서버에서는 SW 비활성(빌드에서만 활성)
      },
    }),

    // ✅ GitHub Pages용 404.html 복사
    spaFallback404(),
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
