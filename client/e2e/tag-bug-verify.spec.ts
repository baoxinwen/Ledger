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

test('H2 验证：逐字输入新标签不创建，回车才创建', async ({ page }) => {
  await ensureAuthenticated(page);
  const uniqueTag = `逐字标签${Date.now()}`;

  await page.goto('/transactions');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '新增记录' }).click();

  const tagInput = page.getByRole('dialog').locator('.MuiAutocomplete-root input');
  await tagInput.click();
  await tagInput.pressSequentially(uniqueTag, { delay: 60 });
  await page.waitForTimeout(800);

  const tagsBeforeEnter = (await (await page.request.get('/api/tags')).json()) as { name: string }[];
  const partialHits = tagsBeforeEnter.filter(
    (t) => uniqueTag.startsWith(t.name) && t.name !== uniqueTag
  );
  // 逐字输入期间不应产生任何中间态标签
  expect(partialHits).toHaveLength(0);

  await tagInput.press('Enter');
  await page.waitForTimeout(800);

  const tagsAfterEnter = (await (await page.request.get('/api/tags')).json()) as { name: string }[];
  // 回车后才出现完整标签
  expect(tagsAfterEnter.some((t) => t.name === uniqueTag)).toBe(true);

  // 清理：删掉这次验证创建的标签，避免污染后续用例
  const created = tagsAfterEnter.find((t) => t.name === uniqueTag);
  if (created) {
    const id = (await (await page.request.get('/api/tags')).json()) as { id: number; name: string }[];
    const full = id.find((t) => t.name === uniqueTag);
    if (full) await page.request.delete(`/api/tags/${full.id}`);
  }
});
