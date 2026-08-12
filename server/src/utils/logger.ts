// 全局日志模块：统一用 winston 输出日志，生产环境输出 JSON 便于采集，开发环境输出可读的控制台格式。
// HTTP 访问日志由 morgan 通过 httpLoggerStream 汇入同一套日志体系。
import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        })
      ),
  transports: [new winston.transports.Console()],
});

// morgan 的 httpLoggerStream：把 HTTP 访问日志写入 winston。
export const httpLoggerStream: { write: (message: string) => void } = {
  write(message: string): void {
    logger.info(message.trimEnd());
  },
};

// 初始化 Token 横幅：首次启动且尚未创建账户时，通过日志向部署者展示一次性初始化 Token。
export function logSetupToken(token: string): void {
  logger.info('==============================================================');
  logger.info('首次使用：请先创建你的登录账户');
  logger.info(`初始化 Token：${token}`);
  logger.info('提示：Token 在创建账户后立即失效；创建账户前重启容器会重新生成');
  logger.info('==============================================================');
}
