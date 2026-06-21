// 第三方账单导入服务：解析支付宝 CSV、微信 XLSX 和标准 JSON/CSV，并生成可排查的诊断信息。
import { inflateRawSync } from 'zlib';
import iconv from 'iconv-lite';
import { ImportableTransaction, ImportDiagnostic, ImportResult } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';
import { transactionService } from './transaction.service';

type ImportSource = 'standard' | 'alipay' | 'wechat';
export type FileImportSource = ImportSource | 'auto';

interface ParsedFile {
  source: ImportSource;
  transactions: ImportableTransaction[];
  skipped: number;
  failed: number;
  diagnostics: ImportDiagnostic[];
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
    const result = createEmptyImportResult();
    const createdCategoryKeys = new Set<string>();

    // 标准导入和第三方账单最终都会走这条路径，因此这里集中处理校验、去重、建类和入库。
    transactions.forEach((transaction, index) => {
      try {
        const validationErrors = validateTransaction(transaction);
        if (validationErrors.length > 0) {
          const reason = validationErrors.join('；');
          result.failed++;
          result.errors.push(`Row ${getDiagnosticRow(transaction, index)}: ${reason}`);
          result.diagnostics.push(createTransactionDiagnostic('error', 'failed', reason, transaction, index));
          return;
        }

        if (
          transaction.source &&
          transaction.source_transaction_id &&
          transactionService.existsBySource(transaction.source, transaction.source_transaction_id)
        ) {
          result.duplicates++;
          result.diagnostics.push(createTransactionDiagnostic('info', 'duplicate', '来源订单号已导入，跳过重复记录', transaction, index));
          return;
        }

        const categoryName = normalizeCategoryName(transaction.category);
        const categoryKey = `${transaction.type}:${categoryName}`;
        let category = categoryService.getByNameAndType(categoryName, transaction.type);
        if (!category) {
          // 第三方原始分类不做映射，直接按“类型 + 名称”创建自定义分类，避免误归类。
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
          result.diagnostics.push(createTransactionDiagnostic('info', 'duplicate', '数据库唯一索引判定为重复记录', transaction, index));
          return;
        }
        const reason = (error as Error).message;
        result.failed++;
        result.errors.push(`Row ${getDiagnosticRow(transaction, index)}: ${reason}`);
        result.diagnostics.push(createTransactionDiagnostic('error', 'failed', reason, transaction, index));
      }
    });

    return result;
  }

  importFile(buffer: Buffer, filename: string, requestedSource: FileImportSource): ImportResult {
    const parsed = parseImportedFile(buffer, filename, requestedSource);
    const result = this.importTransactions(parsed.transactions);
    // 解析阶段已经能判断不计收支、关闭交易、格式错误等，这些诊断要并入最终响应。
    result.skipped += parsed.skipped;
    result.failed += parsed.failed;
    result.errors.push(...parsed.diagnostics.filter((item) => item.outcome === 'failed').map((item) => `Row ${item.row ?? '-'}: ${item.reason}`));
    result.diagnostics.unshift(...parsed.diagnostics);
    return result;
  }
}

export function parseImportedFile(buffer: Buffer, filename: string, requestedSource: FileImportSource): ParsedFile {
  const lowerName = filename.toLowerCase();
  const utf8Text = buffer.toString('utf8');
  const gb18030Text = iconv.decode(buffer, 'gb18030');
  // 支付宝历史 CSV 常见编码是 GB18030；自动识别时同时检查 UTF-8 和 GB18030 文本。
  const source = detectSource(requestedSource, lowerName, utf8Text, gb18030Text);

  if (source === 'alipay') {
    return { source, ...parseAlipayBillWithSkipped(gb18030Text) };
  }
  if (source === 'wechat') {
    return { source, ...parseWechatBillWithSkipped(buffer) };
  }
  if (lowerName.endsWith('.json')) {
    return { source, transactions: parseStandardJson(utf8Text), skipped: 0, failed: 0, diagnostics: [] };
  }
  if (lowerName.endsWith('.csv')) {
    return { source, transactions: parseStandardCsv(utf8Text), skipped: 0, failed: 0, diagnostics: [] };
  }

  throw new Error('Unsupported import file format');
}

export function parseAlipayBill(text: string): ImportableTransaction[] {
  return parseAlipayBillWithSkipped(text).transactions;
}

