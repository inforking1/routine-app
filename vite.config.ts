import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // ✅ dev는 "/", build(배포)만 "/routine-app/"
  base: mode === "production" ? "/routine-app/" : "/",
}));
