import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          const reactRuntimePackages = [
            '/node_modules/react/',
            '/node_modules/react-dom/',
            '/node_modules/react-router/',
            '/node_modules/react-router-dom/',
            '/node_modules/scheduler/',
          ];

          if (reactRuntimePackages.some((packagePath) => normalizedId.includes(packagePath))) {
            return 'react-runtime';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // 允许 dev server 读取仓库根目录下的源码（client 引用了服务端共享的颜色工具）。
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        // e2e 时通过 API_PROXY_TARGET 指向 Playwright 自启的隔离后端。
        // 默认目标显式用 127.0.0.1 而非 localhost：后端绑定 0.0.0.0（IPv4），
        // 而 localhost 在 Windows 上常先解析为 ::1——本机若有其他服务占住 [::1]:3000，
        // 代理就会把 /api 打到别人的服务上（已实际发生过）。
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
