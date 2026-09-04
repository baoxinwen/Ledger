// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BudgetFormDialog from './BudgetFormDialog';
import type { Budget, Category } from '../../types';

const category: Category = { id: 5, name: '餐饮', type: 'expense', icon: null, color: null, is_preset: 0, sort_order: 0 };

const budget: Budget = { id: 1, category_id: 5, amount: 100, period: 'monthly', start_date: '2026-09-01' };

afterEach(() => cleanup());

describe('BudgetFormDialog', () => {
  it('编辑预算改回"总预算"必须显式提交 category_id: null（此前 undefined 被 JSON 丢弃，服务端跳过更新）', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_data: { category_id?: number | null; amount: number; period: "monthly" | "yearly"; start_date: string }) => true);
    render(
      <BudgetFormDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        budget={budget}
        categories={[category]}
      />,
    );

    await user.click(screen.getByLabelText(/预算分类/));
    await user.click(screen.getByRole('option', { name: '总预算' }));
    await user.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ category_id: null });
  });

  it('新增预算选择"总预算"仍按缺失提交（由服务端折叠为 null）', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_data: { category_id?: number | null; amount: number; period: "monthly" | "yearly"; start_date: string }) => true);
    render(
      <BudgetFormDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        budget={null}
        categories={[category]}
      />,
    );

    await user.type(screen.getByLabelText(/预算金额/), '200');
    await user.click(screen.getByRole('button', { name: '创建预算' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 200 });
    expect(onSubmit.mock.calls[0][0].category_id).toBeUndefined();
  });
});
