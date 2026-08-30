// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BackupRestoreManager from './BackupRestoreManager';
import { backupApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../api', () => ({
  http: { interceptors: { response: { use: vi.fn() } } },
  authApi: {},
  backupApi: {
    list: vi.fn(),
    create: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn(),
    restoreUpload: vi.fn(),
  },
}));

const backup = {
  id: 'ledger-manual-20260818.db',
  type: 'manual' as const,
  formatVersion: 1,
  schemaVersion: 2,
  createdAt: '2026-08-18T05:00:00.000Z',
  size: 4096,
};

describe('BackupRestoreManager', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: 'authed', user: { username: 'admin' } });
    vi.mocked(backupApi.list).mockResolvedValue({ data: [backup] } as never);
    vi.mocked(backupApi.create).mockResolvedValue({ data: backup } as never);
    vi.mocked(backupApi.delete).mockResolvedValue({ data: undefined } as never);
    vi.mocked(backupApi.restore).mockResolvedValue({ data: { ok: true, requiresLogin: true } } as never);
    vi.mocked(backupApi.restoreUpload).mockResolvedValue({ data: { ok: true, requiresLogin: true } } as never);
  });

  it('提示备份敏感性并支持创建后刷新列表', async () => {
    const user = userEvent.setup();
    render(<BackupRestoreManager />);

    expect(await screen.findByText(/包含账户凭据哈希和全部账本数据/)).toBeInTheDocument();
    expect(screen.getByText('手动备份')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '创建备份' }));

    await waitFor(() => expect(backupApi.create).toHaveBeenCalledTimes(1));
    expect(backupApi.list).toHaveBeenCalledTimes(2);
  });

  it('列表恢复需要输入备份名强确认，成功后立即退出前端登录态', async () => {
    const user = userEvent.setup();
    render(<BackupRestoreManager />);

    await user.click(await screen.findByRole('button', { name: '恢复此备份' }));
    expect(screen.getByText(/当前数据将被替换/)).toBeInTheDocument();

    // 强确认：未输入备份文件名前确认按钮禁用
    const confirmButton = screen.getByRole('button', { name: '确认恢复' });
    expect(confirmButton).toBeDisabled();
    await user.type(screen.getByLabelText(/以确认/), backup.id);
    await user.click(confirmButton);

    await waitFor(() => expect(backupApi.restore).toHaveBeenCalledWith(backup.id));
    expect(useAuthStore.getState().status).toBe('login');
  });

  it('上传文件先确认再恢复，并支持确认删除列表快照', async () => {
    const user = userEvent.setup();
    const { container } = render(<BackupRestoreManager />);
    await screen.findByText('手动备份');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['sqlite'], 'ledger-backup.db', { type: 'application/octet-stream' });
    await user.upload(input, file);
    expect(backupApi.restoreUpload).not.toHaveBeenCalled();
    // 强确认：需要输入上传的文件名
    await user.type(screen.getByLabelText(/以确认/), 'ledger-backup.db');
    await user.click(screen.getByRole('button', { name: '确认恢复' }));
    await waitFor(() => expect(backupApi.restoreUpload).toHaveBeenCalledWith(file));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '恢复完整备份' })).not.toBeInTheDocument());

    useAuthStore.setState({ status: 'authed', user: { username: 'admin' } });
    await user.click(screen.getByRole('button', { name: '删除备份' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    await waitFor(() => expect(backupApi.delete).toHaveBeenCalledWith(backup.id));
  });
});
