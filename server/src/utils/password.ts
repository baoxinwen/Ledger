// 密码与令牌哈希工具：全部基于 Node 内置 crypto，不额外引入 bcrypt/jsonwebtoken 等加密依赖。
import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

// 返回 `salt:hash` 格式的十六进制字符串，scrypt 作为密码 KDF 可抵御暴力破解。
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

// 常数时间比较，避免通过响应耗时猜测密码是否匹配。
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  // 空/非法的十六进制哈希直接判否，避免空缓冲 timingSafeEqual 恒真。
  if (expected.length === 0) return false;
  const actual = crypto.scryptSync(plain, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// 用于会话令牌与初始化令牌的存储哈希，数据库里不落明文。
export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// 常数时间比较两个十六进制摘要，长度不同时直接判否避免抛错。
export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
