import { test, expect, type Page, type Locator } from '@playwright/test';
test.use({ timezoneId: 'Asia/Shanghai', actionTimeout: 5000 });
const injected = 'gc.kis.v2.scr.kaspersky-labs.com';
const kcal = (page: Page) =>
  page.getByRole('region', { name: '热量总计', exact: true }).locator('strong');
async function createFood(
  dialog: Locator,
  name: string,
  kcalValue: string,
  protein: string,
  carbs: string,
  fat: string,
) {
  await dialog
    .getByRole('button', { name: '在这里新建食品', exact: true })
    .click();
  await dialog.getByLabel('食品名称', { exact: true }).fill(name);
  await dialog
    .getByRole('combobox', { name: '生熟状态', exact: true })
    .selectOption('cooked');
  await dialog
    .getByLabel('热量 / 100g（kcal）', { exact: true })
    .fill(kcalValue);
  await dialog.getByLabel('蛋白质 / 100g（g）', { exact: true }).fill(protein);
  await dialog.getByLabel('碳水 / 100g（g）', { exact: true }).fill(carbs);
  await dialog.getByLabel('脂肪 / 100g（g）', { exact: true }).fill(fat);
  await dialog
    .getByLabel('来源说明', { exact: true })
    .fill('合成测试标签，不是真实个人数据');
  await dialog.getByRole('button', { name: '保存食品', exact: true }).click();
  await expect(
    dialog.getByRole('combobox', { name: '选择食品', exact: true }),
  ).toBeVisible();
}
async function setup(page: Page) {
  await page.route(`**://${injected}/**`, (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-11-21T04:00:00Z'));
  await page.goto('/#/nutrition');
  await expect(
    page.getByRole('button', { name: '添加食物', exact: true }),
  ).toBeEnabled();
}
test('Nutrition manual journey: sources, snapshots, local dates, goals, persistence and loaded-page offline reads', async ({
  page,
}) => {
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === injected) return;
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
  await setup(page);
  await expect(kcal(page)).toHaveText('0.0 kcal');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: '添加食物', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '添加食物', exact: true });
  await createFood(dialog, '自制测试点心', '120', '10', '20', '5');
  await dialog.getByLabel('食用数量', { exact: true }).fill('150');
  await dialog
    .getByRole('combobox', { name: '餐次', exact: true })
    .selectOption('lunch');
  await dialog
    .getByRole('button', { name: '保存饮食记录', exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(dialog).not.toBeVisible();
  await expect(kcal(page)).toHaveText('180.0 kcal');
  await expect(
    page
      .getByRole('region', { name: '午餐记录', exact: true })
      .locator('.meal-row'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: '添加食物', exact: true }).click();
  await createFood(dialog, '测试晚餐', '80', '', '5', '2');
  await dialog.getByLabel('食用数量', { exact: true }).fill('100');
  await dialog
    .getByRole('combobox', { name: '餐次', exact: true })
    .selectOption('dinner');
  await dialog
    .getByRole('button', { name: '保存饮食记录', exact: true })
    .click();
  await expect(kcal(page)).toHaveText('260.0 kcal');
  await expect(
    page
      .getByRole('region', { name: '蛋白质总计', exact: true })
      .locator('strong'),
  ).toContainText('已知小计 15.0（不完整）');
  await page
    .getByRole('tab', { name: '食品库 Food Library', exact: true })
    .click();
  await page.getByLabel('搜索食品', { exact: true }).fill('自制测试点心');
  await page
    .locator('.food-list>li')
    .getByRole('button', { name: '编辑食品', exact: true })
    .click();
  await page.getByLabel('食品名称', { exact: true }).fill('改名后的点心');
  await page.getByLabel('热量 / 100g（kcal）', { exact: true }).fill('500');
  await page.getByRole('button', { name: '保存食品', exact: true }).click();
  await expect(page.getByText('食品已保存。', { exact: true })).toBeVisible();
  await page
    .getByRole('tab', { name: '饮食日记 Food Diary', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: '午餐记录', exact: true }),
  ).toContainText('自制测试点心');
  await expect(kcal(page)).toHaveText('260.0 kcal');
  await page.getByRole('tab', { name: '目标 Goals', exact: true }).click();
  await page.getByLabel('每日热量目标（kcal）', { exact: true }).fill('2000');
  await page.getByRole('button', { name: '保存营养目标', exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: '热量摄入目标进度', exact: true }),
  ).toHaveAttribute('value', '13');
  await page
    .getByRole('tab', { name: '饮食日记 Food Diary', exact: true })
    .click();
  await page
    .getByRole('region', { name: '午餐记录', exact: true })
    .getByRole('button', { name: '编辑饮食记录', exact: true })
    .click();
  await page.getByLabel('修改克数（g）', { exact: true }).fill('100');
  await page.getByLabel('修改日期', { exact: true }).fill('2026-11-20');
  await page
    .getByRole('combobox', { name: '修改餐次', exact: true })
    .selectOption('breakfast');
  await page.getByRole('button', { name: '保存饮食修改', exact: true }).click();
  await expect(kcal(page)).toHaveText('120.0 kcal');
  await expect(
    page
      .getByRole('region', { name: '早餐记录', exact: true })
      .locator('.meal-row'),
  ).toHaveCount(1);
  await page.getByLabel('查看饮食日期', { exact: true }).fill('2026-11-21');
  await expect(kcal(page)).toHaveText('80.0 kcal');
  await expect(
    page.getByRole('region', { name: '蛋白质总计', exact: true }),
  ).toContainText('未知（无已知数值）');
  await page.getByLabel('查看饮食日期', { exact: true }).fill('2026-11-20');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('region', { name: '早餐记录', exact: true })
    .getByRole('button', { name: '删除饮食记录', exact: true })
    .click();
  await expect(kcal(page)).toHaveText('0.0 kcal');
  await page.getByLabel('查看饮食日期', { exact: true }).fill('2026-11-21');
  await page
    .getByRole('tab', { name: '食品库 Food Library', exact: true })
    .click();
  await page.getByLabel('搜索食品', { exact: true }).fill('测试晚餐');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.food-list>li')
    .getByRole('button', { name: '删除食品', exact: true })
    .click();
  await expect(page.locator('.food-list>li')).toHaveCount(0);
  await page.getByLabel('搜索食品', { exact: true }).fill('改名后的点心');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.food-list>li')
    .getByRole('button', { name: '归档食品', exact: true })
    .click();
  await expect(page.locator('.food-list>li')).toHaveCount(0);
  await page
    .getByRole('checkbox', { name: '显示已归档食品', exact: true })
    .check();
  await expect(page.locator('.food-list>li')).toContainText('已归档');
  await page
    .locator('.food-list>li')
    .getByRole('button', { name: '恢复食品', exact: true })
    .click();
  await expect(
    page
      .locator('.food-list>li')
      .getByRole('button', { name: '归档食品', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(kcal(page)).toHaveText('80.0 kcal');
  await expect(
    page.getByRole('region', { name: '晚餐记录', exact: true }),
  ).toContainText('测试晚餐');
  await expect(
    page.getByRole('progressbar', { name: '热量摄入目标进度', exact: true }),
  ).toHaveAttribute('value', '4');
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
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /饮食/ })
    .click();
  await expect(
    page.getByText('给今天的饭写个日志，数字认真算，吃饭按自己的节奏来。'),
  ).toBeVisible();
  await expect(kcal(page)).toHaveText('80.0 kcal');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('main').focus();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('nutrition-light.png'),
    fullPage: true,
  });
  await page.context().setOffline(true);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /训练/ })
    .click();
  await expect(
    page.getByRole('heading', { name: '专注下一组。', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '开始训练', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /饮食/ })
    .click();
  await expect(kcal(page)).toHaveText('80.0 kcal');
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
test('optional restrictions, dismissible suggestions and explicit estimator-to-goal flow', async ({
  page,
}) => {
  await setup(page);
  await page.getByText('设置饮食方向与忌口', { exact: true }).click();
  await page
    .getByRole('combobox', { name: '建议方向', exact: true })
    .selectOption('balanced');
  await page
    .getByRole('combobox', { name: '饮食选择', exact: true })
    .selectOption('vegan');
  await page.getByRole('checkbox', { name: '大豆', exact: true }).check();
  await page.getByRole('button', { name: '保存饮食偏好', exact: true }).click();
  await expect(page.locator('.meal-idea')).toContainText(
    '米饭 + 煮熟的扁豆 + 蔬菜',
  );
  await expect(page.locator('.meal-idea')).not.toContainText('豆腐');
  await page
    .getByRole('button', { name: '隐藏这一天的建议', exact: true })
    .click();
  await expect(
    page.getByText('这一天的建议已隐藏。', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('这一天的建议已隐藏。', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '显示这一天的建议', exact: true })
    .click();
  await expect(page.locator('.meal-idea')).toBeVisible();
  // Dismiss/show must advance the local preference draft revision too.
  await page.getByText('设置饮食方向与忌口', { exact: true }).click();
  await page.getByRole('button', { name: '保存饮食偏好', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '饮食偏好已保存。' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '目标 Goals', exact: true }).click();
  await page.getByText('可选：成年人的能量需求估算', { exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: '我已成年，并自愿使用该估算公式',
      exact: true,
    })
    .check();
  await page.getByLabel('年龄（岁）', { exact: true }).fill('30');
  await page.getByLabel('体重（kg）', { exact: true }).fill('70');
  await page.getByLabel('身高（cm）', { exact: true }).fill('175');
  await page
    .getByRole('combobox', { name: '公式系数', exact: true })
    .selectOption('male');
  await page
    .getByRole('combobox', { name: '活动倍数（粗略假设）', exact: true })
    .selectOption('1.2');
  await page.getByRole('button', { name: '计算估算值', exact: true }).click();
  await expect(
    page.getByText('估算值：静息能量约 1650 kcal/日；维持能量约 2000 kcal/日', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page
    .getByRole('button', { name: '填入热量目标草稿', exact: true })
    .click();
  await expect(
    page.getByLabel('每日热量目标（kcal）', { exact: true }),
  ).toHaveValue('2000');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: '保存营养目标', exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: '热量摄入目标进度', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', {
      name: '处于孕期或哺乳期（本估算器不适用）',
      exact: true,
    })
    .check();
  await expect(
    page.getByRole('button', { name: '计算估算值', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('估算值：静息能量约 1650 kcal/日；维持能量约 2000 kcal/日', {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('checkbox', {
      name: '处于孕期或哺乳期（本估算器不适用）',
      exact: true,
    })
    .uncheck();
  await page.getByLabel('年龄（岁）', { exact: true }).fill('17');
  await expect(
    page.getByRole('button', { name: '计算估算值', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      '此估算器当前不可用。你仍可记录食物、手动设置目标或不设目标。',
      { exact: true },
    ),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空营养目标', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page.getByLabel('每日热量目标（kcal）', { exact: true }),
  ).toHaveValue('');
});
test('failed Nutrition write surfaces a safe error and retries without partial data', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: '添加食物', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '添加食物', exact: true });
  await createFood(dialog, '失败注入测试食品', '120', '10', '20', '5');
  await dialog.getByLabel('食用数量', { exact: true }).fill('150');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'mealEntries')
        throw new DOMException('SENSITIVE_TEST_TEXT', 'QuotaExceededError');
      return original.call(this, value, key);
    };
  });
  await dialog
    .getByRole('button', { name: '保存饮食记录', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('本地数据操作失败');
  await expect(dialog.getByRole('alert')).not.toContainText(
    'SENSITIVE_TEST_TEXT',
  );
  await page.reload();
  await expect(kcal(page)).toHaveText('0.0 kcal');
  await page.getByRole('button', { name: '添加食物', exact: true }).click();
  await dialog
    .getByRole('combobox', { name: '选择食品', exact: true })
    .selectOption({ label: '失败注入测试食品 · 熟' });
  await dialog.getByLabel('食用数量', { exact: true }).fill('150');
  await dialog
    .getByRole('button', { name: '保存饮食记录', exact: true })
    .click();
  await expect(kcal(page)).toHaveText('180.0 kcal');
});
test('Nutrition read failure is explicit, without fabricated zero totals', async ({
  page,
}) => {
  await page.route(`**://${injected}/**`, (route) => route.abort());
  await page.addInitScript(() => {
    const original = IDBIndex.prototype.openCursor;
    IDBIndex.prototype.openCursor = function (query, direction) {
      if (this.objectStore.name === 'mealEntries')
        throw new DOMException('SENSITIVE_TEST_READ', 'UnknownError');
      return original.call(this, query, direction);
    };
  });
  await page.goto('/#/nutrition');
  await expect(page.getByRole('alert')).toContainText('本地数据操作失败');
  await expect(page.getByRole('alert')).not.toContainText(
    'SENSITIVE_TEST_READ',
  );
  await expect(page.locator('.nutrition-metric')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '重新读取营养数据', exact: true }),
  ).toBeVisible();
});
