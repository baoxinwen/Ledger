// CSV 导出工具：统一处理字段转义与公式注入防护，避免 Excel 打开时执行以 =、+、-、@ 开头的单元格。
import { TransactionWithDetails } from '../types';

// RFC 4180 转义 + 防公式注入：含逗号/引号/换行的字段用双引号包裹并翻倍内部引号；
// 以 =、+、-、@ 开头的单元格加单引号前缀，让 Excel 按文本而非公式解析。
export function escapeCsvCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  // 前导空白后再跟 =+-@ 也会被 Excel 当作公式（Excel 会忽略前导空格），因此先 trim 再判断前缀。
  if (/^[=+\-@]/.test(text.trimStart())) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// 生成账本导出 CSV：BOM + 表头 + 转义后的每一行。BOM 让 Excel 正确识别 UTF-8 中文。
export function buildLedgerCsv(transactions: TransactionWithDetails[]): string {
  const header = '日期,类型,分类,金额,标签,备注\n';
  const rows = transactions
    .map((transaction) => {
      const cells = [
        transaction.date,
        transaction.type,
        transaction.category.name,
        transaction.amount,
        transaction.tags.map((tag) => tag.name).join(';'),
        transaction.note || '',
      ];
      return cells.map(escapeCsvCell).join(',');
    })
    .join('\n');
  return '﻿' + header + rows;
}
