// 输入校验工具：路由层统一在此校验请求体/查询参数，非法输入抛 HttpError(400)，
// 避免把 DB 约束异常或 NaN 直接变成 500。
import { HttpError } from './errors';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isTransactionType(value: unknown): value is 'income' | 'expense' {
  return value === 'income' || value === 'expense';
}

export function isBudgetPeriod(value: unknown): value is 'monthly' | 'yearly' {
  return value === 'monthly' || value === 'yearly';
}

// 正整数 ID（路径参数或 body 中的分类/标签/预算 id）。
export function requirePositiveId(value: unknown, name = 'ID'): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${name}无效`);
  }
  return parsed;
}

export function optionalPositiveId(value: unknown, name = 'ID'): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requirePositiveId(value, name);
}

// 非负有限数值（金额）。空字符串/空值按缺失处理（供必填字段校验时报“不能为空”）。
const MAX_AMOUNT = 1e12; // 金额上限，防止极端值让 SUM/JSON 序列化溢出为 null。

export function requireNonNegativeAmount(value: unknown, name = '金额'): number {
  if (value === undefined || value === null || value === '') {
    throw new HttpError(400, `${name}不能为空`);
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new HttpError(400, `${name}必须是数字`);
  }
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HttpError(400, `${name}必须是非负数字`);
  }
  if (parsed > MAX_AMOUNT) {
    throw new HttpError(400, `${name}过大，超出允许范围`);
  }
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new HttpError(400, `${name}最多保留两位小数`);
  }
  return parsed;
}

export function optionalNonNegativeAmount(value: unknown, name = '金额'): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireNonNegativeAmount(value, name);
}

export function requireDate(value: unknown): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new HttpError(400, '日期格式无效，应为 YYYY-MM-DD');
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  // 回读校验年月日，拒绝 2026-02-30、2026-13-01 这类不存在的日期。
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, '日期无效，请检查年月日');
  }
  return value;
}

export function optionalDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireDate(value);
}

export function requireName(value: unknown, name = '名称', maxLength = 64): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${name}不能为空`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${name}长度不能超过 ${maxLength} 个字符`);
  }
  return normalized;
}

export function optionalString(value: unknown, name = '字段', maxLength = 2000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${name}必须是字符串`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, `${name}长度不能超过 ${maxLength} 个字符`);
  }
  return value;
}

export function requireTransactionType(value: unknown): 'income' | 'expense' {
  if (!isTransactionType(value)) {
    throw new HttpError(400, '类型必须是 income 或 expense');
  }
  return value;
}

export function optionalTransactionType(value: unknown): 'income' | 'expense' | undefined {
  if (value === undefined || value === null) return undefined;
  return requireTransactionType(value);
}

export function requireBudgetPeriod(value: unknown): 'monthly' | 'yearly' {
  if (!isBudgetPeriod(value)) {
    throw new HttpError(400, '预算周期必须是 monthly 或 yearly');
  }
  return value;
}

export function optionalBudgetPeriod(value: unknown): 'monthly' | 'yearly' | undefined {
  if (value === undefined || value === null) return undefined;
  return requireBudgetPeriod(value);
}

// 标签 id 列表：可选，但一旦提供必须全是正整数。
// 重复 id 静默去重（transaction_tags 复合主键会让重复触发 UNIQUE 500）；数量设上限防滥用。
export const MAX_TAG_IDS = 50;

export function optionalTagIds(value: unknown): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)
  ) {
    throw new HttpError(400, '标签列表无效');
  }
  const uniqueIds = [...new Set(value)];
  if (uniqueIds.length > MAX_TAG_IDS) {
    throw new HttpError(400, `标签数量不能超过 ${MAX_TAG_IDS} 个`);
  }
  return uniqueIds;
}
