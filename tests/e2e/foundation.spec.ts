import { test, expect } from '@playwright/test';
test('five pages, responsive navigation, persistent theme and no business writes during navigation', async ({
  page,
}) => {
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
      request.method() !== 'GET' ||
      ['fetch', 'xhr', 'websocket', 'eventsource'].includes(
        request.resourceType(),
      ) ||
      url.search
    )
      unexpected.push(request.resourceType());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '一点记录，一点进步。' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({
    path: test.info().outputPath('phase0-dashboard.png'),
    fullPage: true,
  });
  for (const [name, heading, action] of [
    ['习惯', '留一点时间，了解自己。', '记录一次'],
    ['训练', '专注下一组。', '开始训练'],
    ['饮食', '吃得明白，记录简单。', '添加食物'],
  ]) {
    await page
      .getByRole('navigation')
      .getByRole('link', { name: new RegExp(name) })
      .click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('button', { name: action, exact: true }))[
      'toBeEnabled'
    ]();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /设置/ })
    .click();
  await expect(
    page.getByRole('heading', { name: '你的记录，你的选择。' }),
  ).toBeVisible();
  await page.getByLabel('界面主题').selectOption('light');
  await expect(page.getByText('主题已保存。')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByLabel('界面主题').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const url = page.url();
  await page.getByRole('link', { name: '跳到内容' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(page.url()).toBe(url);
  const counts = await page.evaluate(async () => {
    const request = indexedDB.open('JerkLog');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = Array.from(database.objectStoreNames).filter(
      (name) =>
        ![
          'settings',
          'exercises',
          'trainingMeta',
          'foods',
          'nutritionMeta',
        ].includes(name),
    );
    const transaction = database.transaction(stores, 'readonly');
    const counts = await Promise.all(
      stores.map(
        (name) =>
          new Promise<number>((resolve, reject) => {
            const count = transaction.objectStore(name).count();
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => reject(count.error);
          }),
      ),
    );
    database.close();
    return counts;
  });
  expect(counts.every((count) => count === 0)).toBe(true);
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});
