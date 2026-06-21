import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // 외부(LAN/터널)에서도 접속 가능하도록 0.0.0.0 바인딩 + 호스트 검사 해제.
    // 터널 링크(ngrok/cloudflared/localtunnel 등) 하나로 접속하면
    // /api 요청이 아래 프록시를 거쳐 백엔드로 가므로 프론트·백엔드가 함께 동작한다.
    host: true,
    allowedHosts: true,
    // 개발 중 /api 요청을 백엔드(Express)로 프록시 → CORS/쿠키 이슈 최소화
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
