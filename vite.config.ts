import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({base:'/Folio/',plugins:[react()],build:{chunkSizeWarningLimit:700}})
