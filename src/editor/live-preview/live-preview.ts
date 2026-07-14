import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  type DecorationSet,
  type ViewUpdate,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import { recordDecorationBuild } from '../performance/performance-sampler';

export interface VisibleRange {
  readonly from: number;
  readonly to: number;
}

export type PreviewRange =
  | {
      readonly kind: 'style';
      readonly from: number;
      readonly to: number;
      readonly className: string;
    }
  | {
      readonly kind: 'replace';
      readonly from: number;
      readonly to: number;
    }
  | {
      readonly kind: 'marker';
      readonly from: number;
      readonly to: number;
      readonly label: string;
      readonly className: string;
    };

export interface PreviewBuild {
  readonly ranges: readonly PreviewRange[];
  readonly visitedNodes: number;
}

const styleClasses: Readonly<Record<string, string>> = {
  ATXHeading1: 'cm-live-heading cm-live-heading-1',
  ATXHeading2: 'cm-live-heading cm-live-heading-2',
  ATXHeading3: 'cm-live-heading cm-live-heading-3',
  ATXHeading4: 'cm-live-heading cm-live-heading-4',
  ATXHeading5: 'cm-live-heading cm-live-heading-5',
  ATXHeading6: 'cm-live-heading cm-live-heading-6',
  SetextHeading1: 'cm-live-heading cm-live-heading-1',
  SetextHeading2: 'cm-live-heading cm-live-heading-2',
  StrongEmphasis: 'cm-live-strong',
  Emphasis: 'cm-live-emphasis',
  Strikethrough: 'cm-live-strikethrough',
  InlineCode: 'cm-live-inline-code',
  Link: 'cm-live-link',
  Blockquote: 'cm-live-blockquote',
  ListItem: 'cm-live-list-item',
};

const hiddenMarkNodes = new Set(['CodeMark', 'EmphasisMark', 'HeaderMark', 'StrikethroughMark']);

function activeLineRanges(state: EditorState): readonly VisibleRange[] {
  const lines: VisibleRange[] = [];
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from);
    const last = state.doc.lineAt(range.to);
    lines.push({ from: first.from, to: last.to });
  }
  return lines;
}

function intersects(left: VisibleRange, from: number, to: number): boolean {
  return from <= left.to && to >= left.from;
}

function sourceIsVisible(activeLines: readonly VisibleRange[], from: number, to: number): boolean {
  return activeLines.some((line) => intersects(line, from, to));
}

function markerLabel(nodeName: string, source: string): { label: string; className: string } {
  if (nodeName === 'QuoteMark') {
    return { label: '│', className: 'cm-live-quote-marker' };
  }
  if (/^\d+[.)]$/.test(source)) {
    return { label: source, className: 'cm-live-list-marker cm-live-list-marker-ordered' };
  }
  return { label: '•', className: 'cm-live-list-marker' };
}

