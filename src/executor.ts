import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectLanguage, logger } from './utils';

const SECURITY_PATTERNS = [
  /process\.env\./,
  /require\(['"]crypto['"]\)/,
  /jwt\.(sign|verify)/,
  /bcrypt\.(hash|compare)/,
  /createCipher|createDecipher/,
  /Authorization|Bearer /i,
];

export interface ExecutionResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export const executeInSandbox = async (
  filePath: string,
  content: string,
  timeoutMs = parseInt(process.env.EXECUTION_TIMEOUT_MS ?? '10000')
): Promise<ExecutionResult> => {
  if (SECURITY_PATTERNS.some((p) => p.test(content))) {
    logger.warn('Execution blocked — file contains security-critical code.');
    return {
      exitCode: null,
      stdout: '',
      stderr: 'Execution blocked: security-critical code detected.',
      timedOut: false,
    };
  }

  const projectRoot = process.cwd();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(projectRoot)) {
    logger.error('Execution blocked — file path is outside project root.');
    return {
      exitCode: null,
      stdout: '',
      stderr: 'Execution blocked: path traversal detected.',
      timedOut: false,
    };
  }

  const sandboxId = crypto.randomUUID();
  const sandboxDir = path.join(os.tmpdir(), `fixotron-sandbox-${sandboxId}`);
  fs.mkdirSync(sandboxDir, { recursive: true });

  const ext = path.extname(filePath);
  const sandboxFile = path.join(sandboxDir, `code${ext}`);
  fs.writeFileSync(sandboxFile, content, 'utf-8');

  const lang = detectLanguage(filePath);
  const [cmd, args]: [string, string[]] = lang === 'python'
    ? ['python', [sandboxFile]]
    : ['node', [sandboxFile]];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, { cwd: sandboxDir });

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
      resolve({ exitCode, stdout, stderr, timedOut });
    });
  });
};