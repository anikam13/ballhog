import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on LAN so phones can join
    port: 5173,
    // ngrok terminates TLS; HMR needs wss on 443 when using the tunnel URL
    hmr: process.env.NGROK
      ? { clientPort: 443, protocol: "wss" }
      : undefined,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
