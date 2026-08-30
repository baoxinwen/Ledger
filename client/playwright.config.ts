import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

// e2e 后端独立端口：避开 3000（本地开发默认）以及 Windows Hyper-V/WSL 动态保留端口段
// （常见保留区间如 8081-8180，8088 曾因此绑定失败 EACCES），保证受限环境下也能启动隔离后端。
const E2E_BACKEND_PORT = 18088;
const E2E_FRONTEND_PORT = 6080;
const E2E_SETUP_TOKEN = 'e2e-setup-token';
// 每次运行使用全新的临时数据库，避免污染开发库或残留上一轮测试数据。
const e2eDbPath = path.join(os.tmpdir(), `ledger-e2e-${Date.now()}.db`);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // 隔离后端：独立端口 + 全新临时数据库 + 已知初始化 Token，让 e2e 自包含且可复现。
      command: 'npm run dev',
      cwd: path.join(configDir, '../server'),
      url: `http://localhost:${E2E_BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        PORT: String(E2E_BACKEND_PORT),
        LEDGER_DB_PATH: e2eDbPath,
        SETUP_TOKEN: E2E_SETUP_TOKEN,
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${E2E_FRONTEND_PORT} --strictPort`,
      url: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        API_PROXY_TARGET: `http://127.0.0.1:${E2E_BACKEND_PORT}`,
      },
    },
  ],
});
