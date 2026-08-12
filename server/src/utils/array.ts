// 数组工具：把数组按固定大小分批，供 IN 子句分批避免超过 SQLite 变量上限。
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
