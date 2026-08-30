// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import TransactionsPage from './TransactionsPage';
import { transactionApi } from '../api';

const transaction = {
  id: 7,
  type: 'expense' as const,
  amount: 12.34,
  category_id: 1,
  note: '午餐',
  date: '2026-08-18',
  source: 'alipay',
  source_transaction_id: 'trade-7',
  source_merchant_order_id: 'merchant-7',
  source_category: '餐饮美食',
  source_time: '2026-08-18 12:00:00',
  payment_method: '余额',
  source_status: '交易成功',
  import_batch_id: 3,
  created_at: '2026-08-18 12:01:00',
  updated_at: '2026-08-18 12:02:00',
  category: { id: 1, name: '餐饮', type: 'expense' as const, icon: 'F', color: '#8A5A61', is_preset: 1, sort_order: 0 },
  tags: [{ id: 1, name: '工作日' }],
};

const detail = {
  ...transaction,
  importBatch: {
    id: 3,
    filename: 'alipay.csv',
    source: 'alipay',
    status: 'completed' as const,
    createdAt: '2026-08-18 12:00:00',
    completedAt: '2026-08-18 12:00:01',
    undoneAt: null,
  },
};

const fetchTransactions = vi.fn().mockResolvedValue(undefined);

vi.mock('../stores/transactionStore', () => ({
  useTransactionStore: () => ({
    transactions: [transaction], total: 1, filter: { page: 1, limit: 20 },
    fetchTransactions, setFilter: vi.fn(),
  }),
}));
vi.mock('../stores/categoryStore', () => ({
  useCategoryStore: () => ({ categories: [transaction.category], fetchCategories: vi.fn() }),
}));
vi.mock('../stores/tagStore', () => ({
  useTagStore: () => ({ tags: transaction.tags, fetchTags: vi.fn(), createTag: vi.fn() }),
}));
vi.mock('../stores/snackbarStore', () => ({
  useSnackbarStore: () => ({ showSnackbar: vi.fn() }),
}));
vi.mock('../stores/formMemoryStore', () => ({
  useFormMemoryStore: () => ({
    transactionForm: { type: 'expense', category_id: 1, date: '2026-08-18' }, setTransactionForm: vi.fn(),
  }),
}));
vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: { settings: { time_zone: string } }) => unknown) => selector({ settings: { time_zone: 'Asia/Shanghai' } }),
}));
vi.mock('../api', () => ({
  transactionApi: {
    getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
}));

describe('TransactionsPage detail route', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transactionApi.getById).mockResolvedValue({ data: detail } as never);
  });

  it('从列表打开详情，返回保留列表状态，浏览器前进可重新打开', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/transactions/:id', element: <TransactionsPage /> },
    ], { initialEntries: ['/transactions'] });
    render(<RouterProvider router={router} />);

    await user.click(await screen.findByText('午餐'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/transactions/7'));
    expect(await screen.findByText('交易详情')).toBeInTheDocument();
    expect(screen.getByText('trade-7')).toBeInTheDocument();
    expect(screen.getByText('alipay.csv')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭交易详情' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/transactions'));

    await router.navigate(1);
    await waitFor(() => expect(router.state.location.pathname).toBe('/transactions/7'));
    expect(await screen.findByText('交易详情')).toBeInTheDocument();
  });
});
