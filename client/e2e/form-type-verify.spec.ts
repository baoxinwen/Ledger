import { test, expect, Page } from '@playwright/test';

const E2E_SETUP_TOKEN = 'e2e-setup-token';

async function ensureAuthenticated(page: Page): Promise<void> {
  const me = (await (await page.request.get('/api/auth/me')).json()) as {
    authenticated: boolean;
    needsSetup: boolean;
  };
  if (me.needsSetup) {
    await page.request.post('/api/auth/setup', {
      data: { token: E2E_SETUP_TOKEN, username: 'admin', password: 'e2e-password' },
    });
  } else if (!me.authenticated) {
    await page.request.post('/api/auth/login', {
      data: { username: 'admin', password: 'e2e-password' },
    });
  }
}

test('M-2 验证：切换收支类型后已选分类被重置，避免类型错配', async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '新增记录' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // 填金额 + 选一个支出分类（默认支出类型）；MUI Select 选项渲染在 body 的 portal 中。
  await dialog.getByRole('spinbutton', { name: '金额' }).fill('100');
  await dialog.getByRole('combobox', { name: '分类' }).click();
  await page.getByRole('option', { name: /餐饮/ }).click();

  const submit = dialog.getByRole('button', { name: '添加' });
  await expect(submit).toBeEnabled();

  // 切到收入：分类应被清空 → 提交按钮禁用（修复前仍可用，会提交类型错配）
  await dialog.getByRole('button', { name: '收入' }).click();
  await expect(submit).toBeDisabled();
});
