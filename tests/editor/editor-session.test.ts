import { afterEach, describe, expect, it } from 'vitest';
import { redo, undo } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { createEditor } from '../../src/editor/create-editor';
import type { EditorSession } from '../../src/editor/editor-session';

describe('editor session', () => {
  let session: EditorSession | undefined;

  afterEach(() => {
    session?.destroy();
    session = undefined;
    document.body.replaceChildren();
  });

  function mount(doc = ''): EditorSession {
    const host = document.createElement('div');
    document.body.append(host);
    session = createEditor(host, doc);
    return session;
  }

  it('edits, selects, undoes, and redoes without an application state mirror', () => {
    const { view } = mount('hello');
    view.dispatch({
      changes: { from: 5, insert: ' world' },
      selection: EditorSelection.range(0, 5),
      userEvent: 'input.type',
    });

    expect(view.state.doc.toString()).toBe('hello world');
    expect(view.state.selection.main.from).toBe(0);
    expect(view.state.selection.main.to).toBe(5);
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('hello');
    expect(redo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe('hello world');
  });

  it('accepts pasted-style Unicode, CJK, emoji, combining, and RTL text', () => {
    const { view } = mount();
    const text = '中文输入 日本語 👩🏽‍💻 e\u0301 مرحبا';
    view.dispatch({ changes: { from: 0, insert: text }, userEvent: 'input.paste' });
    expect(view.state.doc.toString()).toBe(text);
  });

  it('mounts Markdown language support', () => {
    const { view } = mount('# heading\n\n**strong**');
    expect(view.state.doc.lines).toBe(3);
    expect(view.dom.querySelector('.cm-content')).not.toBeNull();
  });

  it('waits for explicit user interaction before taking focus', () => {
    const { view } = mount();

    expect(view.hasFocus).toBe(false);
  });

  it('reveals source markers on the active line without changing the document', () => {
    const doc = '**bold** and [link](url)\n\nplain';
    const { view } = mount(doc);
    const plainPosition = doc.indexOf('plain');
    view.dispatch({ selection: EditorSelection.cursor(plainPosition) });

    expect(view.contentDOM.textContent).not.toContain('**');
    expect(view.contentDOM.textContent).not.toContain('(url)');
    expect(view.state.doc.toString()).toBe(doc);

    view.dispatch({ selection: EditorSelection.cursor(3) });
    expect(view.contentDOM.textContent).toContain('**bold**');
    expect(view.contentDOM.textContent).toContain('[link](url)');
    expect(view.state.doc.toString()).toBe(doc);
  });

  it('keeps raw Markdown through rapid edits, undo, and redo', () => {
    const { view } = mount('**bold**');
    for (let index = 0; index < 50; index += 1) {
      view.dispatch({ changes: { from: view.state.doc.length, insert: String(index % 10) } });
    }

    const edited = view.state.doc.toString();
    expect(edited.startsWith('**bold**')).toBe(true);
    expect(undo(view)).toBe(true);
    expect(redo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(edited);
  });

  it('freezes marker rebuilding during composition and refreshes after it ends', async () => {
    const doc = '**bold**\n\nplain';
    const { view } = mount(doc);
    const plainPosition = doc.indexOf('plain');
    view.dispatch({ selection: EditorSelection.cursor(plainPosition) });
    expect(view.contentDOM.textContent).not.toContain('**');

    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    view.dispatch({ selection: EditorSelection.cursor(3) });
    expect(view.contentDOM.textContent).not.toContain('**');

    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { data: '' }));
    await Promise.resolve();
    expect(view.contentDOM.textContent).toContain('**bold**');
    expect(view.state.doc.toString()).toBe(doc);
  });
});
