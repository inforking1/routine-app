// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages에서 repo 이름이 `routine-app`이면
// 프로덕션 빌드 시 자동으로 "/routine-app/"을 base로 사용합니다.
// 로컬(dev)에서는 "/" 그대로라서 URL이 어색하게 바뀌지 않아요.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/routine-app/" : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
