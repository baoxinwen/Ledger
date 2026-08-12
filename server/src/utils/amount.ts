// 金额工具：统一按“分”四舍五入，避免浮点累加误差外泄（如 0.1+0.2 = 0.30000000000000004）。
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