export function collectLivePreviewRanges(
  state: EditorState,
  visibleRanges: readonly VisibleRange[],
): PreviewBuild {
  const ranges: PreviewRange[] = [];
  const seen = new Set<string>();
  const activeLines = activeLineRanges(state);
  let visitedNodes = 0;

  const add = (range: PreviewRange): void => {
    if (range.from >= range.to) return;
    const discriminator =
      range.kind === 'style'
        ? range.className
        : range.kind === 'marker'
          ? `${range.className}:${range.label}`
          : range.kind;
    const key = `${range.from}:${range.to}:${discriminator}`;
    if (seen.has(key)) return;
    seen.add(key);
    ranges.push(range);
  };

  const tree = syntaxTree(state);
  for (const visible of visibleRanges) {
    tree.iterate({
      from: visible.from,
      to: visible.to,
      enter(node) {
        visitedNodes += 1;
        const completeInlineLink = node.name !== 'Link' || node.node.getChild('URL') !== null;
        const className = completeInlineLink ? styleClasses[node.name] : undefined;
        if (className) {
          add({
            kind: 'style',
            from: Math.max(node.from, visible.from),
            to: Math.min(node.to, visible.to),
            className,
          });
        }

        if (sourceIsVisible(activeLines, node.from, node.to)) return;
        if (node.name === 'Link' && completeInlineLink) {
          const cursor = node.node.cursor();
          const marks: VisibleRange[] = [];
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'LinkMark') marks.push({ from: cursor.from, to: cursor.to });
            } while (cursor.nextSibling());
          }
          const openingMark = marks[0];
          const closingLabelMark = marks[1];
          if (openingMark) add({ kind: 'replace', ...openingMark });
          if (closingLabelMark) {
            add({ kind: 'replace', from: closingLabelMark.from, to: node.to });
          }
          return;
        }
        if (hiddenMarkNodes.has(node.name)) {
          add({ kind: 'replace', from: node.from, to: node.to });
          return;
        }
        if (node.name === 'ListMark' || node.name === 'QuoteMark') {
          const marker = markerLabel(node.name, state.sliceDoc(node.from, node.to));
          add({ kind: 'marker', from: node.from, to: node.to, ...marker });
        }
      },
    });
  }

  return { ranges, visitedNodes };
}

class PreviewMarkerWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly className: string,
  ) {
    super();
  }

  eq(other: PreviewMarkerWidget): boolean {
    return this.label === other.label && this.className === other.className;
  }

  toDOM(): HTMLElement {
    const marker = document.createElement('span');
    marker.className = this.className;
    marker.textContent = this.label;
    marker.setAttribute('aria-hidden', 'true');
    return marker;
  }
}

function toDecorations(build: PreviewBuild): DecorationSet {
  return Decoration.set(
    build.ranges.map((range) => {
      if (range.kind === 'style') {
        return Decoration.mark({ class: range.className }).range(range.from, range.to);
      }
      if (range.kind === 'marker') {
        return Decoration.replace({
          widget: new PreviewMarkerWidget(range.label, range.className),
        }).range(range.from, range.to);
      }
      return Decoration.replace({}).range(range.from, range.to);
    }),
    true,
  );
}

function buildDecorations(view: EditorView): DecorationSet {
  const startMark = 'rmark-live-preview-start';
  const endMark = 'rmark-live-preview-end';
  const measureName = 'rmark-live-preview-build';
  performance.mark(startMark);
  const decorations = toDecorations(collectLivePreviewRanges(view.state, view.visibleRanges));
  performance.mark(endMark);
  const measure = performance.measure(measureName, startMark, endMark);
  recordDecorationBuild(measure.duration);
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);
  return decorations;
}

class LivePreviewPlugin {
  decorations: DecorationSet;
  private composing: boolean;
  private destroyed = false;
  private tree: ReturnType<typeof syntaxTree>;

  constructor(private readonly view: EditorView) {
    this.decorations = buildDecorations(view);
    this.composing = view.compositionStarted;
    this.tree = syntaxTree(view.state);
  }

  update(update: ViewUpdate): void {
    const composing = update.view.composing || update.view.compositionStarted;
    if (composing) {
      if (update.docChanged) this.decorations = this.decorations.map(update.changes);
      this.composing = true;
      this.tree = syntaxTree(update.state);
      return;
    }

    const nextTree = syntaxTree(update.state);
    const parserAdvanced = nextTree !== this.tree;
    if (
      this.composing ||
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      parserAdvanced
    ) {
      this.decorations = buildDecorations(update.view);
    }
    this.composing = false;
    this.tree = nextTree;
  }

  finishComposition(view: EditorView): void {
    queueMicrotask(() => {
      if (!this.destroyed) view.dispatch({});
    });
  }

  destroy(): void {
    this.destroyed = true;
  }
}

export const livePreview = ViewPlugin.fromClass(LivePreviewPlugin, {
  decorations: (plugin) => plugin.decorations,
  eventObservers: {
    compositionend(_event, view) {
      this.finishComposition(view);
    },
  },
});
