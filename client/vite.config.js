import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 開発時は /api へのリクエストをバックエンド（Node.js）へ転送する
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
