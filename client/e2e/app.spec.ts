import { test, expect } from '@playwright/test';

test.describe('个人记账本应用', () => {
  test.beforeEach(async ({ page }) => {
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

    test('应该显示最近记录区域', async ({ page }) => {
      await expect(page.getByText('最近记录')).toBeVisible();
    });

    test('应该显示记一笔按钮', async ({ page }) => {
      await expect(page.getByRole('button', { name: '记一笔' })).toBeVisible();
    });

    test('点击记一笔应该跳转到收支记录页面', async ({ page }) => {
      await page.getByRole('button', { name: '记一笔' }).click();
      await expect(page).toHaveURL('/transactions');
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
      await expect(page.getByText('总收入')).toBeVisible();
      await expect(page.getByText('总支出')).toBeVisible();
      await expect(page.getByText('结余')).toBeVisible();
    });

    test('应该显示图表', async ({ page }) => {
      await expect(page.getByText('分类支出占比')).toBeVisible();
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
      await expect(page.locator('main').getByText('设置')).toBeVisible();
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
