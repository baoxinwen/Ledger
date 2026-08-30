// Vitest 配置：纯逻辑测试默认 Node，组件测试可通过文件注释切换到 jsdom。
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@mui/icons-material',
        replacement: path.resolve(__dirname, 'src/test/IconStub.tsx'),
      },
      {
        find: /^@mui\/icons-material\/.+$/,
        replacement: path.resolve(__dirname, 'src/test/IconStub.tsx'),
      },
    ],
  },
  optimizeDeps: {
    noDiscovery: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
