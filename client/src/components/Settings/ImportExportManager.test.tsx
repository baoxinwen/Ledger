// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImportExportManager from './ImportExportManager';
import { importExportApi } from '../../api';
import { useSnackbarStore } from '../../stores/snackbarStore';

vi.mock('../../api', () => ({
  importExportApi: {
    export: vi.fn(),
    previewFile: vi.fn(),
    getPreviewRows: vi.fn(),
    updatePreviewSelection: vi.fn(),
    deletePreview: vi.fn(),
    confirmFile: vi.fn(),
    getHistory: vi.fn(),
    undoImport: vi.fn(),
  },
}));

const emptyHistory = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
const completedBatch = {
  id: 1,
  filename: 'ledger.json',
  source: 'standard',
  status: 'completed' as const,
  totalCount: 2,
  readyCount: 2,
  successCount: 1,
  skippedCount: 0,
  duplicateCount: 1,
  failedCount: 0,
  excludedCount: 1,
  income: 0,
  expense: 12.34,
  diagnostics: [],
  createdAt: '2026-08-18 00:00:00',
  completedAt: '2026-08-18 00:00:00',
  undoneAt: null,
  undoneCount: 0,
};

const readyRow = {
  rowKey: 'ready-key', row: 1, type: 'expense' as const, amount: 12.34, date: '2026-08-18',
  category: '餐饮', note: '午餐', tags: [], outcome: 'ready' as const, selectable: true, selected: true,
};
const duplicateRow = {
  rowKey: 'duplicate-key', row: 2, type: 'expense' as const, amount: 12.34, date: '2026-08-18',
  category: '餐饮', note: '午餐', tags: [], outcome: 'content_duplicate' as const,
  reason: '日期、金额、分类、备注和标签与已有记录相同', selectable: true, selected: false,
};
const selection = { count: 1, income: 0, expense: 12.34 };
const previewData = {
  previewId: 'preview-1',
  expiresAt: '2026-08-18T01:00:00.000Z',
  source: 'standard' as const,
  filename: 'ledger.json',
  counts: { total: 2, ready: 1, hardDuplicates: 0, contentDuplicates: 1, skipped: 0, failed: 0 },
  income: 0,
  expense: 12.34,
  categoryMappings: [{ source: '餐饮', target: '餐饮', type: 'expense' as const, willCreate: true, count: 2 }],
  rows: { items: [readyRow, duplicateRow], total: 2, page: 1, limit: 50, totalPages: 1, selection },
  selection,
  diagnostics: [],
};

