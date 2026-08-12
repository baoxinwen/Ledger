// 密码/令牌哈希工具测试：验证 scrypt 往返、salt 唯一性、畸形输入与常数时间比较。
import { hashPassword, verifyPassword, sha256, timingSafeEqualHex } from '../../utils/password';

describe('password utils', () => {
  it('hashPassword 后 verifyPassword 往返一致，错误密码不通过', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
  });

  it('同一密码两次哈希使用不同 salt，结果不同', () => {
    const first = hashPassword('password');
    const second = hashPassword('password');
    expect(first).not.toBe(second);
  });

  it('verifyPassword 拒绝畸形 stored hash', () => {
    expect(verifyPassword('password', '')).toBe(false);
    expect(verifyPassword('password', 'no-colon-here')).toBe(false);
    expect(verifyPassword('password', 'salt-only:')).toBe(false);
    // 非十六进制哈希：修复前空缓冲会让 timingSafeEqual 恒真。
    expect(verifyPassword('password', 'salt:zzzz')).toBe(false);
  });

  it('sha256 输出 64 位十六进制且确定', () => {
    expect(sha256('abc')).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256('abc')).toBe(sha256('abc'));
  });

  it('timingSafeEqualHex 长度不同直接判否不抛错，相同返回 true', () => {
    expect(timingSafeEqualHex('abc', 'abcdef')).toBe(false);
    expect(timingSafeEqualHex('a'.repeat(64), 'a'.repeat(64))).toBe(true);
    expect(timingSafeEqualHex('a'.repeat(64), 'b'.repeat(64))).toBe(false);
  });
});
