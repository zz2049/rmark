import type { EditorView } from '@codemirror/view';

export interface EditorSession {
  readonly view: EditorView;
  destroy(): void;
}
