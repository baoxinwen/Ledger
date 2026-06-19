import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { billImportService, FileImportSource } from '../services/billImport.service';
import { ImportableTransaction } from '../types';

const router = Router();

router.get('/export', (req: Request, res: Response) => {
  const format = (req.query.format as 'json' | 'csv') || 'json';

  const { data } = transactionService.getAll({ limit: 10000 });

  if (format === 'csv') {
    const header = '日期,类型,分类,金额,标签,备注\n';
    const rows = data.map(t => {
      const tags = t.tags.map(tag => tag.name).join(';');
      return `${t.date},${t.type},${t.category.name},${t.amount},${tags},${t.note || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.csv');
    res.send(header + rows);
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
  try {
    const upload = await parseMultipartRequest(req);
    if (!upload.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const source = normalizeSource(upload.fields.source);
    const result = billImportService.importFile(upload.file.buffer, upload.file.filename, source);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/import', (req: Request, res: Response) => {
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Invalid import data' });
  }

  const result = billImportService.importTransactions(transactions as ImportableTransaction[]);
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

function readRequestBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
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

export default router;
