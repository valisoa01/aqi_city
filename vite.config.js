import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, Vite doesn't run the /api serverless functions.
    // Run `vercel dev` instead of `npm run dev` if you want /api to work locally.
    port: 5173
  }
});
