import { test, expect, Page } from '@playwright/test';

const E2E_SETUP_TOKEN = 'e2e-setup-token';
const E2E_USERNAME = 'admin';
const E2E_PASSWORD = 'e2e-password';

// 确保当前浏览器上下文已登录：首次运行用初始化 Token 创建账户，之后用固定凭据登录。
// 并行 worker 下多个用例可能同时初始化，这里通过重试容忍并发竞争。
async function ensureAuthenticated(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const me = (await (await page.request.get('/api/auth/me')).json()) as {
      authenticated: boolean;
      needsSetup: boolean;
    };
    if (me.authenticated) return;

    if (me.needsSetup) {
      const setupResponse = await page.request.post('/api/auth/setup', {
        data: { token: E2E_SETUP_TOKEN, username: E2E_USERNAME, password: E2E_PASSWORD },
      });
      if (setupResponse.ok()) return;
    } else {
      const loginResponse = await page.request.post('/api/auth/login', {
        data: { username: E2E_USERNAME, password: E2E_PASSWORD },
      });
      if (loginResponse.ok()) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('e2e 初始化/登录失败：请确认后端可访问');
}

const EDITORIAL_CATEGORY_COLORS = [
  '#5F6F52',
  '#4F6F6B',
  '#5C6478',
  '#8A5A61',
  '#9A7B4F',
  '#6D597A',
  '#6B7A8F',
  '#7C6F55',
  '#4F5D75',
  '#7A8450',
  '#8B6F71',
  '#5D737E',
  '#A06A4B',
  '#6D8A74',
  '#8B7D63',
  '#536271',
  '#7F5F72',
  '#466A66',
  '#9A8A4E',
  '#6E6658',
  '#59656F',
  '#8A6F47',
  '#6F7D64',
  '#766A8A',
];

test.describe('个人记账本应用', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('首页仪表盘', () => {
    test('应该显示本月概览', async ({ page }) => {
      await expect(page.locator('main').getByText('本月概览')).toBeVisible();
    });

    test('应该显示收入、支出、结余卡片', async ({ page }) => {
      await expect(page.getByText('本月收入')).toBeVisible();
      await expect(page.getByText('本月支出')).toBeVisible();
      await expect(page.getByText('本月结余')).toBeVisible();
    });

    test('首页指标卡不再使用旧高饱和渐变', async ({ page }) => {
      const backgroundImages = await page.locator('[data-testid^="home-"][data-testid$="-card"]').evaluateAll((cards) =>
        cards.map((card) => window.getComputedStyle(card as HTMLElement).backgroundImage)
      );
      expect(backgroundImages.every((backgroundImage) => backgroundImage === 'none')).toBeTruthy();
    });

    test('应该显示最近记录区域', async ({ page }) => {
      await expect(page.getByText('最近记录')).toBeVisible();
    });

    test('应该显示记一笔按钮', async ({ page }) => {
      await expect(page.getByRole('button', { name: '记一笔' })).toBeVisible();
    });

    test('点击记一笔应该跳转到收支记录页面并打开新增弹窗', async ({ page }) => {
      await page.getByRole('button', { name: '记一笔' }).click();
      await expect(page).toHaveURL('/transactions');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: '金额' })).toBeVisible();
    });

    test('点击查看账单应该只跳转到收支记录页面', async ({ page }) => {
      await page.getByRole('button', { name: '查看账单' }).click();
      await expect(page).toHaveURL('/transactions');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('导航功能', () => {
    test('应该显示Logo', async ({ page }) => {
      await expect(page.getByText('Ledger').first()).toBeVisible();
    });

    test('应该能够导航到收支记录页面', async ({ page }) => {
      await page.getByRole('tab', { name: /记账/ }).click();
      await expect(page).toHaveURL('/transactions');
    });

    test('应该能够导航到统计分析页面', async ({ page }) => {
      await page.getByRole('tab', { name: /统计/ }).click();
      await expect(page).toHaveURL('/statistics');
    });

    test('应该能够导航到预算管理页面', async ({ page }) => {
      await page.getByRole('tab', { name: /预算/ }).click();
      await expect(page).toHaveURL('/budgets');
    });

    test('应该能够导航到设置页面', async ({ page }) => {
      await page.getByRole('tab', { name: /设置/ }).click();
      await expect(page).toHaveURL('/settings');
    });

    test('应该能够切换深色模式', async ({ page }) => {
      const themeButton = page.locator('header').locator('button').last();
      await themeButton.click();
    });
  });

  test.describe('收支记录页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');
    });

    test('应该显示页面标题', async ({ page }) => {
      await expect(page.locator('main').getByText('收支记录')).toBeVisible();
    });

    test('应该显示新增记录按钮', async ({ page }) => {
      await expect(page.getByRole('button', { name: '新增记录' })).toBeVisible();
    });

    test('应该显示筛选区域', async ({ page }) => {
      await expect(page.getByText('筛选条件')).toBeVisible();
    });

    test('应该能够打开新增记录对话框', async ({ page }) => {
      await page.getByRole('button', { name: '新增记录' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: '金额' })).toBeVisible();
    });

    test('应该能够新增一笔支出', async ({ page }) => {
      await page.getByRole('button', { name: '新增记录' }).click();
      
      await page.getByRole('spinbutton', { name: '金额' }).fill('100');
      await page.getByRole('combobox', { name: '分类' }).click();
      await page.getByRole('option', { name: /餐饮/ }).click();
      await page.getByRole('textbox', { name: '备注' }).fill('测试支出');
      await page.getByRole('button', { name: '添加' }).click();
      
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('cell', { name: '测试支出' }).first()).toBeVisible();
    });

    test('应该能够新增一笔收入', async ({ page }) => {
      await page.getByRole('button', { name: '新增记录' }).click();
      
      await page.getByRole('button', { name: '收入' }).click();
      await page.getByRole('spinbutton', { name: '金额' }).fill('5000');
      await page.getByRole('combobox', { name: '分类' }).click();
      await page.getByRole('option', { name: /工资/ }).click();
      await page.getByRole('textbox', { name: '备注' }).fill('测试收入');
      await page.getByRole('button', { name: '添加' }).click();
      
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('cell', { name: '测试收入' }).first()).toBeVisible();
    });

    test('删除记录前应该显示应用内确认弹窗', async ({ page }) => {
      await page.route('**/api/transactions**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              data: [{
                id: 999,
                type: 'expense',
                amount: 12.34,
                category_id: 1,
                category: { id: 1, name: '餐饮', type: 'expense', icon: '🍽️', color: '#8A5A61', is_preset: 1, sort_order: 0 },
                note: '待删除测试记录',
                date: '2026-06-23',
                tags: [],
                created_at: '2026-06-23T00:00:00.000Z',
                updated_at: '2026-06-23T00:00:00.000Z',
              }],
              total: 1,
            }),
          });
          return;
        }

        await route.fulfill({ status: 204, body: '' });
      });
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('cell', { name: '待删除测试记录', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '删除待删除测试记录' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('删除这条记录？')).toBeVisible();

      await page.getByRole('button', { name: '取消' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('统计分析页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/statistics');
      await page.waitForLoadState('networkidle');
    });

    test('应该显示页面标题', async ({ page }) => {
      await expect(page.locator('main').getByText('统计分析')).toBeVisible();
    });

    test('应该显示时间选择器', async ({ page }) => {
      await expect(page.getByRole('button', { name: '本月' })).toBeVisible();
      await expect(page.getByRole('button', { name: '本季' })).toBeVisible();
      await expect(page.getByRole('button', { name: '本年' })).toBeVisible();
      await expect(page.getByRole('button', { name: '自定义' })).toBeVisible();
    });

    test('应该显示收支概览', async ({ page }) => {
      await expect(page.getByText('总收入', { exact: true })).toBeVisible();
      await expect(page.getByText('总支出', { exact: true })).toBeVisible();
      await expect(page.getByText('结余', { exact: true })).toBeVisible();
    });

    test('应该显示图表', async ({ page }) => {
      await expect(page.getByText('分类金额占比')).toBeVisible();
      await expect(page.getByText('每日收支趋势')).toBeVisible();
    });
  });

  test.describe('预算管理页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/budgets');
      await page.waitForLoadState('networkidle');
    });

    test('应该显示页面标题', async ({ page }) => {
      await expect(page.locator('main').getByText('预算概览')).toBeVisible();
    });

    test('应该显示新增预算按钮', async ({ page }) => {
      await expect(page.getByRole('button', { name: '新增预算' })).toBeVisible();
    });

    test('预算总览卡不再使用旧高饱和渐变', async ({ page }) => {
      const backgroundImages = await page.locator('[data-testid^="budget-"][data-testid$="-card"]').evaluateAll((cards) =>
        cards.map((card) => window.getComputedStyle(card as HTMLElement).backgroundImage)
      );
      expect(backgroundImages.every((backgroundImage) => backgroundImage === 'none')).toBeTruthy();
    });

    test('应该能够打开新增预算对话框', async ({ page }) => {
      await page.getByRole('button', { name: '新增预算' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: '预算金额' })).toBeVisible();
    });

    test('应该能够新增预算', async ({ page }) => {
      await page.getByRole('button', { name: '新增预算' }).click();
      
      await page.getByRole('spinbutton', { name: '预算金额' }).fill('5000');
      await page.getByRole('combobox', { name: '预算周期' }).click();
      await page.getByRole('option', { name: '月度预算' }).click();
      await page.getByRole('button', { name: '创建预算' }).click();
      
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('5,000').first()).toBeVisible();
    });
  });

  test.describe('设置页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
    });

    test('应该显示页面标题', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
    });

    test('应该显示分类管理标签', async ({ page }) => {
      await expect(page.getByRole('tab', { name: '分类管理' })).toBeVisible();
    });

    test('应该显示标签管理标签', async ({ page }) => {
      await expect(page.getByRole('tab', { name: '标签管理' })).toBeVisible();
    });

    test('应该显示数据导入导出标签', async ({ page }) => {
      await expect(page.getByRole('tab', { name: '数据导入导出' })).toBeVisible();
    });

    test('应该显示支出分类', async ({ page }) => {
      await expect(page.getByText('支出分类')).toBeVisible();
      await expect(page.getByText('餐饮')).toBeVisible();
    });

    test('应该显示收入分类', async ({ page }) => {
      await expect(page.getByText('收入分类')).toBeVisible();
      await expect(page.getByText('工资')).toBeVisible();
    });

    test('应该能够切换到标签管理', async ({ page }) => {
      await page.getByRole('tab', { name: '标签管理' }).click();
      await expect(page.getByRole('textbox', { name: '新标签名称' })).toBeVisible();
    });

    test('应该能够切换到数据导入导出', async ({ page }) => {
      await page.getByRole('tab', { name: '数据导入导出' }).click();
      await expect(page.getByText('导出数据')).toBeVisible();
      await expect(page.getByText('导入数据')).toBeVisible();
    });
  });
});

