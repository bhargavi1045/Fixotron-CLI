import crypto from 'crypto';
import path from 'path';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const DEBUG = process.env.DEBUG === 'true';

export const logger = {
  info: (msg: string) => console.log(`${msg}`),
  warn: (msg: string) => console.warn(`${msg}`),
  error: (msg: string) => console.error(`${msg}`),
  debug: (msg: string) => { if (DEBUG) console.log(`${msg}`); },
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const hashFile = (content: string): string =>
  crypto.createHash('md5').update(content).digest('hex');

export type Language = 'typescript' | 'javascript' | 'python' | 'unknown';

export const detectLanguage = (filePath: string): Language => {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, Language> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
  };
  return map[ext] ?? 'unknown';
};

export class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }
}

export const getEnv = (key: string, fallback?: string): string => {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env variable: ${key}`);
  return val;
};

export const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py'];

export const isSupportedFile = (filePath: string): boolean =>
  SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());