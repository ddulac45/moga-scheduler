import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Allow the app to be served from a sub-path on Vercel if needed
  base: '/',
});
