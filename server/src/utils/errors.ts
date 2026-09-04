// HTTP 错误：路由/校验层通过抛出带状态码的错误，由全局错误中间件统一转成 JSON 响应。
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// 提取错误消息。不依赖 instanceof：原生模块（better-sqlite3）的错误在部分环境（如 Jest worker 加载
// 原生插件）可能跨 realm 导致 instanceof Error 失效，按消息分类更可靠。
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

// 识别 better-sqlite3 的外键约束违规（引用了不存在的分类/标签等），对调用方应返回 400。
export function isForeignKeyError(error: unknown): boolean {
  return /FOREIGN KEY constraint failed/i.test(getErrorMessage(error));
}

// 系统级错误识别：better-sqlite3 抛 SqliteError，文件系统错误带 errno code。
// 各路由共用：系统级错误应统一按 500 + 通用文案响应（不泄露内部信息），
// 而不是压成 400 并透传错误原文。
export function isInternalSystemError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  const code = (error as { code?: unknown }).code;
  return name === 'SqliteError' || (typeof code === 'string' && code.length > 0);
}
