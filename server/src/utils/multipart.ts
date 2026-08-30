import Busboy from 'busboy';
import { Request } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export interface UploadedMemoryFile {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export interface MultipartMemoryUpload {
  fields: Record<string, string>;
  file?: UploadedMemoryFile;
}

export interface UploadedTempFile {
  filename: string;
  contentType: string;
  path: string;
}

// Browsers send modern multipart filenames as UTF-8. Older records may already
// contain the same bytes decoded as latin1, so this helper is intentionally
// idempotent for correctly decoded Unicode strings.
export function decodeUploadedFilename(filename: string): string {
  if (!filename || [...filename].some((character) => character.charCodeAt(0) > 0xff)) return filename;
  if (!/[\u0080-\u00ff]/.test(filename)) return filename;
  const decoded = Buffer.from(filename, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? filename : decoded;
}

export function parseMultipartToMemory(req: Request, maxFileBytes: number): Promise<MultipartMemoryUpload> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof Busboy>;
    try {
      parser = Busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { files: 1, fields: 20, fileSize: maxFileBytes } });
    } catch (error) {
      reject(error);
      return;
    }

    const upload: MultipartMemoryUpload = { fields: {} };
    let failure: Error | undefined;
    parser.on('field', (name, value) => { upload.fields[name] = value.trim(); });
    parser.on('file', (name, stream, info) => {
      if (name !== 'file') {
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('limit', () => {
        failure = new Error(`上传文件过大，最大支持 ${Math.floor(maxFileBytes / 1024 / 1024)}MB`);
      });
      stream.on('end', () => {
        if (!failure) {
          upload.file = {
            filename: decodeUploadedFilename(info.filename),
            contentType: info.mimeType || 'application/octet-stream',
            buffer: Buffer.concat(chunks),
          };
        }
      });
    });
    parser.on('error', reject);
    parser.on('close', () => failure ? reject(failure) : resolve(upload));
    req.on('aborted', () => reject(new Error('上传已中止')));
    req.pipe(parser);
  });
}

export function parseMultipartToTempFile(
  req: Request,
  maxFileBytes: number,
  tempDir: string
): Promise<UploadedTempFile> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(tempDir, { recursive: true });
    let parser: ReturnType<typeof Busboy>;
    try {
      parser = Busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { files: 1, fields: 5, fileSize: maxFileBytes } });
    } catch (error) {
      reject(error);
      return;
    }

    let uploaded: UploadedTempFile | undefined;
    let writePromise: Promise<void> | undefined;
    let failure: Error | undefined;
    let settled = false;

    const removeUploadedFile = () => {
      if (uploaded && fs.existsSync(uploaded.path)) fs.rmSync(uploaded.path, { force: true });
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      void (async () => {
        try {
          if (writePromise) await writePromise;
        } catch {
          // The original parser/request error is more useful to callers than a secondary stream error.
        }
        removeUploadedFile();
        reject(error);
      })();
    };

    parser.on('file', (name, stream, info) => {
      if (name !== 'file' || uploaded) {
        stream.resume();
        return;
      }
      const tempPath = path.join(tempDir, `ledger-upload-${crypto.randomUUID()}.tmp`);
      uploaded = { filename: decodeUploadedFilename(info.filename), contentType: info.mimeType || 'application/octet-stream', path: tempPath };
      stream.on('limit', () => {
        failure = new Error(`上传文件过大，最大支持 ${Math.floor(maxFileBytes / 1024 / 1024)}MB`);
      });
      writePromise = pipeline(stream, fs.createWriteStream(tempPath));
    });
    parser.on('error', fail);
    parser.on('close', () => {
      if (settled) return;
      void (async () => {
        try {
          if (writePromise) await writePromise;
          if (failure) throw failure;
          if (!uploaded) throw new Error('请选择备份文件');
          settled = true;
          resolve(uploaded);
        } catch (error) {
          fail(error);
        }
      })();
    });
    req.on('aborted', () => {
      parser.destroy();
      fail(new Error('上传已中止'));
    });
    req.pipe(parser);
  });
}
