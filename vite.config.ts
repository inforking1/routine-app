import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // HashRouter면 base는 항상 "/"가 가장 안전합니다.
  base: "/",
  build: { outDir: "dist" }
});