describe('ImportExportManager', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    useSnackbarStore.setState({ open: false, message: '', severity: 'info' });
    vi.mocked(importExportApi.getHistory).mockResolvedValue({ data: emptyHistory } as never);
    vi.mocked(importExportApi.deletePreview).mockResolvedValue({ data: undefined } as never);
  });

  it('previews a selected file and confirms with its preview id', async () => {
    const user = userEvent.setup();
    vi.mocked(importExportApi.previewFile).mockResolvedValue({ data: previewData } as never);
    vi.mocked(importExportApi.confirmFile).mockResolvedValue({
      data: { batch: completedBatch, success: 1, hardDuplicates: 0, contentDuplicates: 1 },
    } as never);
    vi.mocked(importExportApi.getHistory)
      .mockResolvedValueOnce({ data: emptyHistory } as never)
      .mockResolvedValueOnce({ data: { ...emptyHistory, items: [completedBatch], total: 1, totalPages: 1 } } as never);

    const { container } = render(<ImportExportManager onImportComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['{"transactions":[]}'], 'ledger.json', { type: 'application/json' }));

    expect(await screen.findByText('导入预览')).toBeInTheDocument();
    expect(screen.getByText(/已选 1 条/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确认导入/ }));

    await waitFor(() => expect(importExportApi.confirmFile).toHaveBeenCalledWith(
      expect.any(File), 'auto', 'preview-1'
    ));
    expect(await screen.findByText('ledger.json')).toBeInTheDocument();
  });

  it('filters content duplicates and selects one record', async () => {
    const user = userEvent.setup();
    vi.mocked(importExportApi.previewFile).mockResolvedValue({ data: previewData } as never);
    vi.mocked(importExportApi.getPreviewRows).mockResolvedValue({ data: {
      items: [duplicateRow], total: 1, page: 1, limit: 50, totalPages: 1, selection,
    } } as never);
    vi.mocked(importExportApi.updatePreviewSelection).mockResolvedValue({
      data: { count: 2, income: 0, expense: 24.68 },
    } as never);

    const { container } = render(<ImportExportManager onImportComplete={vi.fn()} />);
    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['{}'], 'ledger.json', { type: 'application/json' })
    );
    await user.click(await screen.findByRole('button', { name: '内容重复 1' }));

    await waitFor(() => expect(importExportApi.getPreviewRows).toHaveBeenCalledWith(
      'preview-1', { outcome: 'content_duplicate', type: undefined, page: 1, limit: 50 }
    ));
    await user.click(screen.getByRole('checkbox', { name: '选择第 2 行' }));
    await waitFor(() => expect(importExportApi.updatePreviewSelection).toHaveBeenCalledWith(
      'preview-1', { action: 'select', rowKeys: ['duplicate-key'] }
    ));
    expect(screen.getByText(/已选 2 条/)).toBeInTheDocument();
  });

  it('keeps rendering when the preview response only includes nested selection data', async () => {
    const user = userEvent.setup();
    const legacyPreview = { ...previewData, selection: undefined };
    vi.mocked(importExportApi.previewFile).mockResolvedValue({ data: legacyPreview } as never);

    const { container } = render(<ImportExportManager onImportComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['{}'], 'legacy.json', { type: 'application/json' }));

    expect(await screen.findByText(/已选 1 条/)).toBeInTheDocument();
  });

  it('applies bulk selection to every record matching the current filter', async () => {
    const user = userEvent.setup();
    vi.mocked(importExportApi.previewFile).mockResolvedValue({ data: previewData } as never);
    vi.mocked(importExportApi.getPreviewRows).mockResolvedValue({ data: {
      items: [duplicateRow], total: 1, page: 1, limit: 50, totalPages: 1, selection,
    } } as never);
    vi.mocked(importExportApi.updatePreviewSelection).mockResolvedValue({
      data: { count: 2, income: 0, expense: 24.68 },
    } as never);

    const { container } = render(<ImportExportManager onImportComplete={vi.fn()} />);
    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['{}'], 'ledger.json', { type: 'application/json' })
    );
    await user.click(await screen.findByRole('button', { name: '内容重复 1' }));
    await user.click(await screen.findByRole('button', { name: '选择筛选结果' }));

    await waitFor(() => expect(importExportApi.updatePreviewSelection).toHaveBeenCalledWith(
      'preview-1', { action: 'select', filter: { outcome: 'content_duplicate', type: undefined } }
    ));
  });

  it('closes an expired preview and explains how to continue', async () => {
    const user = userEvent.setup();
    vi.mocked(importExportApi.previewFile).mockResolvedValue({ data: previewData } as never);
    vi.mocked(importExportApi.getPreviewRows).mockRejectedValue({
      response: { status: 410, data: { error: '导入预览已过期，请重新选择文件预览' } },
    });

    const { container } = render(<ImportExportManager onImportComplete={vi.fn()} />);
    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['{}'], 'ledger.json', { type: 'application/json' })
    );
    await user.click(await screen.findByRole('button', { name: '内容重复 1' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useSnackbarStore.getState().message).toBe('导入预览已过期，请重新选择文件预览');
  });

  it('shows excluded records in import history and undoes a completed batch', async () => {
    const user = userEvent.setup();
    vi.mocked(importExportApi.getHistory).mockResolvedValue({
      data: { ...emptyHistory, items: [completedBatch], total: 1, totalPages: 1 },
    } as never);
    vi.mocked(importExportApi.undoImport).mockResolvedValue({ data: {
      batch: { ...completedBatch, status: 'undone', undoneCount: 1 },
      undoneCount: 1,
    } } as never);

    render(<ImportExportManager onImportComplete={vi.fn()} />);
    expect((await screen.findAllByText(/未选择 1/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '撤销导入' }));
    await user.click(screen.getByRole('button', { name: '确认撤销' }));

    await waitFor(() => expect(importExportApi.undoImport).toHaveBeenCalledWith(1));
  });
});
