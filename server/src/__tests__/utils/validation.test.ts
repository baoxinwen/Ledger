// 输入校验工具测试：非法输入抛 HttpError(400)，合法输入返回清洗后的值。
import {
  requirePositiveId,
  optionalPositiveId,
  requireNonNegativeAmount,
  requireDate,
  requireName,
  optionalString,
  requireTransactionType,
  optionalTagIds,
} from '../../utils/validation';
import { HttpError } from '../../utils/errors';

describe('validation', () => {
  it('requirePositiveId 接受正整数，拒绝其他输入', () => {
    expect(requirePositiveId(5)).toBe(5);
    expect(requirePositiveId('12')).toBe(12);
    expect(() => requirePositiveId('abc')).toThrow(HttpError);
    expect(() => requirePositiveId(0)).toThrow(HttpError);
    expect(() => requirePositiveId(-3)).toThrow(HttpError);
    expect(() => requirePositiveId(1.5)).toThrow(HttpError);
  });

  it('optionalPositiveId 对空值返回 undefined', () => {
    expect(optionalPositiveId(undefined)).toBeUndefined();
    expect(optionalPositiveId('')).toBeUndefined();
    expect(optionalPositiveId(7)).toBe(7);
    expect(() => optionalPositiveId('x')).toThrow(HttpError);
  });

  it('requireNonNegativeAmount 接受非负有限数，拒绝负数/NaN/空值/超大值', () => {
    expect(requireNonNegativeAmount(0)).toBe(0);
    expect(requireNonNegativeAmount('12.5')).toBe(12.5);
    expect(() => requireNonNegativeAmount(-1)).toThrow(HttpError);
    expect(() => requireNonNegativeAmount(Number.NaN)).toThrow(HttpError);
    expect(() => requireNonNegativeAmount(1e308)).toThrow(HttpError); // 超出合理上限
    expect(() => requireNonNegativeAmount('')).toThrow(HttpError);
    expect(() => requireNonNegativeAmount(undefined)).toThrow(HttpError);
  });

  it('requireDate 接受 YYYY-MM-DD，拒绝其他格式', () => {
    expect(requireDate('2026-08-12')).toBe('2026-08-12');
    expect(() => requireDate('2026-8-1')).toThrow(HttpError);
    expect(() => requireDate('20260812')).toThrow(HttpError);
    expect(() => requireDate(123)).toThrow(HttpError);
  });

  it('requireDate 拒绝不存在的日期（如 2 月 30 日、13 月）', () => {
    expect(() => requireDate('2026-02-30')).toThrow(HttpError);
    expect(() => requireDate('2026-13-01')).toThrow(HttpError);
    expect(() => requireDate('2026-00-15')).toThrow(HttpError);
    expect(requireDate('2026-02-28')).toBe('2026-02-28');
    expect(requireDate('2028-02-29')).toBe('2028-02-29'); // 闰年
  });

  it('requireName/optionalString 限制最大长度', () => {
    expect(() => requireName('x'.repeat(65), '分类名称')).toThrow(HttpError);
    expect(() => optionalString('x'.repeat(2001), '备注')).toThrow(HttpError);
    expect(requireName('正常名称')).toBe('正常名称');
    expect(optionalString('正常备注')).toBe('正常备注');
  });

  it('requireName 去除首尾空白且拒绝空值', () => {
    expect(requireName(' 餐饮 ')).toBe('餐饮');
    expect(() => requireName('')).toThrow(HttpError);
    expect(() => requireName('   ')).toThrow(HttpError);
  });

  it('requireTransactionType 只接受 income/expense', () => {
    expect(requireTransactionType('income')).toBe('income');
    expect(() => requireTransactionType('expenseX')).toThrow(HttpError);
    expect(() => requireTransactionType(undefined)).toThrow(HttpError);
  });

  it('optionalTagIds 校验标签 id 数组', () => {
    expect(optionalTagIds([1, 2])).toEqual([1, 2]);
    expect(optionalTagIds(undefined)).toBeUndefined();
    expect(() => optionalTagIds([1, 0])).toThrow(HttpError);
    expect(() => optionalTagIds('1,2')).toThrow(HttpError);
  });

  it('HttpError 携带状态码', () => {
    const error = new HttpError(400, '无效');
    expect(error.status).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });
});
