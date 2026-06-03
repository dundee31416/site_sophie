import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// API host: when running inside docker-compose, target the backend service name.
// For local `npm run dev` outside compose, override with VITE_API_TARGET=http://localhost:8000.
const apiTarget = process.env.VITE_API_TARGET ?? "http://backend:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
});
