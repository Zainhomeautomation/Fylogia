import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.FYLOGIA_BASE_PATH || "/Fylogia/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 700 },
});
