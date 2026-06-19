import { inflateRawSync } from 'zlib';
import iconv from 'iconv-lite';
import { ImportableTransaction, ImportResult } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';
import { transactionService } from './transaction.service';

type ImportSource = 'standard' | 'alipay' | 'wechat';
export type FileImportSource = ImportSource | 'auto';

interface ParsedFile {
  source: ImportSource;
  transactions: ImportableTransaction[];
  skipped: number;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const SOURCE_LABELS: Record<Exclude<ImportSource, 'standard'>, string> = {
  alipay: '支付宝',
  wechat: '微信',
};

const DEFAULT_CATEGORY = {
  income: { icon: '💰', color: '#2ECC71' },
  expense: { icon: '📦', color: '#BDC3C7' },
} as const;

export class BillImportService {
  importTransactions(transactions: ImportableTransaction[]): ImportResult {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      duplicates: 0,
      createdCategories: 0,
      errors: [],
    };
    const createdCategoryKeys = new Set<string>();

    transactions.forEach((transaction, index) => {
      try {
        if (!isValidTransaction(transaction)) {
          result.failed++;
          result.errors.push(`Row ${index + 1}: Invalid transaction data`);
          return;
        }

        if (
          transaction.source &&
          transaction.source_transaction_id &&
          transactionService.existsBySource(transaction.source, transaction.source_transaction_id)
        ) {
          result.duplicates++;
          return;
        }

        const categoryName = normalizeCategoryName(transaction.category);
        const categoryKey = `${transaction.type}:${categoryName}`;
        let category = categoryService.getByNameAndType(categoryName, transaction.type);
        if (!category) {
          const defaults = DEFAULT_CATEGORY[transaction.type];
          category = categoryService.create({
            name: categoryName,
            type: transaction.type,
            icon: defaults.icon,
            color: defaults.color,
          });
          if (!createdCategoryKeys.has(categoryKey)) {
            result.createdCategories++;
            createdCategoryKeys.add(categoryKey);
          }
        }

        const tagIds = [...new Set(transaction.tags || [])]
          .map((tagName) => tagName.trim())
          .filter(Boolean)
          .map((tagName) => tagService.create(tagName).id);

        transactionService.create({
          type: transaction.type,
          amount: transaction.amount,
          category_id: category.id,
          note: transaction.note || undefined,
          date: transaction.date,
          tag_ids: tagIds,
          source: transaction.source,
          source_transaction_id: transaction.source_transaction_id,
          source_merchant_order_id: transaction.source_merchant_order_id,
          source_category: transaction.source_category,
          source_time: transaction.source_time,
          payment_method: transaction.payment_method,
          source_status: transaction.source_status,
        });

        result.success++;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          result.duplicates++;
          return;
        }
        result.failed++;
        result.errors.push(`Row ${index + 1}: ${(error as Error).message}`);
      }
    });

    return result;
  }

  importFile(buffer: Buffer, filename: string, requestedSource: FileImportSource): ImportResult {
    const parsed = parseImportedFile(buffer, filename, requestedSource);
    const result = this.importTransactions(parsed.transactions);
    result.skipped += parsed.skipped;
    return result;
  }
}

export function parseImportedFile(buffer: Buffer, filename: string, requestedSource: FileImportSource): ParsedFile {
  const lowerName = filename.toLowerCase();
  const utf8Text = buffer.toString('utf8');
  const gb18030Text = iconv.decode(buffer, 'gb18030');
  const source = detectSource(requestedSource, lowerName, utf8Text, gb18030Text);

  if (source === 'alipay') {
    return { source, ...parseAlipayBillWithSkipped(gb18030Text) };
  }
  if (source === 'wechat') {
    return { source, ...parseWechatBillWithSkipped(buffer) };
  }
  if (lowerName.endsWith('.json')) {
    return { source, transactions: parseStandardJson(utf8Text), skipped: 0 };
  }
  if (lowerName.endsWith('.csv')) {
    return { source, transactions: parseStandardCsv(utf8Text), skipped: 0 };
  }

  throw new Error('Unsupported import file format');
}

export function parseAlipayBill(text: string): ImportableTransaction[] {
  return parseAlipayBillWithSkipped(text).transactions;
}

