import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'Asia/Shanghai' });
test('Habits CRUD, persistent undo, calendar and real dashboard statistics', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-21T04:00:00Z'));
  const unexpected: string[] = [];
  const errors: string[] = [];
  const injectedHost = 'gc.kis.v2.scr.kaspersky-labs.com';
  await page.route(`**://${injectedHost}/**`, (route) => route.abort());
  page.on('pageerror', (error) => errors.push(error.name));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === injectedHost) return;
    if (
      url.origin !== 'http://127.0.0.1:4173' ||
      request.method() !== 'GET' ||
      ['xhr', 'fetch', 'websocket', 'eventsource'].includes(
        request.resourceType(),
      ) ||
      url.search
    )
      unexpected.push(request.resourceType());
  });
  await page.goto('/#/habits');
  const history = page.locator('.habits-columns > section').nth(1);
  await expect(history.getByText('共 0 条', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: '记录一次', exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(history.getByText('共 1 条', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '刚刚已记录 · 请稍候' }),
  ).toBeDisabled();
  await page.reload();
  await expect(history.getByText('共 1 条', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '撤销最近操作' }).click();
  await expect(history.getByText('共 0 条', { exact: true })).toBeVisible();
  await page.getByLabel('记录发生时间').fill('2026-11-01T10:15:00');
  await page.getByRole('button', { name: '保存补录' }).click();
  await expect(history.getByText('共 1 条', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '2026-11-01，1 次', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '2026-11-01，1 次', exact: true })
    .click();
  await expect(page.locator('.calendar-card').getByRole('time')).toHaveCount(1);
  await history.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('记录发生时间').fill('2026-10-31T23:59:59');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(history.locator('time')).toContainText('2026/10/31');
  await page.getByRole('button', { name: '上个月' }).click();
  await page
    .getByRole('button', { name: '2026-10-31，1 次', exact: true })
    .click();
  await expect(page.locator('.calendar-card').locator('time')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await history.getByRole('button', { name: '删除', exact: true }).click();
  await expect(history.getByText('共 0 条', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '撤销最近操作' }).click();
  await expect(history.getByText('共 1 条', { exact: true })).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /总览/ })
    .click();
  await expect(
    page.locator('.metric').filter({ hasText: '今日记录' }).locator('strong'),
  ).toHaveText('0次');
  await expect(
    page.locator('.metric').filter({ hasText: '本周' }).locator('strong'),
  ).toHaveText('0次');
  await expect(
    page.locator('.metric').filter({ hasText: '最近 7 天' }).locator('strong'),
  ).toHaveText('0次');
  await expect(
    page.locator('.metric').filter({ hasText: '最近 30 天' }).locator('strong'),
  ).toHaveText('1次');
  await page.getByText('查看每日数据', { exact: true }).click();
  await expect(
    page.getByRole('row').filter({ hasText: '2026-10-31' }).getByRole('cell'),
  ).toHaveText('1');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /设置/ })
    .click();
  await page.getByLabel('整活文案').check();
  await expect(
    page.getByText('文案模式已保存。', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('界面主题').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.clock.setFixedTime(new Date('2026-11-21T04:00:05Z'));
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /习惯/ })
    .click();
  await expect(
    page.getByRole('button', { name: '记录一次 · 收工', exact: true }),
  ).toBeEnabled();
  await expect(history.getByText('共 1 条', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('habits-light.png'),
    fullPage: true,
  });
  await page.context().setOffline(true);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /总览/ })
    .click();
  await expect(
    page.locator('.metric').filter({ hasText: '最近 30 天' }).locator('strong'),
  ).toHaveText('1次');
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});
test('failed habit write shows safe error and leaves no partial record', async ({
  page,
}) => {
  await page.route('**://gc.kis.v2.scr.kaspersky-labs.com/**', (route) =>
    route.abort(),
  );
  await page.goto('/#/habits');
  await expect(
    page.getByRole('button', { name: '记录一次', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'habitEntries')
        throw new DOMException(
          'SENSITIVE_SIMULATED_TEXT',
          'QuotaExceededError',
        );
      return original.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: '记录一次', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('本地数据操作失败');
  await expect(page.getByRole('alert')).not.toContainText(
    'SENSITIVE_SIMULATED_TEXT',
  );
  await expect(page.getByText('共 0 条', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '记录一次', exact: true }).click();
  await expect(page.getByText('共 1 条', { exact: true })).toBeVisible();
});

test('statistics and calendar roll over local midnight and month without refresh', async ({
  page,
}) => {
  await page.route('**://gc.kis.v2.scr.kaspersky-labs.com/**', (route) =>
    route.abort(),
  );
  await page.clock.setFixedTime(new Date('2026-11-30T15:59:59Z'));
  await page.goto('/#/habits');
  await page.getByRole('button', { name: '记录一次', exact: true }).click();
  await expect(
    page.locator('.metric').filter({ hasText: '今日记录' }).locator('strong'),
  ).toHaveText('1次');
  await page.clock.setFixedTime(new Date('2026-11-30T16:00:01Z'));
  await expect(
    page.locator('.metric').filter({ hasText: '今日记录' }).locator('strong'),
  ).toHaveText('0次');
  await expect(
    page.locator('.metric').filter({ hasText: '本周' }).locator('strong'),
  ).toHaveText('1次');
  await expect(
    page.getByRole('button', { name: '2026-12-01，0 次', exact: true }),
  ).toHaveAttribute('aria-current', 'date');
  await expect(page.getByText('共 1 条', { exact: true })).toBeVisible();
});
test('read failure produces safe feedback without a misleading zero dashboard', async ({
  page,
}) => {
  await page.route('**://gc.kis.v2.scr.kaspersky-labs.com/**', (route) =>
    route.abort(),
  );
  await page.addInitScript(() => {
    const originalCursor = IDBIndex.prototype.openCursor;
    IDBIndex.prototype.openCursor = function (query, direction) {
      if (this.objectStore.name === 'habitEntries')
        throw new DOMException('SENSITIVE_READ_TEXT', 'UnknownError');
      return originalCursor.call(this, query, direction);
    };
    const original = IDBIndex.prototype.getAll;
    IDBIndex.prototype.getAll = function (query, count) {
      if (this.objectStore.name === 'habitEntries')
        throw new DOMException('SENSITIVE_READ_TEXT', 'UnknownError');
      return original.call(this, query, count);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('本地数据操作失败');
  await expect(page.getByRole('alert')).not.toContainText(
    'SENSITIVE_READ_TEXT',
  );
  await expect(page.getByRole('button', { name: '重新读取' })).toBeVisible();
  await expect(page.locator('.metric')).toHaveCount(0);
});
