# 阶段 1 检查点

- 日期：2026-07-14
- 状态：功能实现和自动化门禁完成；等待原生 IME 候选窗人工回归后最终通过

## 完成能力

- 使用 Lezer Markdown 语法树识别 H1–H6、粗体、斜体、粗斜体、删除线、行内代码、普通链接、引用、有序列表和无序列表。
- 使用 `Decoration.mark` 呈现内容样式，使用 `Decoration.replace` 和轻量 marker widget 隐藏源码标记。
- 当前光标、多选区或跨行选区触及的行恢复原始 Markdown 标记。
- 装饰只扫描 `visibleRanges`；文档、选区、视口或语法树未变化时不重建。
- composition 期间冻结装饰重建并映射已有范围，结束后事件驱动刷新。
- `EditorState.doc` 始终保存原始 Markdown；复制、粘贴、撤销和重做不经过 Rust IPC。

## 验证结果

- 4 个 Vitest 文件共 20 个测试通过，覆盖全部首批语法、活动行显隐、多选区、未闭合输入、Unicode、快速编辑、撤销/重做、composition 和可见范围性能。
- Release 原生 UI 已验证所有首批语法的渲染，以及点击语法行恢复源码。
- basic 和 medium 的 2,000 字符可见范围均访问 562 个语法节点；装饰构建 p95 分别为 0.235 ms 和 0.096 ms。
- 完整编辑器合成输入 p95：basic 1.016 ms、medium 0.429 ms。
- Release 前台未聚焦 CPU 0.020%；聚焦 CPU 2.246%，未超过阶段 0 的 2.51% 平台基线。
- 生产前端 630.47 kB minified / 217.88 kB gzip。

详细测量见 `docs/performance/phase-1-baseline.md`，架构决策见 `docs/adr/004-live-preview-decorations.md`。

## 尚未关闭的门禁

- 自动化 composition 和中文/日文/Emoji/组合字符文本测试通过，但工具只能注入 Unicode 或合成 composition 事件，不能证明 macOS 原生中文 IME 候选窗的选词、提交和取消行为。
- 本轮浏览器控制运行时不可用，因此没有重新生成真实浏览器“输入到下一帧”样本；已如实保留阶段 0 数据并新增完整编辑器同步更新基线。

在原生 IME 人工回归完成前，不进入阶段 2。
