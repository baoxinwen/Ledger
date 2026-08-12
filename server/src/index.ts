// 服务入口：初始化数据库、启动服务，并处理进程信号。
// Express 应用本身在 ./app 组装，便于测试直接引用。
import { initDatabase } from './database';
import db from './database';
import { logger } from './utils/logger';
import { authService } from './services/auth.service';
import app from './app';

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

const PORT = Number(process.env.PORT) || 3000;

try {
  initDatabase();
  authService.ensureSetupToken();
  logger.info('Database initialized successfully');
} catch (err) {
  logger.error(`Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  // 端口冲突等致命错误直接退出，让 Docker restart 策略接管，而不是留一个“容器 Up 但无响应”的僵尸。
  logger.error(`Server error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

// 优雅关闭：停止接收新连接 → 等待在途请求 → 关闭 SQLite（让 WAL checkpoint）→ 退出。
function shutdown(signal: string): void {
  logger.info(`收到 ${signal}，正在优雅关闭...`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      logger.warn(`关闭数据库时出错: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(0);
  });
  // 兜底：避免 keep-alive 连接让 close 一直等待。
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
