import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  crosshairCursor,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import type { EditorSession } from './editor-session';
import { createPerformanceSampler } from './performance/performance-sampler';

// Keep basicSetup's editing behavior, but use the browser's native selection and
// caret. CodeMirror's drawSelection extension adds another blink animation that
// keeps WKWebView rendering while the document is otherwise idle.
const editorSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    indentWithTab,
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

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
    extensions: [editorSetup, markdown(), EditorView.lineWrapping, performanceSampler.extension],
  });
  const view = new EditorView({ state, parent });

  return {
    view,
    destroy() {
      performanceSampler.destroy();
      view.destroy();
    },
  };
}
