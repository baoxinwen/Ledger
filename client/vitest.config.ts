// Vitest 配置：客户端单测（纯函数与 store），Node 环境即可，不依赖浏览器。
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
