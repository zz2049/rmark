import { Transaction } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';

const MAX_SAMPLES = 500;
const query = new URLSearchParams(globalThis.location?.search ?? '');
const reportEnabled = query.has('perf');
const enabled = import.meta.env.DEV || reportEnabled;
const REPORT_ELEMENT_ID = 'rmark-performance-report';

export interface PerformanceSnapshot {
  readonly decorationBuildMs: readonly number[];
  readonly inputToFrameMs: readonly number[];
  readonly transactionCallbackMs: readonly number[];
  readonly startupMarks: Readonly<Record<string, number>>;
}

declare global {
  interface Window {
    __RMARK_PERFORMANCE__?: {
      snapshot(): PerformanceSnapshot;
      reset(): void;
    };
  }
}

const inputToFrameMs: number[] = [];
const transactionCallbackMs: number[] = [];
const decorationBuildMs: number[] = [];
const startupMarks: Record<string, number> = {};

function reportSnapshot(): void {
  if (!reportEnabled || typeof document === 'undefined') return;
  let output = document.getElementById(REPORT_ELEMENT_ID);
  if (!output) {
    output = document.createElement('output');
    output.id = REPORT_ELEMENT_ID;
    output.hidden = true;
    document.body.append(output);
  }
  output.textContent = JSON.stringify(snapshot());
}

function pushBounded(target: number[], value: number): void {
  target.push(value);
  if (target.length > MAX_SAMPLES) target.splice(0, target.length - MAX_SAMPLES);
}

export function markStartup(name: string): void {
  if (!enabled) return;
  startupMarks[name] = performance.now();
  reportSnapshot();
}

function snapshot(): PerformanceSnapshot {
  return {
    decorationBuildMs: [...decorationBuildMs],
    inputToFrameMs: [...inputToFrameMs],
    transactionCallbackMs: [...transactionCallbackMs],
    startupMarks: { ...startupMarks },
  };
}

function reset(): void {
  decorationBuildMs.length = 0;
  inputToFrameMs.length = 0;
  transactionCallbackMs.length = 0;
}

export function recordDecorationBuild(durationMs: number): void {
  if (!enabled) return;
  pushBounded(decorationBuildMs, durationMs);
}

if (enabled && typeof window !== 'undefined') {
  window.__RMARK_PERFORMANCE__ = { snapshot, reset };
}

export function createPerformanceSampler(): {
  extension: ReturnType<typeof EditorView.updateListener.of>;
  destroy(): void;
} {
  let pendingFrame: number | undefined;

  const extension = EditorView.updateListener.of((update: ViewUpdate) => {
    if (!enabled || !update.docChanged) return;

    const callbackStart = performance.now();
    const transactionTime = update.transactions[0]?.annotation(Transaction.time) ?? Date.now();
    pushBounded(transactionCallbackMs, performance.now() - callbackStart);

    if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      pushBounded(inputToFrameMs, Date.now() - transactionTime);
      reportSnapshot();
      pendingFrame = undefined;
    });
  });

  return {
    extension,
    destroy() {
      if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
      pendingFrame = undefined;
      if (reportEnabled) document.getElementById(REPORT_ELEMENT_ID)?.remove();
    },
  };
}
