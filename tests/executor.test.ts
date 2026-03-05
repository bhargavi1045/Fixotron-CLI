import fs from 'fs';
import path from 'path';
import os from 'os';
import { executeInSandbox } from '../src/executor';

describe('executor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixotron-exec-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const tmpFile = (name: string) => path.join(process.cwd(), name);

  it('executes valid JS and captures stdout', async () => {
    const filePath = tmpFile('test-exec.js');
    const content = `console.log("hello from sandbox");`;

    const result = await executeInSandbox(filePath, content);

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello from sandbox');
  }, 15000);

  it('captures stderr for runtime errors', async () => {
    const filePath = tmpFile('test-exec-err.js');
    const content = `throw new Error("intentional error");`;

    const result = await executeInSandbox(filePath, content);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('intentional error');
  }, 15000);

  it('times out long-running code', async () => {
    const filePath = tmpFile('test-timeout.js');
    const content = `while(true) {}`;

    const result = await executeInSandbox(filePath, content, 1500);

    expect(result.timedOut).toBe(true);
  }, 10000);

  it('blocks execution of files with process.env', async () => {
    const filePath = tmpFile('test-sec.js');
    const content = `const key = process.env.SECRET; console.log(key);`;

    const result = await executeInSandbox(filePath, content);

    expect(result.stderr).toContain('security-critical');
    expect(result.exitCode).toBeNull();
  }, 15000);

  it('blocks execution of files with jwt.sign', async () => {
    const filePath = tmpFile('test-jwt.js');
    const content = `const t = jwt.sign({ id: 1 }, "secret");`;

    const result = await executeInSandbox(filePath, content);

    expect(result.stderr).toContain('security-critical');
    expect(result.exitCode).toBeNull();
  }, 15000);

  it('blocks execution of files with bcrypt', async () => {
    const filePath = tmpFile('test-bcrypt.js');
    const content = `const h = bcrypt.hash("password", 10);`;

    const result = await executeInSandbox(filePath, content);

    expect(result.stderr).toContain('security-critical');
    expect(result.exitCode).toBeNull();
  }, 15000);

  it('blocks path traversal outside project root', async () => {
    const outsidePath = path.join(os.tmpdir(), 'outside.js');
    const content = `console.log("outside");`;

    const result = await executeInSandbox(outsidePath, content);

    expect(result.stderr).toContain('path traversal');
    expect(result.exitCode).toBeNull();
  }, 15000);

  it('handles empty code without crashing', async () => {
    const filePath = tmpFile('test-empty.js');
    const content = ``;

    const result = await executeInSandbox(filePath, content);

    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
  }, 15000);

  it('captures multi-line stdout correctly', async () => {
    const filePath = tmpFile('test-multiline.js');
    const content = `
      console.log("line 1");
      console.log("line 2");
      console.log("line 3");
    `;

    const result = await executeInSandbox(filePath, content);

    expect(result.stdout).toContain('line 1');
    expect(result.stdout).toContain('line 2');
    expect(result.stdout).toContain('line 3');
  }, 15000);
});