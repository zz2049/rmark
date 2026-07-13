import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputDirectory = resolve('tests/fixtures/generated');

const sections = [
  '# 可重复性能测试文档\n\n',
  '普通段落包含 **粗体**、*斜体*、~~删除线~~ 与 [链接](https://example.test)。\n\n',
  '> 引用内容用于覆盖 Markdown 块结构。\n\n',
  '- 列表项目一\n- 列表项目二\n  - 嵌套项目\n\n',
  '```ts\nconst answer: number = 42;\n```\n\n',
];

function repeatedFixture(targetBytes) {
  const unit = sections.join('');
  const repetitions = Math.ceil(targetBytes / Buffer.byteLength(unit));
  const result = unit.repeat(repetitions);
  return Buffer.from(result).subarray(0, targetBytes).toString('utf8');
}

function pathologicalFixture(targetBytes) {
  const unit = `${'  '.repeat(16)}- deeply nested item\n${'x'.repeat(4096)}\n\n\`\`\`html\n<div>unclosed\n`;
  return unit.repeat(Math.ceil(targetBytes / Buffer.byteLength(unit))).slice(0, targetBytes);
}

async function writeFixture(name, content) {
  const path = resolve(outputDirectory, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  console.info(`${name}: ${Buffer.byteLength(content)} bytes`);
}

await Promise.all([
  writeFixture('basic.md', repeatedFixture(32 * 1024)),
  writeFixture('medium.md', repeatedFixture(1024 * 1024)),
  writeFixture('large.md', repeatedFixture(10 * 1024 * 1024)),
  writeFixture('pathological.md', pathologicalFixture(2 * 1024 * 1024)),
  writeFixture('widgets.md', repeatedFixture(128 * 1024)),
  writeFixture('ime.md', '# IME\n\n中文输入\n日本語入力\n👩🏽‍💻 e\u0301\nمرحبا بالعالم\n'),
]);
