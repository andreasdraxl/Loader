import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true, // Öffnet automatisch die App im Browser
  },
  build: {
    target: 'esnext', // Nutzt moderne JavaScript-Features
  },
});
