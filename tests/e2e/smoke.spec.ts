import { test, expect } from '@playwright/test';
test('three modules persist on refresh; navigation, undo, settings and no data requests', async ({
  page,
}) => {
  // This host's antivirus injects this script into HTTP responses, outside app code.
  // Abort it before execution; all other unexpected requests still fail the test.
  const injectedHost = 'gc.kis.v2.scr.kaspersky-labs.com';
  await page.route(`**://${injectedHost}/**`, (route) => route.abort());
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === injectedHost) return;
    if (
      url.origin !== 'http://127.0.0.1:4173' ||
      ['fetch', 'xhr', 'websocket', 'eventsource'].includes(
        request.resourceType(),
      ) ||
      request.method() !== 'GET' ||
      url.search
    )
      unexpected.push(request.resourceType());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '一点记录，一点进步。' }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('dashboard.png'),
    fullPage: true,
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /习惯/ })
    .click();
  await page.getByRole('button', { name: '记录一次', exact: true }).click();
  await expect(page.getByText('共 1 条')).toBeVisible();
  await page.reload();
  await expect(page.getByText('共 1 条')).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('记录时间', { exact: true }).fill('2020-01-01T12:00');
  await page.getByRole('button', { name: '保存时间' }).click();
  await expect(page.getByText('记录时间已保存。')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByText('共 0 条')).toBeVisible();
  await page.getByRole('button', { name: '撤销删除' }).click();
  await expect(page.getByText('共 1 条')).toBeVisible();
  await page.getByLabel('记录时间', { exact: true }).fill('2020-01-02T12:00');
  await page.getByRole('button', { name: '保存时间' }).click();
  await expect(page.getByText('共 2 条')).toBeVisible();

  await page
    .getByRole('navigation')
    .getByRole('link', { name: /训练/ })
    .click();
  await page.getByLabel('计划名称').fill('测试计划');
  await page.getByRole('button', { name: '创建计划' }).click();
  await expect(page.getByText('已创建基础计划。')).toBeVisible();
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.getByLabel('关联计划').selectOption({ label: '测试计划' });
  await page.getByLabel('动作名称').fill('测试深蹲');
  await page.getByLabel('重量（kg）', { exact: true }).fill('20');
  await page.getByRole('button', { name: '保存一组' }).click();
  await expect(page.getByText('10 次 × 20 kg')).toBeVisible();
  await page.reload();
  await expect(page.getByText('测试深蹲', { exact: true })).toBeVisible();

  await page
    .getByRole('navigation')
    .getByRole('link', { name: /饮食/ })
    .click();
  await page.getByRole('button', { name: '新建食品' }).click();
  await page.getByLabel('食品名称').fill('测试酸奶');
  await page.getByLabel('热量（kcal）', { exact: true }).fill('80');
  await page.getByLabel('蛋白质（g）', { exact: true }).fill('4');
  await page.getByLabel('碳水（g）', { exact: true }).fill('10');
  await page.getByLabel('脂肪（g）', { exact: true }).fill('2');
  await page.getByLabel('数据来源').fill('合成测试数据');
  await page.getByRole('button', { name: '保存食品' }).click();
  await expect(page.getByText('食品已保存，可以录入食用克数。')).toBeVisible();
  await page
    .getByLabel('选择食品')
    .selectOption({ label: '测试酸奶 · 未注明 · 合成测试数据' });
  await page.getByLabel('食用克数（g）').fill('150');
  await page.getByRole('button', { name: '添加食物', exact: true }).click();
  await expect(page.getByText('150 g · 120.0 kcal')).toBeVisible();
  await expect(
    page.getByText('蛋白质 6.0 g / 碳水 15.0 g / 脂肪 3.0 g'),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('150 g · 120.0 kcal')).toBeVisible();

  await page
    .getByRole('navigation')
    .getByRole('link', { name: /设置/ })
    .click();
  await page.getByLabel('整活文案').check();
  await expect(page.getByText('设置已保存。')).toBeVisible();
  await page.getByLabel('界面主题').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByLabel('整活文案')).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /习惯/ })
    .click();
  await expect(
    page.getByRole('button', { name: '记录一次 · 收工' }),
  ).toBeVisible();
  await expect(page.getByText('共 2 条')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.context().setOffline(true);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /饮食/ })
    .click();
  await expect(page.getByText('150 g · 120.0 kcal')).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /训练/ })
    .click();
  await expect(page.getByText('测试深蹲', { exact: true })).toBeVisible();
  await page.context().setOffline(false);
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});
