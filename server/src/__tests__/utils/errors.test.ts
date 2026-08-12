// 错误工具测试：HttpError 状态码与 FK 错误识别。
import { HttpError, isForeignKeyError, getErrorMessage } from '../../utils/errors';

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

  it('不依赖 instanceof：跨 realm 的裸对象（带 message）也能识别', () => {
    // 原生模块错误在部分环境不是当前 realm 的 Error 实例，但带 message。
    const crossRealmLike = { message: 'FOREIGN KEY constraint failed' };
    expect(isForeignKeyError(crossRealmLike)).toBe(true);
    expect(isForeignKeyError({ message: 'other' })).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('从 Error、裸对象、字符串提取消息', () => {
    expect(getErrorMessage(new Error('abc'))).toBe('abc');
    expect(getErrorMessage({ message: 'xyz' })).toBe('xyz');
    expect(getErrorMessage('直接字符串')).toBe('直接字符串');
    expect(getErrorMessage(undefined)).toBe('');
    expect(getErrorMessage(null)).toBe('');
    expect(getErrorMessage(42)).toBe('');
  });
});
