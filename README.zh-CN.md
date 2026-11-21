# JerkLog

Habits · Training · Nutrition。面向成年用户的本地优先记录工具。

**当前仅完成 Phase 0 + Phase 1，等待验收。尚非完整 PWA。**

## 启动与验证

需要 Node.js >=22.18（本轮使用 26.13.0）与 npm。在项目根目录运行：

```sh
npm ci
npm run dev
```

在浏览器中打开终端打印的本地地址。请固定使用同一浏览器、协议、主机和端口，否则会进入不同的本地数据空间。

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

端到端测试使用本机 Google Chrome，自动启动 4173 端口的生产预览；需先构建。覆盖桌面和移动视口，移动模拟不等于 Android/iPhone 真机测试。

## 本轮功能

- 五页 HashRouter 导航：总览、习惯、训练、饮食、设置。中文文案、移动端底栏、深浅色/系统主题。
- Habits：新增、补录、编辑时间、确认删除、撤销最近一次删除、最近 50 条记录；今日、本周（周一起）、近 30 个本地自然日统计。
- Training：创建基础命名计划，自由或关联计划保存一组动作/次数/重量。每次保存建立一次已完成的单组训练，事务写入三张表。
- Nutrition：手建食品、每 100g 营养信息、来源及生熟状态；按克数/餐次录入；按所选日期显示 kcal/蛋白质/碳水/脂肪。历史保留营养及名称快照。
- Settings：专业/整活文案开关、主题选择，均保存到 IndexedDB；明确本地存储风险。

## 数据与限制

全部私人数据保存在当前浏览器 IndexedDB，无登录、后台同步、广告、分析或错误上报 SDK。本地存储不等于加密；清理浏览器或隐私浏览可能丢失记录。备份尚未实现，请勿把本版本作为唯一长期存档。

仅供自我管理，不替代医疗建议。不依据习惯次数推断身体健康、能量消耗、营养流失或训练能力。

已保存记录可刷新读取；应用资源离线缓存尚待 Phase 3，不能承诺断网冷启动。计划模板与日程、动作库、常见食物库、推荐待 Phase 2；导入导出、清空、完整 PWA 待 Phase 3；CI、部署和发布待 Phase 4。尚未设置远程仓库，未推送、合并、部署或发布。

参见 [架构](docs/ARCHITECTURE.md)、[隐私说明](docs/PRIVACY.md)、[开发总纲](JERKLOG_CODEX_PLAN.md)。MIT © 2026 KevinD。

## 本轮验证环境说明

- Node 26.13.0、npm 11.20.0、Windows、本机 Chrome；生产构建 + 桌面及 Pixel 7 移动视口 smoke。
- 四项必需检查通过；25 项单元测试、2 项浏览器流程通过；npm audit 全依赖审计为 0 项漏洞。
- 本机 Kaspersky 会向 HTTP 页面注入脚本。测试仅在隔离浏览器上下文中阻断其明确识别的注入域名，随后断言应用没有其他外部请求、XHR、fetch、WebSocket 或 POST；未修改安全软件设置。该结论不等于保证浏览器扩展或系统软件不会自行联网。
- Windows 沙箱限制 esbuild 在加载配置时探测父目录，因此运行脚本使用 Node 原生 TypeScript 配置加载（最低 Node 22.18）。开发服务依赖预打包在当前沙箱下仍需额外目录读取权限，本轮已获执行环境批准并通过真实 Chrome 启动验收；普通本机终端直接运行 npm run dev。端到端脚本自行管理 Vite 预览，避免 Windows shell 子进程回收等待。
- 已加载页面断网后可读取 IndexedDB；尚未实现或验收离线冷启动。
- 未实测 iPhone/Android 真机、Safari、Firefox；撤销仅保留当前习惯页面最近一次删除，离开页面或刷新会清除撤销缓冲。