function parseAlipayBillWithSkipped(text: string): { transactions: ImportableTransaction[]; skipped: number; failed: number; diagnostics: ImportDiagnostic[] } {
  const rows = parseCsvRows(text);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === '交易时间');
  if (headerIndex === -1) {
    throw new Error('Alipay header row not found');
  }

  const header = rows[headerIndex];
  let skipped = 0;
  let failed = 0;
  const diagnostics: ImportDiagnostic[] = [];
  const transactions = rows.slice(headerIndex + 1).reduce<ImportableTransaction[]>((items, row, index) => {
    if (!row[0]?.trim()) return items;

    const rowNumber = index + headerIndex + 2;
    const record = rowToRecord(header, row);
    const direction = normalizeValue(record['收/支']);
    const status = normalizeValue(record['交易状态']);

    // “不计收支”是支付宝自己的中性流水，不能入账，但要留下诊断说明为什么跳过。
    if (direction !== '收入' && direction !== '支出') {
      skipped++;
      diagnostics.push(createRawDiagnostic('info', 'skipped', `收/支为“${direction || '空'}”，不属于收入或支出`, 'alipay', rowNumber, record));
      return items;
    }
    if (isClosedOrFailedStatus(status)) {
      skipped++;
      diagnostics.push(createRawDiagnostic('info', 'skipped', `交易状态为“${status}”，不导入关闭、失败或取消交易`, 'alipay', rowNumber, record));
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
    const paymentMethod = normalizeDisplayValue(record['收/付款方式']);

    const parseErrors = validateParsedRow(sourceTime, amount);
    if (parseErrors.length > 0) {
      failed++;
      diagnostics.push(createRawDiagnostic('error', 'failed', parseErrors.join('；'), 'alipay', rowNumber, record));
      return items;
    }

    items.push({
      type: direction === '收入' ? 'income' : 'expense',
      amount,
      category: sourceCategory,
      // 0 元红包/奖励金抵扣是真实交易事件，但账单没有原价，只能保留 0 元和支付方式。
      note: joinNote([counterparty, item, remark, zeroAmountPaymentNote(amount, paymentMethod)]),
      date: sourceTime.substring(0, 10),
      tags: [SOURCE_LABELS.alipay],
      source: 'alipay',
      source_transaction_id: sourceTransactionId || undefined,
      source_merchant_order_id: merchantOrderId || undefined,
      source_category: sourceCategory,
      source_time: sourceTime,
      payment_method: paymentMethod || undefined,
      source_status: status || undefined,
      import_row: items.length + 1,
      source_row: rowNumber,
      source_raw: record,
    });

    return items;
  }, []);

  return { transactions, skipped, failed, diagnostics };
}

export function parseWechatBill(buffer: Buffer): ImportableTransaction[] {
  return parseWechatBillWithSkipped(buffer).transactions;
}

function parseWechatBillWithSkipped(buffer: Buffer): { transactions: ImportableTransaction[]; skipped: number; failed: number; diagnostics: ImportDiagnostic[] } {
  const rows = parseFirstWorksheet(buffer);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === '交易时间');
  if (headerIndex === -1) {
    throw new Error('WeChat header row not found');
  }

  const header = rows[headerIndex];
  let skipped = 0;
  let failed = 0;
  const diagnostics: ImportDiagnostic[] = [];
  const transactions = rows.slice(headerIndex + 1).reduce<ImportableTransaction[]>((items, row, index) => {
    if (!row[0]?.trim()) return items;

    const rowNumber = index + headerIndex + 2;
    const record = rowToRecord(header, row);
    const direction = normalizeValue(record['收/支']);
    const status = normalizeValue(record['当前状态']);

    // 微信的充值、提现、零钱通等中性流水没有收入/支出方向，按跳过处理并写诊断。
    if (direction !== '收入' && direction !== '支出') {
      skipped++;
      diagnostics.push(createRawDiagnostic('info', 'skipped', `收/支为“${direction || '空'}”，不属于收入或支出`, 'wechat', rowNumber, record));
      return items;
    }
    if (isClosedOrFailedStatus(status)) {
      skipped++;
      diagnostics.push(createRawDiagnostic('info', 'skipped', `当前状态为“${status}”，不导入关闭、失败或取消交易`, 'wechat', rowNumber, record));
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
    const paymentMethod = normalizeDisplayValue(record['支付方式']);

    const parseErrors = validateParsedRow(sourceTime, amount);
    if (parseErrors.length > 0) {
      failed++;
      diagnostics.push(createRawDiagnostic('error', 'failed', parseErrors.join('；'), 'wechat', rowNumber, record));
      return items;
    }

    items.push({
      type: direction === '收入' ? 'income' : 'expense',
      amount,
      category: sourceCategory,
      // 0 元支付同样保留交易事件，支付方式会帮助解释为什么金额为 0。
      note: joinNote([counterparty, item, remark, zeroAmountPaymentNote(amount, paymentMethod)]),
      date: sourceTime.substring(0, 10),
      tags: [SOURCE_LABELS.wechat],
      source: 'wechat',
      source_transaction_id: sourceTransactionId || undefined,
      source_merchant_order_id: merchantOrderId || undefined,
      source_category: sourceCategory,
      source_time: sourceTime,
      payment_method: paymentMethod || undefined,
      source_status: status || undefined,
      import_row: items.length + 1,
      source_row: rowNumber,
      source_raw: record,
    });

    return items;
  }, []);

  return { transactions, skipped, failed, diagnostics };
}

export function parseStandardJson(text: string): ImportableTransaction[] {
  const parsed = JSON.parse(text);
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions;
  if (!Array.isArray(transactions)) {
    throw new Error('JSON import must be an array or contain transactions array');
  }
  return transactions.map((transaction, index) => normalizeStandardTransaction(transaction, index + 1));
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
    .map((row, index) => normalizeStandardTransaction(rowToRecord(header, row), index + 1, index + headerIndex + 2));
}

