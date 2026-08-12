import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 允许 dev server 读取仓库根目录下的源码（client 引用了服务端共享的颜色工具）。
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        // e2e 时通过 API_PROXY_TARGET 指向 Playwright 自启的隔离后端。
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
