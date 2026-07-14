import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { Strikethrough } from '@lezer/markdown';
import { describe, expect, it } from 'vitest';
import {
  collectLivePreviewRanges,
  type PreviewRange,
} from '../../src/editor/live-preview/live-preview';

function preview(doc: string, selection = doc.length, from = 0, to = doc.length) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(selection),
    extensions: [markdown({ extensions: [Strikethrough] })],
  });
  return { state, build: collectLivePreviewRanges(state, [{ from, to }]) };
}

function sources(state: EditorState, ranges: readonly PreviewRange[], kind: PreviewRange['kind']) {
  return ranges
    .filter((range) => range.kind === kind)
    .map((range) => state.sliceDoc(range.from, range.to));
}

describe('live preview syntax decorations', () => {
  it('styles all six ATX heading levels', () => {
    const doc = ['# H1', '## H2', '### H3', '#### H4', '##### H5', '###### H6', '', 'plain'].join(
      '\n',
    );
    const { build } = preview(doc);
    const classes = build.ranges
      .filter((range) => range.kind === 'style')
      .map((range) => range.className);

    for (let level = 1; level <= 6; level += 1) {
      expect(classes).toContain(`cm-live-heading cm-live-heading-${level}`);
    }
  });

  it('recognizes every phase 1 syntax through the Lezer tree', () => {
    const doc = [
      '# Heading',
      '',
      '**bold** *italic* ***both*** ~~deleted~~ `code` [link](https://example.test)',
      '',
      '> quote',
      '',
      '- bullet',
      '1. ordered',
      '',
      'plain',
    ].join('\n');
    const { build } = preview(doc);
    const classes = build.ranges
      .filter((range) => range.kind === 'style')
      .map((range) => range.className);

    expect(classes).toContain('cm-live-heading cm-live-heading-1');
    expect(classes).toContain('cm-live-strong');
    expect(classes).toContain('cm-live-emphasis');
    expect(classes).toContain('cm-live-strikethrough');
    expect(classes).toContain('cm-live-inline-code');
    expect(classes).toContain('cm-live-link');
    expect(classes).toContain('cm-live-blockquote');
    expect(classes).toContain('cm-live-list-item');
    expect(build.ranges.some((range) => range.kind === 'marker' && range.label === '•')).toBe(true);
    expect(build.ranges.some((range) => range.kind === 'marker' && range.label === '1.')).toBe(
      true,
    );
  });

  it('hides parsed markers away from the selection and reveals the active line', () => {
    const doc = '**bold** and [link](url)\n\nplain';
    const inactive = preview(doc);
    expect(sources(inactive.state, inactive.build.ranges, 'replace')).toEqual(
      expect.arrayContaining(['**', '[', '](url)']),
    );

    const active = preview(doc, 3);
    const hiddenOnFirstLine = active.build.ranges.filter(
      (range) => range.kind !== 'style' && range.from < doc.indexOf('\n'),
    );
    expect(hiddenOnFirstLine).toHaveLength(0);
  });

  it('reveals source for every line touched by multiple selections', () => {
    const doc = '**first**\n\n*second*\n\nplain';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.create([
        EditorSelection.cursor(doc.indexOf('first')),
        EditorSelection.cursor(doc.indexOf('second')),
      ]),
      extensions: [
        EditorState.allowMultipleSelections.of(true),
        markdown({ extensions: [Strikethrough] }),
      ],
    });
    const build = collectLivePreviewRanges(state, [{ from: 0, to: doc.length }]);

    expect(sources(state, build.ranges, 'replace')).toHaveLength(0);
  });

  it('does not invent decorations for incomplete inline syntax', () => {
    const doc = '**open `code [link](\n\nplain';
    const { state, build } = preview(doc);
    expect(sources(state, build.ranges, 'replace')).toHaveLength(0);
  });

  it('visits only the requested visible range for long documents', () => {
    const paragraph = '## Heading\n\nText with **bold** and [link](url).\n\n';
    const small = preview(paragraph.repeat(20), paragraph.repeat(20).length, 0, 300).build;
    const largeDocument = paragraph.repeat(20_000);
    const large = preview(largeDocument, largeDocument.length, 0, 300).build;

    expect(large.visitedNodes).toBeLessThanOrEqual(small.visitedNodes + 2);
    expect(large.ranges.every((range) => range.from <= 300)).toBe(true);
  });
});
