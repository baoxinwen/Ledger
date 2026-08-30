import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const E2E_SETUP_TOKEN = 'e2e-setup-token';
const E2E_USERNAME = 'admin';
const E2E_PASSWORD = 'e2e-password';

async function ensureAuthenticated(page: Page): Promise<void> {
  const me = await page.request.get('/api/auth/me');
  const state = await me.json() as { authenticated: boolean; needsSetup: boolean };
  if (state.authenticated) return;

  if (state.needsSetup) {
    const setupResponse = await page.request.post('/api/auth/setup', {
      data: { token: E2E_SETUP_TOKEN, username: E2E_USERNAME, password: E2E_PASSWORD },
    });
    if (setupResponse.ok()) return;
  }

  const loginResponse = await page.request.post('/api/auth/login', {
    data: { username: E2E_USERNAME, password: E2E_PASSWORD },
  });
  expect(loginResponse.ok()).toBeTruthy();
}

function buildAlipayPreviewCsv(): string {
  const header = '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,';
  const readyRows = Array.from({ length: 51 }, (_, index) => (
    `2026-08-18 12:${String(index).padStart(2, '0')}:00,餐饮,测试店铺,/,预览记录${index + 1},支出,${index + 1}.01,余额,交易成功,,,,`
  ));
  return [
    header,
    ...readyRows,
    readyRows[0],
    '2026-08-18 14:00:00,其他,测试店铺,/,中性流水,不计收支,20.00,余额,交易成功,,,,',
    '2026-08-18 15:00:00,餐饮,测试店铺,/,错误金额,支出,not-a-number,余额,交易成功,,,,',
  ].join('\n');
}

test('导入预览支持完整分页、筛选、跨页选择和未选择历史', async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto('/settings');
  await expect(page.getByRole('tab', { name: '数据导入导出' })).toBeVisible();
  await page.getByRole('tab', { name: '数据导入导出' }).click();

  await page.getByLabel('导入类型').click();
  await page.getByRole('option', { name: '支付宝 CSV' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'preview-pagination.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildAlipayPreviewCsv(), 'utf8'),
  });

  const dialog = page.getByRole('dialog', { name: '导入预览' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '总行数 54' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '内容重复 1' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '跳过 1' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '失败 1' })).toBeVisible();
  await expect(dialog.getByText(/已选 51 条/)).toBeVisible();

  await dialog.getByRole('button', { name: '取消筛选选择' }).click();
  await expect(dialog.getByText(/已选 0 条/)).toBeVisible();
  await dialog.getByRole('button', { name: '选择筛选结果' }).click();
  // "总行数"视图未按结果筛选，批量选中会包含 1 条内容重复行：需在独立确认弹窗中二次确认。
  const bulkConfirm = page.getByRole('dialog', { name: '选择结果包含内容重复记录' });
  await expect(bulkConfirm).toBeVisible();
  await bulkConfirm.getByRole('button', { name: '仍要全部选中' }).click();
  await expect(dialog.getByText(/已选 52 条/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Go to page 2' }).click();
  await expect(dialog.getByText('预览记录51')).toBeVisible();

  await dialog.getByRole('button', { name: '内容重复 1' }).click();
  const duplicateCheckbox = dialog.getByRole('checkbox', { name: /选择第/ });
  await expect(duplicateCheckbox).toBeChecked();
  await duplicateCheckbox.click();
  await expect(duplicateCheckbox).not.toBeChecked();
  await expect(dialog.getByText(/已选 51 条/)).toBeVisible();

  await dialog.getByRole('button', { name: '跳过 1' }).click();
  await expect(dialog.getByText(/不属于收入或支出/)).toBeVisible();
  await dialog.getByRole('button', { name: '失败 1' }).click();
  await expect(dialog.getByText(/金额无法解析/)).toBeVisible();

  await dialog.getByRole('button', { name: '确认导入（51 条）' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(/写入 51 · 未选择 1 · 重复 1/)).toBeVisible();
});

test('移动端导入预览使用全屏布局且没有水平溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ensureAuthenticated(page);
  await page.goto('/settings');
  await page.getByRole('tab', { name: '数据导入导出' }).click();
  await page.getByLabel('导入类型').click();
  await page.getByRole('option', { name: '支付宝 CSV' }).click();

  const csv = [
    '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,',
    '2026-08-19 10:00:00,餐饮,移动端店铺,/,移动端预览,支出,18.80,余额,交易成功,mobile-preview-1,,,',
  ].join('\n');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mobile-preview.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });

  const dialog = page.getByRole('dialog', { name: '导入预览' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBe(0);
  expect(box!.y).toBe(0);
  expect(box!.width).toBe(390);
  expect(box!.height).toBe(844);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
});
