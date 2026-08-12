// CSV 导出工具测试：验证公式注入防护和 RFC 4180 字段转义，确保 Excel 打开时按文本而非公式解析。
import { escapeCsvCell, buildLedgerCsv } from '../../utils/csv';

describe('escapeCsvCell', () => {
  it('给以 =、+、-、@ 开头的单元格加单引号前缀，防止公式注入', () => {
    expect(escapeCsvCell('=1+1')).toBe(`'=1+1`);
    expect(escapeCsvCell('+1+2')).toBe(`'+1+2`);
    expect(escapeCsvCell('@sum')).toBe(`'@sum`);
    expect(escapeCsvCell('-5')).toBe(`'-5`);
    // 前导空白后再跟 = 也会被 Excel 当作公式，同样加前缀。
    expect(escapeCsvCell('  =cmd')).toBe(`'  =cmd`);
  });

  it('含引号的注入内容既加前缀又被正确引用转义', () => {
    // 开头为 = 且有引号：前缀 + 双引号包裹 + 内部引号翻倍。
    expect(escapeCsvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });

  it('普通文本与数值不受影响', () => {
    expect(escapeCsvCell('餐饮')).toBe('餐饮');
    expect(escapeCsvCell(12.5)).toBe('12.5');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('含逗号、引号或换行的字段用双引号包裹，内部引号翻倍', () => {
    expect(escapeCsvCell('备注,含逗号')).toBe('"备注,含逗号"');
    expect(escapeCsvCell('有"引号"')).toBe('"有""引号"""');
    expect(escapeCsvCell('第一行\n第二行')).toBe('"第一行\n第二行"');
  });
});

describe('buildLedgerCsv', () => {
  it('对含注入内容与特殊字符的记录生成结构正确的 CSV', () => {
    const transactions = [
      {
        date: '2026-08-01',
        type: 'expense',
        category: { name: '餐饮' },
        amount: 12.5,
        tags: [{ name: '午餐' }],
        note: '=HYPERLINK("http://evil.example","点我")',
      },
      {
        date: '2026-08-02',
        type: 'income',
        category: { name: '工资' },
        amount: 5000,
        tags: [],
        note: '备注,含逗号;还有"引号"和\n换行',
      },
    ] as any;

    const csv = buildLedgerCsv(transactions);
    // 含换行的字段被合法地引用包裹（内部换行属于单元格内容），因此直接断言完整输出；开头含 UTF-8 BOM。
    expect(csv).toBe(
      '﻿日期,类型,分类,金额,标签,备注\n' +
        '2026-08-01,expense,餐饮,12.5,午餐,"\'=HYPERLINK(""http://evil.example"",""点我"")"\n' +
        '2026-08-02,income,工资,5000,,"备注,含逗号;还有""引号""和\n换行"'
    );
  });
});
