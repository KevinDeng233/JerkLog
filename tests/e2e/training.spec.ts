import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'Asia/Shanghai', actionTimeout: 5000 });
test('Training Lab manual acceptance, snapshots, persistence and Habits regression', async ({
  page,
}) => {
  const errors: string[] = [];
  const unexpected: string[] = [];
  const host = 'gc.kis.v2.scr.kaspersky-labs.com';
  await page.route(`**://${host}/**`, (route) => route.abort());
  page.on('pageerror', (error) => errors.push(error.name));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === host) return;
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
  await page.clock.setFixedTime(new Date('2026-11-21T04:00:00Z'));
  await page.goto('/#/training');
  await expect(
    page.getByRole('button', { name: '开始训练', exact: true }),
  ).toBeEnabled();
  await page.getByRole('tab', { name: '动作 Exercises', exact: true }).click();
  await page.getByLabel('动作名称', { exact: true }).fill('验收动作');
  await page
    .getByRole('combobox', { name: '器械分类', exact: true })
    .selectOption('其他');
  await page.getByRole('button', { name: '保存动作', exact: true }).click();
  await page.getByLabel('搜索动作').fill('验收动作');
  await expect(
    page.locator('.exercise-list').getByText('验收动作', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '计划 Plans', exact: true }).click();
  await page
    .getByRole('button', { name: '使用四分化 · 胸背肩腿模板', exact: true })
    .click();
  const editor = page.locator('.plan-editor');
  await editor.getByLabel('计划名称', { exact: true }).fill('验收四日计划');
  await editor.getByLabel('计划目标（可选）').fill('学习记录与回顾');
  const firstDay = editor.locator('.day-editor').first();
  await firstDay.getByLabel('日程名称').fill('胸部日');
  await expect(firstDay.getByLabel('训练动作').nth(0)).toHaveValue(
    'builtin:bench',
  );
  await expect(firstDay.getByLabel('训练动作').nth(1)).toHaveValue(
    'builtin:incline',
  );
  await editor.getByRole('button', { name: '保存计划', exact: true }).click();
  await expect(page.getByText('计划已保存。', { exact: true })).toBeVisible();
  const plan = page.locator('.plan-list>section').filter({
    has: page.getByRole('heading', { name: '验收四日计划', exact: true }),
  });
  await plan
    .getByRole('button', { name: '开始此训练日', exact: true })
    .first()
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  const current = page.locator('.current-session');
  await expect(
    current.getByRole('heading', {
      name: '验收四日计划 / 胸部日',
      exact: true,
    }),
  ).toBeVisible();
  await current.getByLabel('本组动作').selectOption('builtin:bench');
  await current.getByLabel('本组次数').fill('10');
  await current.getByLabel('本组重量（kg）').fill('50');
  await current.getByLabel('强度记录').selectOption('rpe');
  await current.getByLabel('强度数值（可选）').fill('7.5');
  await current
    .getByRole('button', { name: '保存训练组', exact: true })
    .click();
  await expect(current.locator('.record-list>li')).toHaveCount(1);
  await current.getByLabel('本组动作').selectOption('builtin:incline');
  await current.getByLabel('本组次数').fill('12');
  await current.getByLabel('本组重量（kg）').fill('20');
  await current
    .getByRole('button', { name: '保存训练组', exact: true })
    .click();
  await expect(current.locator('.record-list>li')).toHaveCount(2);
  await current
    .locator('.record-list>li')
    .first()
    .getByRole('button', { name: '编辑此组' })
    .click();
  await current.getByLabel('本组次数').fill('8');
  await current.getByLabel('本组重量（kg）').fill('60');
  await current.getByRole('button', { name: '保存组修改' }).click();
  await expect(current.locator('.record-list>li').first()).toContainText(
    '8 次 × 60 kg',
  );
  await current.getByLabel('本组动作').selectOption({ label: '验收动作' });
  await current.getByLabel('负重类型').selectOption('bodyweight');
  await current.getByLabel('本组次数').fill('10');
  await current
    .getByRole('button', { name: '保存训练组', exact: true })
    .click();
  await expect(current.locator('.record-list>li')).toHaveCount(3);
  page.once('dialog', (dialog) => dialog.accept());
  await current
    .locator('.record-list>li')
    .last()
    .getByRole('button', { name: '删除此组' })
    .click();
  await expect(current.locator('.record-list>li')).toHaveCount(2);
  await current.getByLabel('本组动作').selectOption({ label: '验收动作' });
  await current.getByLabel('负重类型').selectOption('bodyweight');
  await current.getByLabel('本组次数').fill('11');
  await current
    .getByRole('button', { name: '保存训练组', exact: true })
    .click();
  await expect(current.locator('.record-list>li')).toHaveCount(3);
  await expect(
    current
      .locator('.metric')
      .filter({ hasText: '负重容量' })
      .locator('strong'),
  ).toHaveText('720kg·次');
  await page.clock.setFixedTime(new Date('2026-11-21T04:01:00Z'));
  await current.getByRole('button', { name: '暂停训练', exact: true }).click();
  await expect(
    current.getByRole('button', { name: '恢复训练', exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-11-21T04:03:00Z'));
  await current.getByRole('button', { name: '恢复训练', exact: true }).click();
  await expect(
    current.getByRole('button', { name: '暂停训练', exact: true }),
  ).toBeVisible();
  await current.getByLabel('训练备注', { exact: true }).fill('验收训练备注');
  await current
    .getByRole('button', { name: '保存训练备注', exact: true })
    .click();
  await expect(
    page.getByText('训练备注已保存。', { exact: false }),
  ).toBeVisible();
  await page.clock.setFixedTime(new Date('2026-11-21T04:04:00Z'));
  page.once('dialog', (dialog) => dialog.accept());
  await current.getByRole('button', { name: '完成训练', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '训练历史', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.history-session')).toContainText(
    '3 组 · 720 kg·次 · 有效 2 分钟',
  );
  await expect(
    page
      .locator('.metric')
      .filter({ hasText: '本周完成训练' })
      .locator('strong'),
  ).toHaveText('1次');
  await page.reload();
  await page.getByRole('tab', { name: '历史 History', exact: true }).click();
  await expect(page.locator('.history-session')).toContainText('验收训练备注');
  await expect(page.locator('.history-session')).toContainText('验收动作');
  await page.getByRole('tab', { name: '计划 Plans', exact: true }).click();
  await plan.getByRole('button', { name: '归档计划', exact: true }).click();
  await expect(plan.getByText('已归档', { exact: true })).toBeVisible();
  await plan.getByRole('button', { name: '编辑计划', exact: true }).click();
  await editor.getByLabel('计划名称', { exact: true }).fill('修改后的计划');
  await editor.getByRole('button', { name: '保存计划', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '修改后的计划', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '动作 Exercises', exact: true }).click();
  await page.getByLabel('搜索动作').fill('验收动作');
  const exercise = page
    .locator('.exercise-list>li')
    .filter({ hasText: '验收动作' });
  await exercise.getByRole('button', { name: '编辑动作' }).click();
  await page.getByLabel('动作名称', { exact: true }).fill('新版动作');
  await page.getByRole('button', { name: '保存动作', exact: true }).click();
  await page.getByLabel('搜索动作').fill('新版动作');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.exercise-list>li')
    .filter({ hasText: '新版动作' })
    .getByRole('button', { name: '删除动作' })
    .click();
  await expect(page.locator('.exercise-list>li')).toHaveCount(0);
  await page.getByRole('tab', { name: '计划 Plans', exact: true }).click();
  const renamed = page
    .locator('.plan-list>section')
    .filter({ hasText: '修改后的计划' });
  page.once('dialog', (dialog) => dialog.accept());
  await renamed.getByRole('button', { name: '删除计划' }).click();
  await expect(page.locator('.plan-list>section')).toHaveCount(0);
  await page.getByRole('tab', { name: '历史 History', exact: true }).click();
  await expect(page.locator('.history-session')).toContainText(
    '验收四日计划 / 胸部日',
  );
  await expect(page.locator('.history-session')).toContainText('验收动作');
  await expect(page.locator('.history-session')).not.toContainText('新版动作');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('main').focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('training-history.png'),
    fullPage: true,
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /习惯/ })
    .click();
  await page.getByRole('button', { name: '记录一次', exact: true }).click();
  await expect(page.getByText('共 1 条', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('共 1 条', { exact: true })).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /总览/ })
    .click();
  await expect(
    page.locator('.metric').filter({ hasText: '今日记录' }).locator('strong'),
  ).toHaveText('1次');
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
    .getByRole('link', { name: /训练/ })
    .click();
  await expect(
    page.getByText('今天的铁也有日志：认真记录，按自己的节奏来。'),
  ).toBeVisible();
  await page.getByRole('tab', { name: '历史 History', exact: true }).click();
  await expect(page.locator('.history-session')).toContainText('720 kg·次');
  await page.getByRole('main').focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('training-history-light.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
