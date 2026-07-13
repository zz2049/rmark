import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import type { EditorSession } from './editor-session';
import { createPerformanceSampler } from './performance/performance-sampler';

const initialDocument = `# 欢迎使用 RMark

这是阶段 0 的 Markdown 编辑器骨架。

- 文档由 CodeMirror EditorState 持有
- 输入路径不经过 Rust IPC
- 当前阶段仅显示 Markdown 源码
`;

function benchmarkDocument(): string | undefined {
  const query = new URLSearchParams(globalThis.location?.search ?? '');
  if (!query.has('perf')) return undefined;
  const requestedBytes = Number(query.get('bytes'));
  if (
    !Number.isInteger(requestedBytes) ||
    requestedBytes < 0 ||
    requestedBytes > 10 * 1024 * 1024
  ) {
    return undefined;
  }
  const unit = '## Benchmark paragraph\n\nMarkdown **bold** [link](https://example.test).\n\n';
  return unit.repeat(Math.ceil(requestedBytes / unit.length)).slice(0, requestedBytes);
}

export function createEditor(
  parent: HTMLElement,
  doc = benchmarkDocument() ?? initialDocument,
): EditorSession {
  const performanceSampler = createPerformanceSampler();
  const state = EditorState.create({
    doc,
    extensions: [
      basicSetup,
      markdown(),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      performanceSampler.extension,
    ],
  });
  const view = new EditorView({ state, parent });

  view.focus();

  return {
    view,
    destroy() {
      performanceSampler.destroy();
      view.destroy();
    },
  };
}
