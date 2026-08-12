// 数组工具测试：分批逻辑，供 IN 子句分批使用。
import { chunkArray } from '../../utils/array';

describe('chunkArray', () => {
  it('按指定大小分块，末块可能更小', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('恰好整除时分块完整', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('空数组返回空数组', () => {
    expect(chunkArray([], 5)).toEqual([]);
  });

  it('块大小大于数组长度时只返回一块', () => {
    expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
  });
});
