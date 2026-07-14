import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { Strikethrough } from '@lezer/markdown';
import { describe, expect, it } from 'vitest';
import { createEditor } from '../../src/editor/create-editor';
import { collectLivePreviewRanges } from '../../src/editor/live-preview/live-preview';

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function fixture(targetBytes: number): string {
  const unit =
    '## Heading\n\nText with **bold**, *italic*, ~~deleted~~, `code`, and [link](url).\n\n- item\n\n';
  return unit.repeat(Math.ceil(targetBytes / unit.length)).slice(0, targetBytes);
}

function measure(documentText: string, samples = 100) {
  const state = EditorState.create({
    doc: documentText,
    selection: EditorSelection.cursor(documentText.length),
    extensions: [markdown({ extensions: [Strikethrough] })],
  });
  const timings: number[] = [];
  let visitedNodes = 0;

  for (let index = 0; index < samples; index += 1) {
    const start = performance.now();
    const build = collectLivePreviewRanges(state, [{ from: 0, to: 2_000 }]);
    timings.push(performance.now() - start);
    visitedNodes = build.visitedNodes;
  }

  return {
    p50: percentile(timings, 0.5),
    p95: percentile(timings, 0.95),
    p99: percentile(timings, 0.99),
    visitedNodes,
  };
}

describe('phase 1 visible decoration baseline', () => {
  it.each([
    ['basic', 32 * 1024],
    ['medium', 1024 * 1024],
  ])('%s document decoration work stays within the visible range', (name, bytes) => {
    const result = measure(fixture(bytes));
    console.info(`LIVE_PREVIEW ${name} ${JSON.stringify(result)}`);

    expect(result.p95).toBeLessThan(8);
    expect(result.visitedNodes).toBeLessThan(1_000);
  });

  it.each([
    ['basic', 32 * 1024, 8],
    ['medium', 1024 * 1024, 16.7],
  ])('%s full editor updates stay within the synthetic input gate', (name, bytes, gate) => {
    const host = document.createElement('div');
    document.body.append(host);
    const session = createEditor(host, fixture(bytes));
    const timings: number[] = [];

    for (let index = 0; index < 100; index += 1) {
      const start = performance.now();
      session.view.dispatch({
        changes: { from: session.view.state.doc.length, insert: 'x' },
        userEvent: 'input.type',
      });
      timings.push(performance.now() - start);
    }

    const result = {
      p50: percentile(timings, 0.5),
      p95: percentile(timings, 0.95),
      p99: percentile(timings, 0.99),
    };
    console.info(`LIVE_PREVIEW_INPUT ${name} ${JSON.stringify(result)}`);
    session.destroy();
    host.remove();

    expect(result.p95).toBeLessThan(gate);
  });
});
