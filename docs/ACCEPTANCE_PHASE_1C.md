# Phase 1C · Nutrition Lab 验收报告

## 基线与范围

- 2026-11-21 核实 GitHub 最新 main 为 `3948e1b`，Phase 1B PR #3 已合并；从该 main 创建 `feat/nutrition-lab-phase-1c`。提交前再次 fetch，main 未变化。
- 阅读总纲、Phase 1C 任务书、README、已有实现与前阶段文档；本轮只完成 Phase 1C，交付 Draft PR，等待验收。
- 保留 React + TypeScript + Vite + Dexie 架构和 UI，不新增运行时依赖。Habits/Training 业务目录相对 main 无差异。
- 实际 main 未配置 PWA Service Worker；未把规划中的 PWA 当成已实现功能。核心记录可在已加载页面离线使用；离线冷启动仍未实现。

## 实现功能与决策

1. 食品库：名称/品牌/原文搜索、生熟筛选、6 条可溯源内置数据、自建食品新增/编辑/归档/恢复/确认删除。必填来源说明；允许未知营养值，可选明确每份克数。内置来源与数值只读，不暗中换算生熟。
2. 饮食日记：显式克数或已定义份量、四餐分类、所选当地日期、查看历史、修改份量/日期/餐别及确认删除。保存完整名称/来源/营养快照，食品库改删不改变历史。
3. 计算：每条→每餐→每日热量及三大营养素；保留标签 kcal，不用 4/4/9 覆盖；未知/部分已知明确展示。只在显示边界舍入，验证有限数、正克数、合理边界与小数位数。
4. 目标：四项独立手动目标、保存/编辑/清空、不设目标。无目标无虚构百分比。可选成人 Mifflin–St Jeor 估算，明确公式系数、活动粗略倍数、适用限制与非医疗声明；主动填入草稿后仍须单独保存。估算输入不持久化。
5. 饮食想法：默认关闭，使用主动选择的方向、饮食偏好/忌口及已知饮食提供简单无定量组合和替换；可按日隐藏。其他自由文本忌口无法可靠匹配时不猜测组合；缺失记录不诊断缺乏。规则不读取 Habits 或 Training。
6. 体验：Overview / Food Diary / Food Library / Goals，复用响应式导航、深浅色、专业/整活文案、错误与 Toast。原生模态框支持焦点管理，表单有标签，进度有可读摘要，视图支持方向键。
7. 可靠性：仅 Nutrition 五表事务、版本冲突检查、稳定记录 ID、持久 1.5 秒相同提交保护，多连接序列化；写入异常不部分提交，读取异常不显示虚假成功/零统计。

## 食品数据与许可

内置数据来自官方 USDA FoodData Central，SR Legacy，逐行核对日期 2026-11-21；行发布日期均为 2019-04-01。FDC ID：168878、171287、171265、171077、172475、169705，依次对应特定白米饭、全蛋、全脂奶、鸡胸、硬豆腐、未烹调燕麦谷粒。USDA 声明公共领域 CC0；每条保存来源链接、FDC/NDB 标识、英文描述、发布日期、核对日期、许可及生熟状态。

每 100g 的 kcal 和 g 单位、精确值、原始行链接与维护规则见 [FOOD_SOURCES.md](../FOOD_SOURCES.md)。不把这六条泛化为所有中国食品或品牌，不猜测鸡蛋大小、牛奶密度或烹调吸水量。开发期官方 API 核对与产品运行隔离：不提交 API 密钥，不在运行时请求食品接口。

## Schema v4 与保留证据

- 递增 v3→v4，保留 v1/v2/v3 定义及全部旧表；新增 nutritionMeta、nutritionPreferences，增加食品状态、饮食 localDate/mealType/foodId/createdAt 与组合索引，保留旧 date 索引。
- 迁移只写食品、饮食记录、营养目标，不写 Habits、habitState、Settings 或 Training，不删库、不重置。
- 非空真实 v3 测试夹具包含上述各表及 Nutrition。迁移与目录初始化后逐表比对非 Nutrition 原记录完全一致。
- 旧食品当前热量为 500 kcal/100g，但旧饮食已摄入快照为 150g/180kcal；迁移恢复其原快照为 120 kcal/100g，汇总仍为 180kcal，不读取当前食品值替换历史。
- 保留旧字段/原快照；缺失营养目标为 null；旧本地日期保留，不切 UTC 字符串。未知来源、生熟与时间不编造；无效旧日期在修复列表保留可达。
- 注入更新失败后，数据库仍是 v3，旧食品、旧餐食及其他表完整不变。跨连接重开、幂等种子、事务回滚重试和并发重复保护均测试。

## 主要文件

