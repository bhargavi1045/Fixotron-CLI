import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './utils';

export interface FixRecord {
  id: string;
  timestamp: number;
  file: string;
  original: string;
  fixed: string;
  type: 'syntax' | 'logic';
  provider: string;
}

interface HistoryStore {
  stack: FixRecord[];
  redoStack: FixRecord[];
}

const HISTORY_DIR = path.join(os.homedir(), '.fixotron');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');
const MAX_ENTRIES = parseInt(process.env.HISTORY_MAX_ENTRIES ?? '50');

const loadStore = (): HistoryStore => {
  if (!fs.existsSync(HISTORY_FILE)) return { stack: [], redoStack: [] };
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return { stack: [], redoStack: [] };
  }
};

const saveStore = (store: HistoryStore): void => {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
};

export const pushHistory = (record: Omit<FixRecord, 'id' | 'timestamp'>): void => {
  const store = loadStore();
  store.stack.push({
    id: crypto.randomUUID(), 
    timestamp: Date.now(),
    ...record,
  });
  if (store.stack.length > MAX_ENTRIES) {
    store.stack = store.stack.slice(-MAX_ENTRIES);
  }
  store.redoStack = [];
  saveStore(store);
};

export const undo = (): FixRecord | null => {
  const store = loadStore();
  const last = store.stack.pop();
  if (!last) { logger.warn('Nothing to undo.'); return null; }
  store.redoStack.push(last);
  saveStore(store);
  fs.writeFileSync(last.file, last.original, 'utf-8');
  logger.info(`Undone: ${last.file}`);
  return last;
};

export const redo = (): FixRecord | null => {
  const store = loadStore();
  const next = store.redoStack.pop();
  if (!next) { logger.warn('Nothing to redo.'); return null; }
  store.stack.push(next);
  saveStore(store);
  fs.writeFileSync(next.file, next.fixed, 'utf-8');
  logger.info(`Redone: ${next.file}`);
  return next;
};

export const getHistory = (): FixRecord[] => loadStore().stack;