function parseAlipayBillWithSkipped(text: string): { transactions: ImportableTransaction[]; skipped: number } {
  const rows = parseCsvRows(text);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === '交易时间');
  if (headerIndex === -1) {
    throw new Error('Alipay header row not found');
  }

  const header = rows[headerIndex];
  let skipped = 0;
  const transactions = rows.slice(headerIndex + 1).reduce<ImportableTransaction[]>((items, row, index) => {
    if (!row[0]?.trim()) return items;

    const record = rowToRecord(header, row);
    const direction = normalizeValue(record['收/支']);
    const status = normalizeValue(record['交易状态']);

    if (direction !== '收入' && direction !== '支出') {
      skipped++;
      return items;
    }
    if (isClosedOrFailedStatus(status)) {
      skipped++;
      return items;
    }

    const sourceTime = normalizeValue(record['交易时间']);
    const amount = parseAmount(record['金额']);
    const sourceCategory = normalizeValue(record['交易分类']) || '其他';
    const sourceTransactionId = normalizeOrderId(record['交易订单号']);
    const merchantOrderId = normalizeOrderId(record['商家订单号']);
    const counterparty = normalizeDisplayValue(record['交易对方']);
    const item = normalizeDisplayValue(record['商品说明']);
    const remark = normalizeDisplayValue(record['备注']);

    if (!sourceTime || !Number.isFinite(amount)) {
      throw new Error(`Invalid Alipay row ${index + headerIndex + 2}`);
    }

    items.push({
      type: direction === '收入' ? 'income' : 'expense',
      amount,
      category: sourceCategory,
      note: joinNote([counterparty, item, remark]),
      date: sourceTime.substring(0, 10),
      tags: [SOURCE_LABELS.alipay],
      source: 'alipay',
      source_transaction_id: sourceTransactionId || undefined,
      source_merchant_order_id: merchantOrderId || undefined,
      source_category: sourceCategory,
      source_time: sourceTime,
      payment_method: normalizeDisplayValue(record['收/付款方式']) || undefined,
      source_status: status || undefined,
    });

    return items;
  }, []);

  return { transactions, skipped };
}

export function parseWechatBill(buffer: Buffer): ImportableTransaction[] {
  return parseWechatBillWithSkipped(buffer).transactions;
}

function parseWechatBillWithSkipped(buffer: Buffer): { transactions: ImportableTransaction[]; skipped: number } {
  const rows = parseFirstWorksheet(buffer);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === '交易时间');
  if (headerIndex === -1) {
    throw new Error('WeChat header row not found');
  }

  const header = rows[headerIndex];
  let skipped = 0;
  const transactions = rows.slice(headerIndex + 1).reduce<ImportableTransaction[]>((items, row, index) => {
    if (!row[0]?.trim()) return items;

    const record = rowToRecord(header, row);
    const direction = normalizeValue(record['收/支']);
    const status = normalizeValue(record['当前状态']);

    if (direction !== '收入' && direction !== '支出') {
      skipped++;
      return items;
    }
    if (isClosedOrFailedStatus(status)) {
      skipped++;
      return items;
    }

    const sourceTime = normalizeValue(record['交易时间']);
    const amount = parseAmount(record['金额(元)']);
    const sourceCategory = normalizeValue(record['交易类型']) || '其他';
    const sourceTransactionId = normalizeOrderId(record['交易单号']);
    const merchantOrderId = normalizeOrderId(record['商户单号']);
    const counterparty = normalizeDisplayValue(record['交易对方']);
    const item = normalizeDisplayValue(record['商品']);
    const remark = normalizeDisplayValue(record['备注']);

    if (!sourceTime || !Number.isFinite(amount)) {
      throw new Error(`Invalid WeChat row ${index + headerIndex + 2}`);
    }

    items.push({
      type: direction === '收入' ? 'income' : 'expense',
      amount,
      category: sourceCategory,
      note: joinNote([counterparty, item, remark]),
      date: sourceTime.substring(0, 10),
      tags: [SOURCE_LABELS.wechat],
      source: 'wechat',
      source_transaction_id: sourceTransactionId || undefined,
      source_merchant_order_id: merchantOrderId || undefined,
      source_category: sourceCategory,
      source_time: sourceTime,
      payment_method: normalizeDisplayValue(record['支付方式']) || undefined,
      source_status: status || undefined,
    });

    return items;
  }, []);

  return { transactions, skipped };
}

export function parseStandardJson(text: string): ImportableTransaction[] {
  const parsed = JSON.parse(text);
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
  if (!Array.isArray(transactions)) {
    throw new Error('JSON import must be an array or contain transactions array');
  }
  return transactions.map(normalizeStandardTransaction);
}

export function parseStandardCsv(text: string): ImportableTransaction[] {
  const rows = parseCsvRows(text);
  const headerIndex = rows.findIndex((row) => row.includes('日期') && row.includes('类型') && row.includes('分类'));
  if (headerIndex === -1) {
    throw new Error('Standard CSV header row not found');
  }

  const header = rows[headerIndex];
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => normalizeStandardTransaction(rowToRecord(header, row)));
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const normalizedText = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < normalizedText.length; index++) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }

  return rows;
}

function detectSource(
  requestedSource: FileImportSource,
  lowerName: string,
  utf8Text: string,
  gb18030Text: string
): ImportSource {
  if (requestedSource !== 'auto') return requestedSource;
  if (lowerName.endsWith('.xlsx')) return 'wechat';
  if (gb18030Text.includes('支付宝') || gb18030Text.includes('交易分类,交易对方')) return 'alipay';
  if (utf8Text.includes('支付宝') || utf8Text.includes('交易分类,交易对方')) return 'alipay';
  return 'standard';
}

