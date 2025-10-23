import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // ⬅️ 이게 핵심! (절대경로 '/' 금지)
  build: { outDir: "dist" }
});
