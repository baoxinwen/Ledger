jest.mock('../../database', () => ({
  __esModule: true,
  default: require('../setup').default,
}));

const backupServiceMock = {
  listBackups: jest.fn(),
  createSnapshot: jest.fn(),
  getBackupPath: jest.fn(),
  deleteBackup: jest.fn(),
  restoreBackup: jest.fn(),
  restoreFromFile: jest.fn(),
};

jest.mock('../../services/backup.service', () => ({
  backupService: backupServiceMock,
}));

import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import db from '../setup';
import app from '../../app';
import { authService } from '../../services/auth.service';

describe('backup routes', () => {
  let tempDir: string;
  let downloadPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-backup-route-'));
    downloadPath = path.join(tempDir, 'ledger-manual-test.db');
    fs.writeFileSync(downloadPath, 'sqlite backup');
    process.env.SETUP_TOKEN = 'backup-route-token';
    db.exec('DELETE FROM sessions; DELETE FROM users;');
    db.exec("DELETE FROM app_settings WHERE key = 'setup_token_hash'");
  });

  afterEach(() => {
    delete process.env.SETUP_TOKEN;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function setupAgent(): Promise<ReturnType<typeof request.agent>> {
    authService.ensureSetupToken();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({
      token: 'backup-route-token', username: 'admin', password: 'password123',
    });
    return agent;
  }

  it('列出和创建备份时不暴露服务器文件路径', async () => {
    const record = {
      id: 'ledger-manual-test.db', path: downloadPath, type: 'manual',
      formatVersion: 1, schemaVersion: 2, createdAt: '2026-08-18T00:00:00.000Z', size: 1024,
    };
    backupServiceMock.listBackups.mockReturnValue([record]);
    backupServiceMock.createSnapshot.mockResolvedValue(record);
    const agent = await setupAgent();

    const listed = await agent.get('/api/backups');
    const created = await agent.post('/api/backups');

    expect(listed.status).toBe(200);
    expect(listed.body[0]).toEqual(expect.objectContaining({ id: record.id, type: 'manual' }));
    expect(listed.body[0].path).toBeUndefined();
    expect(created.status).toBe(201);
    expect(created.body.path).toBeUndefined();
  });

  it('支持下载和删除备份', async () => {
    backupServiceMock.getBackupPath.mockReturnValue(downloadPath);
    const agent = await setupAgent();

    const downloaded = await agent.get('/api/backups/ledger-manual-test.db/download');
    const deleted = await agent.delete('/api/backups/ledger-manual-test.db');

    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-disposition']).toContain('ledger-manual-test.db');
    expect(deleted.status).toBe(204);
    expect(backupServiceMock.deleteBackup).toHaveBeenCalledWith('ledger-manual-test.db');
  });

  it('按 ID 恢复后清除当前登录 Cookie', async () => {
    backupServiceMock.restoreBackup.mockResolvedValue(undefined);
    const agent = await setupAgent();

    const restored = await agent.post('/api/backups/ledger-manual-test.db/restore');
    const afterRestore = await agent.get('/api/transactions');

    expect(restored.status).toBe(200);
    expect(restored.body).toEqual({ ok: true, requiresLogin: true });
    const cookieHeader = restored.headers['set-cookie'];
    const cookies = Array.isArray(cookieHeader) ? cookieHeader.join(';') : String(cookieHeader ?? '');
    expect(cookies).toContain('ledger_session=;');
    expect(afterRestore.status).toBe(401);
  });

  it('上传恢复使用临时文件并在完成后删除', async () => {
    let receivedPath = '';
    backupServiceMock.restoreFromFile.mockImplementation(async (filename: string) => {
      receivedPath = filename;
      expect(fs.existsSync(filename)).toBe(true);
    });
    const agent = await setupAgent();

    const restored = await agent
      .post('/api/backups/restore')
      .attach('file', Buffer.from('uploaded sqlite'), 'backup.db');

    expect(restored.status).toBe(200);
    expect(backupServiceMock.restoreFromFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(receivedPath)).toBe(false);
  });
});
