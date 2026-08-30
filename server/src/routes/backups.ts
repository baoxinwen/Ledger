import fs from 'fs';
import { HttpError } from '../utils/errors';
import os from 'os';
import path from 'path';
import { Request, Response, Router } from 'express';
import { backupService, BackupRecord } from '../services/backup.service';
import { clearSessionCookie } from './auth';
import { parseMultipartToTempFile } from '../utils/multipart';

const router = Router();
const MAX_BACKUP_UPLOAD_BYTES = 1024 * 1024 * 1024;
const BACKUP_UPLOAD_TEMP_DIR = path.join(os.tmpdir(), 'ledger-backup-uploads');

router.get('/', (_req: Request, res: Response) => {
  try {
    // deep=false 跳过逐文件 integrity_check：列表是高频只读操作，同步全量扫描会阻塞事件循环；
    // 完整校验保留在下载/恢复等用户触发路径。
    res.json(backupService.listBackups({ deep: false }).map(toPublicRecord));
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/', async (_req: Request, res: Response) => {
  try {
    res.status(201).json(toPublicRecord(await backupService.createSnapshot('manual')));
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/restore', async (req: Request, res: Response) => {
  let tempPath: string | undefined;
  try {
    const upload = await parseMultipartToTempFile(req, MAX_BACKUP_UPLOAD_BYTES, BACKUP_UPLOAD_TEMP_DIR);
    tempPath = upload.path;
    await backupService.restoreFromFile(upload.path);
    clearSessionCookie(res);
    res.json({ ok: true, requiresLogin: true });
  } catch (error) {
    respondError(res, error);
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
  }
});

router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const id = routeParam(req.params.id);
    const filename = backupService.getBackupPath(id);
    res.download(filename, id);
  } catch (error) {
    respondError(res, error);
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    backupService.deleteBackup(routeParam(req.params.id));
    res.status(204).send();
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    await backupService.restoreBackup(routeParam(req.params.id));
    clearSessionCookie(res);
    res.json({ ok: true, requiresLogin: true });
  } catch (error) {
    respondError(res, error);
  }
});

function toPublicRecord(record: BackupRecord): Omit<BackupRecord, 'path'> {
  const { path: _path, ...publicRecord } = record;
  return publicRecord;
}

function respondError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  // 系统级错误（SQLite/文件系统）按 500 处理且不泄露内部信息；其余（备份损坏、WAL 文件等）
  // 保留可操作的原文案。完整错误已由全局日志/调用方记录。
  if (error instanceof Error && (error.name === 'SqliteError' || typeof (error as NodeJS.ErrnoException).code === 'string')) {
    res.status(500).json({ error: '服务器内部错误' });
    return;
  }
  res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export default router;
