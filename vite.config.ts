import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.FYLLORA_BASE_PATH || "/Folio/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 700 },
});
