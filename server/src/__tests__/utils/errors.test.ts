// 错误工具测试：HttpError 状态码与 FK 错误识别。
import { HttpError, isForeignKeyError } from '../../utils/errors';

describe('HttpError', () => {
  it('携带状态码与消息，且是 Error 实例', () => {
    const error = new HttpError(400, '无效输入');
    expect(error.status).toBe(400);
    expect(error.message).toBe('无效输入');
    expect(error.name).toBe('HttpError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('isForeignKeyError', () => {
  it('识别 SQLite 外键约束错误，不误判其他错误', () => {
    expect(isForeignKeyError(new Error('FOREIGN KEY constraint failed'))).toBe(true);
    expect(isForeignKeyError(new Error('UNIQUE constraint failed: tags.name'))).toBe(false);
    expect(isForeignKeyError(new Error('other error'))).toBe(false);
    expect(isForeignKeyError('not an error')).toBe(false);
    expect(isForeignKeyError(undefined)).toBe(false);
  });
});
