jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

import db from '../setup';
import iconv from 'iconv-lite';
import { billImportService, parseAlipayBill, parseWechatBill } from '../../services/billImport.service';

describe('BillImportService', () => {
  beforeEach(() => {
    db.exec('DELETE FROM transaction_tags');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM categories');
  });

  it('imports Alipay cashflow rows, creates categories, skips neutral and closed rows, and deduplicates', () => {
    const csv = [
      '导出信息：',
      '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,',
      '2018-12-31 17:16:48,餐饮美食,全椒县半城奶茶店,/,奶茶,支出,9.68,花呗&红包,交易成功,2018123122001417190556296465	,7895254863102426	,,',
      '2018-12-31 14:13:34,收入,**霞,136******95,商品,收入,305.00,,交易成功,2018123122001435710556446856	,15462368149702192735710	,,',
      '2018-12-30 16:13:29,服饰装扮,店铺,/,退款,不计收支,97.05,余额,退款成功,skip1,skip1,,',
      '2018-12-30 12:16:26,服饰装扮,店铺,/,订单,支出,99.00,银行卡,交易关闭,skip2,skip2,,',
    ].join('\n');

    const parsed = parseAlipayBill(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].source).toBe('alipay');
    expect(parsed[0].source_transaction_id).toBe('2018123122001417190556296465');

    const alipayBuffer = iconv.encode(csv, 'gb18030');
    const firstImport = billImportService.importFile(alipayBuffer, 'alipay.csv', 'alipay');
    expect(firstImport).toMatchObject({
      success: 2,
      skipped: 2,
      duplicates: 0,
      failed: 0,
      createdCategories: 2,
    });

    const secondImport = billImportService.importFile(alipayBuffer, 'alipay.csv', 'alipay');
    expect(secondImport).toMatchObject({
      success: 0,
      skipped: 2,
      duplicates: 2,
      failed: 0,
      createdCategories: 0,
    });

    const transactions = db.prepare('SELECT * FROM transactions ORDER BY amount').all() as any[];
    expect(transactions).toHaveLength(2);
    expect(transactions[0].source_category).toBe('餐饮美食');
    expect(transactions[0].payment_method).toBe('花呗&红包');
    expect(db.prepare('SELECT * FROM categories WHERE name = ? AND type = ?').get('餐饮美食', 'expense')).toBeDefined();
    expect(db.prepare('SELECT * FROM tags WHERE name = ?').get('支付宝')).toBeDefined();
  });

  it('imports WeChat XLSX rows with currency symbols and skips neutral rows', () => {
    const workbook = createMinimalXlsx([
      ['微信支付账单明细'],
      ['----------------------微信支付账单明细列表--------------------'],
      ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)', '支付方式', '当前状态', '交易单号', '商户单号', '备注'],
      ['2025-07-01 21:48:38', '转账', '朋友', '转账备注:微信转账', '收入', '¥6.66', '/', '已存入零钱', 'wx-income-1', '/', '/'],
      ['2025-07-01 20:25:31', '商户消费', '智行物联', '充电费用', '支出', '¥1.00', '零钱', '支付成功', 'wx-expense-1', 'merchant-1', '/'],
      ['2025-06-01 09:00:00', '零钱充值', '/', '/', '/', '¥5000.00', '银行卡', '充值成功', 'neutral-1', '/', '/'],
    ]);

    const parsed = parseWechatBill(workbook);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].amount).toBe(6.66);
    expect(parsed[1].category).toBe('商户消费');

    const result = billImportService.importFile(workbook, 'wechat.xlsx', 'wechat');
    expect(result).toMatchObject({
      success: 2,
      skipped: 1,
      duplicates: 0,
      failed: 0,
      createdCategories: 2,
    });

    const duplicateResult = billImportService.importFile(workbook, 'wechat.xlsx', 'wechat');
    expect(duplicateResult.duplicates).toBe(2);
    expect(duplicateResult.success).toBe(0);
    expect(db.prepare('SELECT * FROM tags WHERE name = ?').get('微信')).toBeDefined();
  });
});

function createMinimalXlsx(rows: string[][]): Buffer {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  return createZip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  });
}

function createZip(files: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  });

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function columnName(index: number): string {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