export function parseCsvRows(text: string): string[][] {
  // 自实现 CSV 解析器是为了避免额外依赖，并正确处理支付宝导出中带引号和换行的字段。
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

function normalizeStandardTransaction(input: Record<string, unknown>, importRow?: number, sourceRow?: number): ImportableTransaction {
  const typeValue = String(input.type ?? input['类型'] ?? '').trim();
  const tagsValue = input.tags ?? input['标签'];
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map(String)
    : String(tagsValue || '').split(/[;；]/).filter(Boolean);

  return {
    type: typeValue === 'income' || typeValue === '收入' ? 'income' : 'expense',
    amount: parseAmount(input.amount ?? input['金额']),
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
    import_row: importRow,
    source_row: sourceRow,
    source_raw: input,
  };
}

function normalizeOptionalSource(value: unknown): 'standard' | 'alipay' | 'wechat' | undefined {
  return value === 'standard' || value === 'alipay' || value === 'wechat' ? value : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeValue(value);
  return normalized || undefined;
}

function createEmptyImportResult(): ImportResult {
  return {
    success: 0,
    failed: 0,
    skipped: 0,
    duplicates: 0,
    createdCategories: 0,
    errors: [],
    diagnostics: [],
  };
}

function validateParsedRow(sourceTime: string, amount: number): string[] {
  const errors: string[] = [];
  if (!sourceTime) errors.push('交易时间为空');
  if (!Number.isFinite(amount)) errors.push('金额无法解析');
  if (Number.isFinite(amount) && amount < 0) errors.push('金额不能为负数');
  return errors;
}

function validateTransaction(transaction: ImportableTransaction): string[] {
  const errors: string[] = [];
  if (transaction.type !== 'income' && transaction.type !== 'expense') {
    errors.push('类型必须是收入或支出');
  }
  if (!Number.isFinite(transaction.amount)) {
    errors.push('金额无法解析');
  } else if (transaction.amount < 0) {
    errors.push('金额不能为负数');
  }
  if (!transaction.category?.trim()) {
    errors.push('分类为空');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    errors.push('日期格式无效，应为 YYYY-MM-DD');
  }
  return errors;
}

function createRawDiagnostic(
  level: ImportDiagnostic['level'],
  outcome: ImportDiagnostic['outcome'],
  reason: string,
  source: ImportSource,
  row: number,
  raw: Record<string, unknown>
): ImportDiagnostic {
  // raw 保留完整原始字段；用户明确选择完整诊断日志，所以这里不做脱敏。
  return {
    level,
    outcome,
    row,
    reason,
    source,
    source_transaction_id: extractRawOrderId(raw, source),
    source_merchant_order_id: extractRawMerchantOrderId(raw, source),
    source_category: String(raw[source === 'wechat' ? '交易类型' : '交易分类'] ?? '').trim() || undefined,
    source_time: String(raw['交易时间'] ?? '').trim() || undefined,
    payment_method: String(raw[source === 'wechat' ? '支付方式' : '收/付款方式'] ?? '').trim() || undefined,
    raw,
  };
}

function createTransactionDiagnostic(
  level: ImportDiagnostic['level'],
  outcome: ImportDiagnostic['outcome'],
  reason: string,
  transaction: ImportableTransaction,
  index: number
): ImportDiagnostic {
  return {
    level,
    outcome,
    row: getDiagnosticRow(transaction, index),
    import_row: transaction.import_row ?? index + 1,
    reason,
    source: transaction.source,
    source_transaction_id: transaction.source_transaction_id,
    source_merchant_order_id: transaction.source_merchant_order_id,
    source_category: transaction.source_category,
    source_time: transaction.source_time,
    payment_method: transaction.payment_method,
    raw: transaction.source_raw ?? {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      note: transaction.note,
      tags: transaction.tags,
    },
  };
}

function getDiagnosticRow(transaction: ImportableTransaction, index: number): number {
  return transaction.source_row ?? transaction.import_row ?? index + 1;
}

function extractRawOrderId(raw: Record<string, unknown>, source: ImportSource): string | undefined {
  const key = source === 'wechat' ? '交易单号' : '交易订单号';
  return normalizeOrderId(raw[key]) || undefined;
}

function extractRawMerchantOrderId(raw: Record<string, unknown>, source: ImportSource): string | undefined {
  const key = source === 'wechat' ? '商户单号' : '商家订单号';
  return normalizeOrderId(raw[key]) || undefined;
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
  // 金额字段可能带 ¥、￥、千分位逗号或空白；空字符串必须保持为 NaN，不能误导入为 0。
  const normalized = normalizeValue(value).replace(/[¥￥,\s]/g, '');
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function joinNote(parts: string[]): string | undefined {
  const note = parts.filter(Boolean).join(' - ');
  return note || undefined;
}

function zeroAmountPaymentNote(amount: number, paymentMethod: string): string {
  return amount === 0 && paymentMethod ? `支付方式: ${paymentMethod}` : '';
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
