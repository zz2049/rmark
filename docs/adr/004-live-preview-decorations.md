# ADR 004：基础 Live Preview 使用视口内 Lezer Decorations

- 状态：接受
- 日期：2026-07-14

## 决策

基础 Live Preview 直接读取 CodeMirror Markdown language support 提供的 Lezer 增量语法树，只在 `EditorView.visibleRanges` 内构建 Decorations：

- `Decoration.mark` 负责标题、强调、删除线、行内代码、链接、引用和列表内容样式；
- `Decoration.replace` 隐藏已解析的 Markdown 标记，列表和引用标记由轻量 `WidgetType` 替换；
- 当前多选区触及的行保留原始源码标记；
- composition 期间仅通过 `ChangeSet` 映射已有装饰，不重建当前组合区域；`compositionend` 后通过一次事件驱动的空事务刷新；
- 仅在文档、选区、视口或语法树状态变化时重建，不创建轮询、持续动画或第二份文档模型。

复制、粘贴、撤销和保存路径仍以 `EditorState.doc` 中的原始 Markdown 为准，装饰不改变文档内容，也不直接修改 CodeMirror 管理的 DOM。

## 依赖记录

新增直接依赖 `@lezer/markdown`，仅用于启用其 `Strikethrough` parser extension。该包此前已由 `@codemirror/lang-markdown` 间接安装，本次只是将实际使用关系声明为直接依赖。

- 用途：解析 GFM 删除线节点；
- 包体影响：阶段 1 完整功能相对阶段 0 的前端 minified 产物增加约 3.76 kB，包含 Live Preview 代码和样式，不是新增一套解析器；
- 运行时影响：沿用 CodeMirror 已有增量 Markdown parser；
- 替代方案：正则扫描会违反语法树约束，并容易在未闭合输入和嵌套语法中误判，因此拒绝；
- 懒加载：删除线属于首屏核心编辑能力，且包已是 Markdown language support 的组成部分，不额外懒加载。

## 后果

装饰工作量由可见语法节点数决定，而不是全文长度。复杂块渲染、文件 I/O、Worker 和 Rust IPC 不进入本阶段。原生 IME 候选窗仍需人工门禁验证，自动化只覆盖 composition 事件和 Unicode 文本正确性。
