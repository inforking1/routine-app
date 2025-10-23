// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

/**
 * GitHub Actions 환경이면 GITHUB_REPOSITORY=owner/repo 형태가 들어있음.
 * repo 이름을 base 로 사용해 /repo/ 를 자동 설정.
 * 로컬/커스텀 도메인 배포면 base="/"
 */
const repo =
  (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split("/")[1]) || "";
const isCI = !!process.env.CI;
const base = isCI && repo ? `/${repo}/` : "/";

/**
 * 빌드 완료 후 dist/index.html → dist/404.html 복사
 * (GitHub Pages SPA 라우팅 404 문제 방지)
 */
function spaFallback404() {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      const err = () => console.warn("[spa-fallback-404] index.html not found, skip.");
      try {
        if (!fs.existsSync(indexPath)) return err();
        fs.copyFileSync(indexPath, path.join(outDir, "404.html"));
        console.log("[spa-fallback-404] 404.html created.");
      } catch {
        err();
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback404()],
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