test.describe('统计图表交互优化', () => {
  test.beforeEach(async ({ page }) => {
    const categoryStats = Array.from({ length: 10 }, (_, index) => ({
      name: `分类${index + 1}`,
      icon: '📦',
      color: '#2ECC71',
      total: 1000 - index * 70,
    }));

    await page.route('**/api/transactions/stats**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          totalIncome: 5000,
          totalExpense: 4200,
          balance: 800,
          categoryStats: [
            ...categoryStats,
            { name: '零元分类', icon: '📦', color: '#BDC3C7', total: 0 },
          ],
          dailyStats: [
            { date: '2026-06-01', type: 'income', total: 5000 },
            { date: '2026-06-02', type: 'expense', total: 4200 },
          ],
        }),
      });
    });

    await ensureAuthenticated(page);
    await page.goto('/statistics');
    await page.waitForLoadState('networkidle');
  });

  test('应该聚合过多分类、去重图例颜色并支持悬停中心信息', async ({ page }) => {
    await expect(page.getByText('分类金额占比')).toBeVisible();
    await expect(page.getByTestId('pie-legend-item-其他分类')).toBeVisible();

    const colors = await page.locator('[data-testid^="pie-legend-swatch-"]').evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node as HTMLElement).backgroundColor)
    );
    expect(new Set(colors).size).toBe(colors.length);
    const hexColors = await page.locator('[data-testid^="pie-legend-swatch-"]').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.color)
    );
    expect(hexColors.every((color) => color && EDITORIAL_CATEGORY_COLORS.includes(color))).toBeTruthy();

    await page.getByTestId('pie-legend-item-分类3').hover();
    await expect(page.getByTestId('pie-center-name')).toContainText('分类3');
  });

  test('移动端点击图例后保持选中且没有黑色焦点框', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('pie-legend-item-分类4').click();
    await expect(page.getByTestId('pie-center-name')).toContainText('分类4');

    const outlineStyles = await page.locator('.recharts-sector').evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node as SVGElement).outlineStyle)
    );
    expect(outlineStyles.every((outlineStyle) => outlineStyle === 'none')).toBeTruthy();
  });
});

