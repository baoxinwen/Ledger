// 金额工具测试：验证按“分”四舍五入修复浮点误差。
import { roundToCents } from '../../utils/amount';

describe('roundToCents', () => {
  it('修复 0.1+0.2 这类浮点误差', () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    expect(roundToCents(0.1 + 0.7)).toBe(0.8);
  });

  it('常规四舍五入到分', () => {
    expect(roundToCents(12.345)).toBe(12.35);
    expect(roundToCents(12.344)).toBe(12.34);
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(100)).toBe(100);
    expect(roundToCents(0)).toBe(0);
  });

  it('负数同样按分四舍五入', () => {
    expect(roundToCents(-0.1 - 0.2)).toBe(-0.3);
    expect(roundToCents(-12.34)).toBe(-12.34);
  });
});
