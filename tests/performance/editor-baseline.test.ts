import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function makeDocument(targetBytes: number): string {
  const paragraph =
    '## 性能夹具\n\nMarkdown paragraph with **bold**, [link](https://example.test), and 中文。\n\n';
  return paragraph
    .repeat(Math.ceil(targetBytes / Buffer.byteLength(paragraph)))
    .slice(0, targetBytes);
}

function measureTransactions(
  documentText: string,
  samples = 200,
): { p50: number; p95: number; p99: number } {
  let state = EditorState.create({ doc: documentText, extensions: [markdown()] });
  const timings: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const start = performance.now();
    const transaction = state.update({ changes: { from: state.doc.length, insert: 'x' } });
    state = transaction.state;
    timings.push(performance.now() - start);
  }

  return {
    p50: percentile(timings, 0.5),
    p95: percentile(timings, 0.95),
    p99: percentile(timings, 0.99),
  };
}

describe('phase 0 synthetic transaction baseline', () => {
  it.each([
    ['empty', 0],
    ['basic', 32 * 1024],
    ['medium', 1024 * 1024],
  ])('%s document remains measurable', (name, bytes) => {
    const result = measureTransactions(makeDocument(bytes));
    console.info(`BASELINE ${name} ${JSON.stringify(result)}`);
    expect(result.p99).toBeLessThan(100);
  });
});
