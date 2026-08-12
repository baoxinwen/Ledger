// 导入导出路由：处理文件上传、标准 JSON 导入和账本数据导出。
import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { billImportService, FileImportSource } from '../services/billImport.service';
import { ImportableTransaction } from '../types';
import { logger } from '../utils/logger';
import { buildLedgerCsv } from '../utils/csv';

const router = Router();

// 导入导出路由既服务浏览器下载，也承担文件上传入口；这里的日志会直接进入 Docker stdout。
router.get('/export', (req: Request, res: Response) => {
  const format = (req.query.format as 'json' | 'csv') || 'json';

  // 导出走完整备份语义，不分页，避免超过默认 limit 时静默截断。
  const data = transactionService.getAllForExport();

  if (format === 'csv') {
    const content = buildLedgerCsv(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.csv');
    res.send(content);
  } else {
    const exportData = {
      transactions: data.map(t => ({
        date: t.date,
        type: t.type,
        category: t.category.name,
        amount: t.amount,
        tags: t.tags.map(tag => tag.name),
        note: t.note,
        source: t.source,
        source_transaction_id: t.source_transaction_id,
        source_merchant_order_id: t.source_merchant_order_id,
        source_category: t.source_category,
        source_time: t.source_time,
        payment_method: t.payment_method,
        source_status: t.source_status,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.json');
    res.json(exportData);
  }
});

router.post('/import/file', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    const upload = await parseMultipartRequest(req);
    if (!upload.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const source = normalizeSource(upload.fields.source);
    logImportEvent('账单文件导入开始', {
      filename: upload.file.filename,
      requestedSource: upload.fields.source || 'auto',
      normalizedSource: source,
      contentType: upload.file.contentType,
      size: upload.file.buffer.length,
    });
    const result = billImportService.importFile(upload.file.buffer, upload.file.filename, source);
    logImportEvent('账单文件导入完成', {
      filename: upload.file.filename,
      source,
      durationMs: Date.now() - startedAt,
      result,
    });
    res.json(result);
  } catch (error) {
    logImportEvent('账单文件导入失败', {
      durationMs: Date.now() - startedAt,
      error: (error as Error).message,
    }, 'error');
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/import', (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Invalid import data' });
  }

  logImportEvent('标准交易导入开始', {
    count: transactions.length,
  });
  const result = billImportService.importTransactions(transactions as ImportableTransaction[]);
  logImportEvent('标准交易导入完成', {
    durationMs: Date.now() - startedAt,
    result,
  });
  res.json(result);
});

interface UploadedFile {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

interface MultipartUpload {
  fields: Record<string, string>;
  file?: UploadedFile;
}

async function parseMultipartRequest(req: Request): Promise<MultipartUpload> {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    throw new Error('Multipart boundary not found');
  }

  const body = await readRequestBody(req);
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`, 'utf8');
  const upload: MultipartUpload = { fields: {} };
  let cursor = body.indexOf(boundary);

  while (cursor !== -1) {
    const partStart = cursor + boundary.length;
    if (body.subarray(partStart, partStart + 2).toString('utf8') === '--') break;

    let contentStart = partStart;
    if (body.subarray(contentStart, contentStart + 2).toString('utf8') === '\r\n') {
      contentStart += 2;
    }

    const nextBoundary = body.indexOf(boundary, contentStart);
    if (nextBoundary === -1) break;

    const part = body.subarray(contentStart, Math.max(contentStart, nextBoundary - 2));
    const separator = part.indexOf(Buffer.from('\r\n\r\n', 'utf8'));
    if (separator !== -1) {
      const rawHeaders = part.subarray(0, separator).toString('utf8');
      const content = part.subarray(separator + 4);
      const disposition = parseContentDisposition(rawHeaders);
      const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders);

      if (disposition.name === 'file' && disposition.filename) {
        upload.file = {
          filename: disposition.filename,
          contentType: contentTypeMatch?.[1]?.trim() || 'application/octet-stream',
          buffer: content,
        };
      } else if (disposition.name) {
        upload.fields[disposition.name] = content.toString('utf8').trim();
      }
    }

    cursor = nextBoundary;
  }

  return upload;
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 账单上传文件上限 50MB

// 流式收集请求体并限制总大小，防止超大上传耗尽内存。
function readRequestBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_UPLOAD_BYTES) {
        reject(new Error(`上传文件过大，最大支持 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseContentDisposition(headers: string): { name?: string; filename?: string } {
  const disposition = /content-disposition:[^\r\n]+/i.exec(headers)?.[0] || '';
  return {
    name: /name="([^"]+)"/i.exec(disposition)?.[1],
    filename: /filename="([^"]*)"/i.exec(disposition)?.[1],
  };
}

function normalizeSource(value: string | undefined): FileImportSource {
  if (value === 'standard' || value === 'alipay' || value === 'wechat' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function logImportEvent(message: string, details: Record<string, unknown>, level: 'info' | 'error' = 'info'): void {
  // 结构化输出：开发环境打印元数据，生产环境 winston 展开为扁平 JSON 字段，便于采集检索。
  const payload = { scope: 'import', ...details };
  if (level === 'error') {
    logger.error(message, payload);
  } else {
    logger.info(message, payload);
  }
}

export default router;
