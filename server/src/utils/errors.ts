// HTTP 错误：路由/校验层通过抛出带状态码的错误，由全局错误中间件统一转成 JSON 响应。
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// 识别 better-sqlite3 的外键约束违规（引用了不存在的分类/标签等），对调用方应返回 400。
export function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message);
}
