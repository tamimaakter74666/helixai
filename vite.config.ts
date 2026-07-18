import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: [
        '**/ruvi_memory.json',
        '**/ruvi.db',
        '**/sqlite.db',
        '**/db.sqlite',
        '**/server.log',
        '**/*.log'
      ]
    }
  },
});