test.describe('设置页布局优化', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/categories**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: '餐饮', type: 'expense', icon: '🍽️', color: '#8A5A61', is_preset: 1, sort_order: 0 },
          { id: 2, name: '交通', type: 'expense', icon: '🚗', color: '#5D737E', is_preset: 1, sort_order: 1 },
          { id: 3, name: '工资', type: 'income', icon: '💰', color: '#5F6F52', is_preset: 1, sort_order: 0 },
        ]),
      });
    });
    await page.route('**/api/tags**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: '支付宝' }, { id: 2, name: '微信' }]),
      });
    });
    await ensureAuthenticated(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('分类卡片显示颜色，标签表单对齐，导入导出卡片等高', async ({ page }) => {
    await expect(page.getByTestId('category-color-餐饮')).toBeVisible();

    await page.getByRole('tab', { name: '标签管理' }).click();
    const tagInputBox = await page.getByTestId('tag-name-field').boundingBox();
    const addButtonBox = await page.getByRole('button', { name: '添加标签' }).boundingBox();
    expect(Math.round(tagInputBox?.y || 0)).toBe(Math.round(addButtonBox?.y || 0));
    expect(Math.round(tagInputBox?.height || 0)).toBe(Math.round(addButtonBox?.height || 0));

    await page.getByRole('tab', { name: '数据导入导出' }).click();
    const exportCardBox = await page.getByTestId('export-card').boundingBox();
    const importCardBox = await page.getByTestId('import-card').boundingBox();
    expect(Math.round(exportCardBox?.y || 0)).toBe(Math.round(importCardBox?.y || 0));
    expect(Math.round(exportCardBox?.height || 0)).toBe(Math.round(importCardBox?.height || 0));
  });
});
