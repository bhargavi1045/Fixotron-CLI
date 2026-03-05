import fs from 'fs';
import path from 'path';
import os from 'os';

jest.mock('../src/aiClient', () => ({
  callAI: jest.fn().mockResolvedValue({
    status: 'fixed',
    fileName: 'test.ts',
    code: 'const x = 1; // fixed',
  }),
}));

jest.mock('../src/outputFormatter', () => ({
  startSpinner: jest.fn(),
  stopSpinner: jest.fn(),
  printFixResult: jest.fn(),
  printExecutionResult: jest.fn(),
}));

jest.mock('../src/gitManager', () => ({
  commitFixes: jest.fn(),
}));

import { fixFile } from '../src/bugFixer';

describe('bugFixer', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixotron-bug-'));
    tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, 'const x = {', 'utf-8'); // broken code
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const opts = {
    provider: 'openai' as const,
    logicFix: false,
    allowSecurityModifications: false,
    save: false,
    backup: false,
    autoCommit: false,
    run: false,
  };

  it('returns fixed status for fixable code', async () => {
    const result = await fixFile(tmpFile, opts);
    expect(result.status).toBe('fixed');
  });

  it('blocks security-critical files without flag', async () => {
    fs.writeFileSync(tmpFile, 'process.env.SECRET = "oops";', 'utf-8');
    const result = await fixFile(tmpFile, opts);
    expect(result.status).toBe('unfixable');
    expect(result.reason).toContain('security-critical');
  });

  it('allows security-critical files with flag', async () => {
    fs.writeFileSync(tmpFile, 'process.env.SECRET = "oops";', 'utf-8');
    const result = await fixFile(tmpFile, { ...opts, allowSecurityModifications: true });
    expect(result.status).toBe('fixed');
  });
});