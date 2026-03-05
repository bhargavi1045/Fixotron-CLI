import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildFileContext, buildRawContext } from '../src/contextBuilder';

const writeTempFile = (dir: string, name: string, content: string): string => {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
};

const makeLines = (count: number, template = (i: number) => `const var${i} = ${i};`): string =>
  Array.from({ length: count }, (_, i) => template(i)).join('\n');

describe('contextBuilder — buildFileContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixotron-ctx-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns full mode for small files', () => {
    const content = `const x = 1;\nconst y = 2;`;
    const filePath = writeTempFile(tmpDir, 'small.ts', content);

    const ctx = buildFileContext('small.ts', filePath);

    expect(ctx.mode).toBe('full');
    expect(ctx.content).toBe(content);
    expect(ctx.fileName).toBe('small.ts');
  });

  it('does not include summary for full mode', () => {
    const content = makeLines(50);
    const filePath = writeTempFile(tmpDir, 'medium.ts', content);

    const ctx = buildFileContext('medium.ts', filePath);

    expect(ctx.mode).toBe('full');
    expect(ctx.summary).toBeUndefined();
  });

  it('returns snippet mode for large files', () => {
    const content = makeLines(1100);
    const filePath = writeTempFile(tmpDir, 'large.ts', content);

    const ctx = buildFileContext('large.ts', filePath);

    expect(ctx.mode).toBe('snippet');
    expect(ctx.summary).toBeDefined();
  });

  it('includes structural summary for large files', () => {
    const content = makeLines(1100, (i) =>
      i % 100 === 0 ? `export function fn${i}() { return ${i}; }` : `const v${i} = ${i};`
    );
    const filePath = writeTempFile(tmpDir, 'large-with-fns.ts', content);

    const ctx = buildFileContext('large-with-fns.ts', filePath);

    expect(ctx.summary).toContain('function');
  });

  it('snippet content is shorter than original for large files', () => {
    const content = makeLines(1200);
    const filePath = writeTempFile(tmpDir, 'large2.ts', content);

    const ctx = buildFileContext('large2.ts', filePath);

    expect(ctx.content.length).toBeLessThan(content.length);
  });

  it('detects TODO/FIXME comment lines as error hints', () => {
    const lines = Array.from({ length: 1100 }, (_, i) =>
      i === 500 ? '// FIXME: this is broken' : `const x${i} = ${i};`
    );
    const content = lines.join('\n');
    const filePath = writeTempFile(tmpDir, 'with-fixme.ts', content);

    const ctx = buildFileContext('with-fixme.ts', filePath);

    expect(ctx.errorLines).toBeDefined();
    expect(ctx.errorLines).toContain(501); 
  });

  it('extracts lines around detected error lines', () => {
    const lines = Array.from({ length: 1100 }, (_, i) =>
      i === 300 ? '// TODO: fix this undefined bug' : `const a${i} = ${i};`
    );
    const content = lines.join('\n');
    const filePath = writeTempFile(tmpDir, 'with-todo.ts', content);

    const ctx = buildFileContext('with-todo.ts', filePath);

    expect(ctx.content).toContain('TODO');
  });
});

describe('contextBuilder — buildRawContext', () => {
  it('returns full mode for short pasted code', () => {
    const code = `const x = {\nname: "test"\n};`;
    const ctx = buildRawContext(code);

    expect(ctx.mode).toBe('full');
    expect(ctx.content).toBe(code);
    expect(ctx.fileName).toBe('pasted-code');
  });

  it('uses custom fileName when provided', () => {
    const ctx = buildRawContext('const x = 1;', 'custom.ts');
    expect(ctx.fileName).toBe('custom.ts');
  });

  it('returns snippet mode for large pasted code', () => {
    const code = makeLines(1100);
    const ctx = buildRawContext(code);

    expect(ctx.mode).toBe('snippet');
  });

  it('handles empty string without crashing', () => {
    const ctx = buildRawContext('');

    expect(ctx.mode).toBe('full');
    expect(ctx.content).toBe('');
  });

  it('handles single line code', () => {
    const ctx = buildRawContext('console.log("hello")');

    expect(ctx.mode).toBe('full');
    expect(ctx.content).toBe('console.log("hello")');
  });
});