import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFile, backupFile, writeFile } from '../src/fileManager';

describe('fileManager', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixotron-test-'));
    tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, 'const x = 1;', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads a file correctly', () => {
    const content = readFile(tmpFile);
    expect(content).toBe('const x = 1;');
  });

  it('throws on missing file', () => {
    expect(() => readFile('/nonexistent/path.ts')).toThrow('File not found');
  });

  it('creates a backup file', () => {
    const backupPath = backupFile(tmpFile);
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, 'utf-8')).toBe('const x = 1;');
  });

  it('writes file content correctly', () => {
    writeFile(tmpFile, 'const y = 2;');
    expect(fs.readFileSync(tmpFile, 'utf-8')).toBe('const y = 2;');
  });
});