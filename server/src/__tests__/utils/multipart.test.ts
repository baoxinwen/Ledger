import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { Request } from 'express';
import { parseMultipartToMemory, parseMultipartToTempFile } from '../../utils/multipart';

describe('multipart temporary uploads', () => {
  it('decodes UTF-8 filenames from browser multipart uploads', async () => {
    const boundary = 'ledger-unicode-filename';
    const filename = '微信支付账单.xlsx';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="`, 'utf8'),
      Buffer.from(filename, 'utf8'),
      Buffer.from(`"\r\nContent-Type: application/octet-stream\r\n\r\ntest\r\n--${boundary}--\r\n`, 'utf8'),
    ]);
    const request = Readable.from([body]) as unknown as Request;
    request.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };

    const upload = await parseMultipartToMemory(request, 1024);

    expect(upload.file?.filename).toBe(filename);
  });

  it('removes a partially written file when the multipart body is truncated', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-multipart-test-'));
    const boundary = 'ledger-test-boundary';
    const body = [
      `--${boundary}\r\n`,
      'Content-Disposition: form-data; name="file"; filename="backup.db"\r\n',
      'Content-Type: application/octet-stream\r\n\r\n',
      'partial sqlite data',
    ].join('');
    const request = Readable.from([Buffer.from(body)]) as unknown as Request;
    request.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };

    try {
      await expect(parseMultipartToTempFile(request, 1024, tempDir)).rejects.toThrow('Unexpected end of form');
      await new Promise((resolve) => setImmediate(resolve));
      expect(fs.readdirSync(tempDir)).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