| 文件或目录                                                                                                            | 修改内容                                               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| src/db/models.ts、database.ts、nutritionMigration.ts                                                                  | Nutrition 类型、v4 schema、安全迁移                    |
| src/features/nutrition/repository.ts、read.ts、useNutrition.ts、date.ts                                               | 事务、持久化、索引读取、响应式错误处理、本地日期       |
| src/features/nutrition/calculators/                                                                                   | 营养与成人估算纯函数                                   |
| src/features/nutrition/foods/                                                                                         | 静态有来源目录、食品 CRUD/搜索、来源展示               |
| src/features/nutrition/diary/                                                                                         | 添加模态框、四餐历史、编辑与删除                       |
| src/features/nutrition/goals/、recommendations/、components/                                                          | 手动目标/估算器、偏好/推荐规则、汇总                   |
| src/features/nutrition/Nutrition.tsx、labels.ts                                                                       | 四视图入口与共享标签                                   |
| src/app/App.tsx、features/dashboard/Dashboard.tsx、features/settings/Settings.tsx                                     | 版本标识、Nutrition 入口说明与隐私文案                 |
| src/styles/global.css、src/i18n/zh-CN.ts                                                                              | 复用主题的响应式样式和模式文案                         |
| tests/unit/nutrition\*.test.ts、tests/e2e/nutrition.spec.ts                                                           | 计算、CRUD/持久化、迁移、规则及浏览器验收              |
| tests/unit/foundation.test.ts、habits.test.ts、trainingMigration.test.ts、tests/e2e/foundation.spec.ts                | 合理更新 schema v4 与开放 Nutrition 的预期，保留原测试 |
| tsconfig.json、package.json、package-lock.json、.github/workflows/ci.yml                                              | 小型 JSON 目录导入、Phase 1C 版本及 CI 分支            |
| README.md、README.zh-CN.md、FOOD_SOURCES.md、docs/ARCHITECTURE.md、docs/PRIVACY.md、本报告、JERKLOG_PHASE_1C_CODEX.md | 使用、来源、迁移、隐私与验收说明                       |

## 实际检查结果

最终本机执行结果如下，未删除/跳过失败测试：

| 命令                                      | 结果                                         |
| ----------------------------------------- | -------------------------------------------- |
| npm ci（附 --no-fund --cache .npm-cache） | 成功；220 个包，审计 0 漏洞                  |
| npm run lint                              | 成功；ESLint + 全库 Prettier                 |
| npm run typecheck                         | 成功                                         |
| npm run test                              | 成功；8 文件，133 项通过                     |
| npm run build                             | 成功；96 模块；JS 435.67 kB / gzip 139.51 kB |
| npm run test:e2e                          | 成功；20 项通过，桌面 10 + 移动视口 10       |
| git diff --check                          | 成功                                         |

本机 Node 26.13.0 / npm 11.20.0；CI 配置固定 Node 22.18.0。npm 给出既有 ESLint 9 支持期警告及 esbuild 安装脚本提示；未为消除提示进行不相关升级或关闭安全防护，实际构建与测试成功。

最终 E2E 运行前，新加的“恢复建议后再次保存偏好”断言曾在两视口失败：精确文本查找未包含 Toast 的“关闭”按钮文本。页面快照显示保存已成功；改为按 status 角色及消息文本匹配后完整 20 项重跑通过，未跳过断言。

## 浏览器验收证据

Playwright 使用安装的 Chrome；Nutrition 固定 Asia/Shanghai 与合成时间/数据。单元测试在 America/New_York 运行；纯日期测试覆盖跨日、本地日期与 UTC 创建日期分离、月份/闰日。

- 从添加对话框创建 120 kcal、蛋白质 10g、碳水 20g、脂肪 5g /100g 的合成食品；午餐 150g 得 180kcal、15/30/7.5g；双击只写一条。
- 晚餐另加 80kcal，日合计 260kcal；未知蛋白标明部分已知。
- 食品库改名、改为 500kcal 不影响旧记录；目标 2000kcal 显示 13%。
- 午餐改为 100g 并移到前一天早餐为 120kcal；当天剩 80kcal；删除前一天记录后两天统计正确。
- 删除晚餐食品仍保留 80kcal 历史；自建食品归档/恢复；刷新仍有原记录/目标与 4% 进度。
- 两主题及两文案模式一致；移动视口无水平溢出。截图人工检查了桌面与移动布局。
- 设置纯植物/大豆忌口过滤组合，隐藏建议刷新仍隐藏，恢复后可继续保存偏好；估算器仅经主动草稿/保存生效，孕期/未成年阻止计算，目标可清空。
- 注入 QuotaExceededError 时没有半条记录或敏感错误内容；刷新后重试成功。注入读取错误时显示错误界面，不伪造 0 统计。
- 已加载页面断网后切换 Training 与 Nutrition，仍能读取本地数据；原 Habits 与 Training 浏览器流程回归通过。
- 主流程断言无个人数据 fetch/XHR/WebSocket/非 GET/外部请求及页面错误。仅在隔离 Playwright 上下文阻断已知 Kaspersky 注入域，未修改系统防护配置。

## 已知限制与验收边界

- 未配置 Service Worker：离线冷启动和重新打开页面不作可用承诺；未验收真实手机或 Safari。
- 目录仅六种特定食品，不覆盖完整中文食品库；自建食品准确性依赖用户标签输入。未知始终透明，不补造数值。
- 估算器为可选成人粗略估算，不代表全年龄/健康状态有效性；活动系数为假设，非测量，且不自动生成减重处方。
- 大量历史记录的性能未专项验收；当前读取本地集合聚合。备份/导入、复杂膳食计划、在线搜索/条码识别均不在本轮。
- 无未解决的已知测试失败或迁移阻塞。上述范围限制保留供审查；完成 Phase 1C 后停止，不进入下一阶段。
