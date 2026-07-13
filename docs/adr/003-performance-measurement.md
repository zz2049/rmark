# ADR 003：性能测量方法

- 状态：已接受
- 日期：2026-07-13
- 阶段：0

## 决策

采用两层可重复测量：

1. Vitest 中的合成事务基准，快速捕获 CodeMirror/Lezer 增量事务回归。
2. 生产前端构建中的浏览器交互基准，使用 `Transaction.time` 到下一次 `requestAnimationFrame` 的耗时观察输入到帧的尾延迟。

测量器仅在开发模式或显式 `?perf=1` 时启用：

- 只有 `docChanged` 才请求一次动画帧；同一帧内的后续事务合并到当前待处理帧。
- 不使用 `setInterval`，空闲时没有采样唤醒。
- 两类样本各最多保留 500 个。
- 编辑器销毁时取消待处理帧并删除测试报告节点。
- `?perf=1&bytes=N` 可生成 0 到 10 MiB 的确定性 ASCII Markdown 基准文档，不进行网络或磁盘读取。

## 指标解释

- `inputToFrameMs`：CodeMirror 事务时间戳到下一浏览器帧回调的墙钟毫秒数。多个事务在同一帧内会合并，因此样本数可能少于输入字符数。
- `transactionCallbackMs`：项目 update listener 自身的同步耗时；浏览器时间精度不足时可能显示 0 ms。
- `startupMarks`：脚本 bootstrap 与编辑器挂载完成的 `performance.now()` 标记。

合成基准不等于 WebView 输入延迟，浏览器生产构建也不等于 macOS Energy Log。报告必须分别标注，禁止混用。

## 固定夹具

`npm run fixtures` 从确定性模板生成 `basic.md`、`medium.md`、`large.md`、`pathological.md`、`widgets.md` 和 `ime.md`。生成文件不提交仓库，避免大文件膨胀；生成器本身纳入版本控制。
