import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);
const __dirname = dirname(path);

export default {
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["samantha.okia.app"],
    proxy: {
      // Proxy para o backend durante desenvolvimento
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
};

