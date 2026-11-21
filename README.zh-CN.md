# JerkLog

Habits · Training · Nutrition。面向成年用户的本地优先应用。

**本分支仅执行 Phase 0：项目初始化。等待 Draft PR 审查。**

## 启动与验证

需要 Node.js >=22.18 与 npm，CI 使用 Node 22.18.0。在项目根目录运行：

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

可选浏览器验证：先构建，再运行 `npm run test:e2e`。需要本机安装 Google Chrome。脚本自动管理 4173 端口的 Vite 预览，覆盖桌面和移动视口，不代表手机真机或 Safari 验证。

## 已实现

- React + TypeScript strict + Vite、React Router HashRouter、ESLint、Prettier、Vitest，依赖使用精确版本与 lockfile。
- 总览、习惯、训练、饮食、设置五个基础页面，桌面侧栏、移动底栏、键盘焦点与跳转到内容。
- 默认深色，支持亮色与系统主题，主题偏好保存到 IndexedDB。
- 三个业务模块明确显示占位状态；记录、训练和添加食物按钮暂不可用。总览统计使用 —，不伪造数字。
- Dexie schema v1：九张计划中的基础表、类型接口、迁移扩展说明，不预置私人记录，不清空已有数据。
- 预留 humorMode 字段和文案接口，本阶段不提供整活切换或业务健康推断。
- 基础单元测试与 GitHub Actions CI；只读权限、npm ci、lint/typecheck/test/build，不部署、不发布。

目录结构见 [英文 README](README.md)，数据架构见 [架构文档](docs/ARCHITECTURE.md)。沿用 main 已有 MIT LICENSE，不改动现有版权声明。

## 隐私与边界

本阶段仅写入主题偏好。无账号、云端服务、遥测、广告、分析或错误上报 SDK。本地存储不等于加密，清除浏览器数据可能丢失偏好。仅作成年用户自我管理，不替代医疗建议；不根据习惯推导健康、营养或训练结论。

Phase 1 的习惯 CRUD、训练保存、饮食计算均未纳入本分支。模板、食品库、备份、导入、离线冷启动、部署和 Release 留待后续阶段。

## 环境说明

本机 Windows 沙箱限制 esbuild 探测父目录，脚本采用 Node 原生 TypeScript 配置加载。开发服务依赖预打包可能仍需获批在沙箱外执行；普通本机终端直接运行 npm run dev 即可。npm 缓存位于忽略的 .npm-cache 中，避免 npm ci 删除 node_modules 时连带移除正在使用的缓存。

本机 Kaspersky 会向 HTTP 响应注入脚本。浏览器测试在隔离上下文中阻断明确识别的注入域名后，检查其余应用请求；不修改系统安全软件设置。该检查不保证系统软件或扩展自身不会联网。

## 下一阶段建议

验收后再单独实施 Phase 1：首先实现 Habits 的新增、补录、撤销与本地日期统计，再加入单组训练事务写入、食品营养快照与基础数据闭环测试。保留当前 schema 版本，不通过清空数据库迁移。
