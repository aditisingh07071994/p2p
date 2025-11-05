import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path' // <-- 1. IMPORT RESOLVE

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- 2. ADD THIS BUILD SECTION ---
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  // --- END OF SECTION ---
})