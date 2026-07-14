# 阶段 0 检查点

- 日期：2026-07-14
- 状态：阶段 0 已通过；2026-07-14 已确认采用分层 CPU 门禁

## 修改文件

- 前端工程：`package.json`、Vite/Svelte/TypeScript 配置、`index.html`
- 应用壳：`src/app/App.svelte`、`src/app/app.css`
- 编辑内核：`src/editor/create-editor.ts`、`editor-session.ts`
- 测量与日志：`src/editor/performance/performance-sampler.ts`、`src/logging/logger.ts`
- Tauri/Rust：`src-tauri/Cargo.toml`、`build.rs`、Tauri 配置、capability、`src/*.rs`
- 测试与夹具：`tests/**`、`scripts/generate-fixtures.mjs`
- 决策与报告：`docs/adr/**`、`docs/performance/phase-0-baseline.md`

## 完成能力

- Tauri v2 + Svelte + TypeScript strict + Vite 单窗口工程。
- CodeMirror 6 Markdown 源码编辑，支持选区、粘贴、撤销、重做和行折叠等基础编辑行为。
- 文档仅由 `EditorState.doc` 持有；Svelte 不镜像全文；输入不经过 Rust IPC。
- 开发/生产分级的 TypeScript 与 Rust 错误日志。
- 确定性夹具生成器、Vitest 合成基准和显式开启的事件驱动浏览器采样器。
- 最小 CSP 与 Tauri capability；未启用文件、Shell、网络等额外权限。

## 测试结果

- `npm test`：2 个测试文件、7 个测试全部通过。
- 浏览器生产构建：中文/Emoji/Markdown 文本输入正常，控制台无 error/warn；100 字符输入后撤销为 99、重做恢复为 100。
- `cargo test`：2 个 Rust 单测通过。
- `svelte-check`：0 error、0 warning。
- Prettier、rustfmt 均通过。
- `cargo clippy --all-targets -- -D warnings` 通过。
- `npm run tauri -- build --bundles app` 成功，Release 产物和 macOS `.app` 可启动。

## 性能结果

详细方法和原始汇总见 `docs/performance/phase-0-baseline.md`。关键结果：

- 空文档输入到帧 p95 4 ms。
- 32 KiB basic p95 6 ms、p99 7 ms。
- 1 MiB medium p95 8 ms、p99 25 ms。
- 60 秒静置期间测量状态没有变化，无项目代码重复采样。
- 启动后不聚焦编辑器的前台进程组平均约 0.018%，后台无持续活动。
- 点击编辑器后的前台聚焦进程组平均约 2.51%；相比原实现约 4.31% 下降约 42%，但仍高于不区分焦点状态的 0.5% 初始目标。

## 遗留问题

- Instruments 已将聚焦态剩余成本归因到 WebKit 原生光标动画、渲染提交和 GPU 合成。继续压低需要改变光标体验；进入阶段 1 前应确认是否采用分层门禁。
- 自动化环境只能注入 Unicode 文本，不能完整验证 macOS 原生 IME 候选窗交互。
- 前端单 chunk 626.71 kB（gzip 216.66 kB），当前不影响门禁，但需持续监控。
- 阶段 0 使用构建时生成的纯色开发图标；正式品牌图标不属于本阶段。

## 下一阶段风险

- 实时隐藏标记若遍历全文或在 composition 中修改范围，会破坏当前延迟与 IME 行为。
- Decorations 必须限制到可视区域，并保留激活源码区的正确映射。
- `medium` 的 25 ms 尾部样本需要在阶段 1 对比，防止装饰构建放大。

阶段 0 已确认采用“未聚焦前台 ≤0.5%，聚焦态以 WebKit 平台基线监控应用增量”的分层门禁，阶段 1 已获准开始。