function normalizeStandardTransaction(input: Record<string, unknown>): ImportableTransaction {
  const typeValue = String(input.type ?? input['类型'] ?? '').trim();
  const tagsValue = input.tags ?? input['标签'];
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map(String)
    : String(tagsValue || '').split(/[;；]/).filter(Boolean);

  return {
    type: typeValue === 'income' || typeValue === '收入' ? 'income' : 'expense',
    amount: Number(input.amount ?? input['金额']),
    category: String(input.category ?? input['分类'] ?? '其他').trim(),
    date: String(input.date ?? input['日期'] ?? '').trim(),
    note: String(input.note ?? input['备注'] ?? '').trim() || undefined,
    tags,
    source: normalizeOptionalSource(input.source) || 'standard',
    source_transaction_id: normalizeOptionalString(input.source_transaction_id),
    source_merchant_order_id: normalizeOptionalString(input.source_merchant_order_id),
    source_category: normalizeOptionalString(input.source_category),
    source_time: normalizeOptionalString(input.source_time),
    payment_method: normalizeOptionalString(input.payment_method),
    source_status: normalizeOptionalString(input.source_status),
  };
}

function normalizeOptionalSource(value: unknown): 'standard' | 'alipay' | 'wechat' | undefined {
  return value === 'standard' || value === 'alipay' || value === 'wechat' ? value : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeValue(value);
  return normalized || undefined;
}

function isValidTransaction(transaction: ImportableTransaction): boolean {
  return (
    (transaction.type === 'income' || transaction.type === 'expense') &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    Boolean(transaction.category?.trim()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
  );
}

function normalizeCategoryName(category: string): string {
  return normalizeValue(category) || '其他';
}

function normalizeValue(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeDisplayValue(value: unknown): string {
  const normalized = normalizeValue(value);
  return normalized && normalized !== '/' ? normalized : '';
}

function normalizeOrderId(value: unknown): string {
  return normalizeDisplayValue(value).replace(/\t/g, '').trim();
}

function parseAmount(value: unknown): number {
  const normalized = normalizeValue(value).replace(/[¥￥,\s]/g, '');
  return Number(normalized);
}

function joinNote(parts: string[]): string | undefined {
  const note = parts.filter(Boolean).join(' - ');
  return note || undefined;
}

function isClosedOrFailedStatus(status: string): boolean {
  return /关闭|失败|取消/.test(status);
}

function rowToRecord(header: string[], row: string[]): Record<string, string> {
  return header.reduce<Record<string, string>>((record, key, index) => {
    const normalizedKey = key.trim();
    if (normalizedKey) record[normalizedKey] = row[index] ?? '';
    return record;
  }, {});
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE|constraint/i.test(error.message);
}

function parseFirstWorksheet(buffer: Buffer): string[][] {
  const files = extractZipFiles(buffer);
  const sharedStrings = parseSharedStrings(files.get('xl/sharedStrings.xml')?.toString('utf8') || '');
  const sheetXml = files.get('xl/worksheets/sheet1.xml')?.toString('utf8');
  if (!sheetXml) {
    throw new Error('XLSX first worksheet not found');
  }

  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = getXmlAttribute(attrs, 'r');
      const type = getXmlAttribute(attrs, 't');
      const columnIndex = ref ? columnNameToIndex(ref.replace(/\d+/g, '')) : cells.length;
      cells[columnIndex] = parseCellValue(body, type, sharedStrings);
    }
    rows.push(cells.map((cell) => cell || ''));
  }

  return rows;
}

function extractZipFiles(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const entries = new Map<string, ZipEntry>();
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  while (cursor < centralDirectoryEnd) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('Invalid XLSX central directory');
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8');

    entries.set(name, { method, compressedSize, localHeaderOffset });
    cursor = nameStart + fileNameLength + extraLength + commentLength;
  }

  entries.forEach((entry, name) => {
    const localOffset = entry.localHeaderOffset;
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid XLSX local file header for ${name}`);
    }
    const fileNameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + fileNameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
    const content = entry.method === 0 ? compressed : inflateRawSync(compressed);
    files.set(name, content);
  });

  return files;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  for (let index = buffer.length - 22; index >= 0; index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      return index;
    }
  }
  throw new Error('Invalid XLSX archive');
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const itemRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const parts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
    strings.push(parts.map((part) => decodeXml(part[1])).join(''));
  }
  return strings;
}

function parseCellValue(body: string, type: string | undefined, sharedStrings: string[]): string {
  if (type === 's') {
    const value = getXmlTagValue(body, 'v');
    return sharedStrings[Number(value)] || '';
  }
  if (type === 'inlineStr') {
    return decodeXml(getXmlTagValue(body, 't'));
  }
  return decodeXml(getXmlTagValue(body, 'v'));
}

function getXmlAttribute(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1];
}

function getXmlTagValue(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1] || '';
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnNameToIndex(columnName: string): number {
  return columnName.split('').reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

export const billImportService = new BillImportService();
