# ADR 002：输入路径与 IPC 边界

- 状态：已接受
- 日期：2026-07-13
- 阶段：0

## 背景

输入主路径若包含 Rust IPC、磁盘访问或全文 Markdown 转换，会放大序列化成本并增加尾延迟。

## 决策

阶段 0 输入路径固定为：

```text
DOM 输入 / IME composition
  → CodeMirror Transaction
  → Lezer 增量 Markdown 语法树
  → CodeMirror View 更新
  → 浏览器下一帧
```

Tauri `Builder` 不注册任何 invoke command。Rust 只负责启动窗口和统一错误日志。编辑器扩展不导入 `@tauri-apps/api`，输入监听器不执行磁盘、网络或 Rust 调用。

## 后果

- Rust 测试明确记录阶段 0 没有输入 IPC command。
- 后续打开、保存等命令必须由离散用户动作触发，不能复用为按键同步通道。
- 实时标记隐藏、复杂块渲染等阶段 1 之后的能力不得改变这条边界。

## 组合输入

阶段 0 没有拦截 `compositionstart`、`compositionupdate` 或 `compositionend`，也不在更新监听器中修改文档或选区。CodeMirror 原生管理组合状态。自动化测试覆盖中文、日文、Emoji、组合字符和 RTL 文本；原生输入法候选窗行为仍需在正式 macOS 应用上人工回归。
