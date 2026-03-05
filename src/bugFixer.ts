import path from 'path';
import { callAI, AIProvider, AIFixResult } from './aiClient';
import { buildFileContext, buildRawContext } from './contextBuilder';
import { buildPrompt } from './promptBuilder';
import { readFile, saveFixedFile } from './fileManager';
import { pushHistory } from './historyManager';
import { commitFixes } from './gitManager';
import { executeInSandbox } from './executor';
import { detectLanguage, LRUCache, hashFile, logger } from './utils';
import {
  startSpinner,
  stopSpinner,
  printFixResult,
  printExecutionResult,
} from './outputFormatter';

const SECURITY_PATTERNS = [
  /process\.env\./,
  /require\(['"]crypto['"]\)/,
  /jwt\.(sign|verify)/,
  /bcrypt\.(hash|compare)/,
  /createCipher|createDecipher/,
  /Authorization|Bearer /i,
];

const containsSecurityCode = (code: string): boolean =>
  SECURITY_PATTERNS.some((p) => p.test(code));

const cache = new LRUCache<string, AIFixResult>(100);

export interface FixOptions {
  provider: AIProvider;
  model?: string;
  logicFix: boolean;
  allowSecurityModifications: boolean;
  save: boolean;
  backup: boolean;
  autoCommit: boolean;
  run: boolean;
}

export const fixFile = async (filePath: string, opts: FixOptions): Promise<AIFixResult> => {
  const content = readFile(filePath);
  const cacheKey = hashFile(content);

  if (cache.has(cacheKey)) {
    logger.info('Cache hit — returning previous result.');
    return cache.get(cacheKey)!;
  }

  if (containsSecurityCode(content) && !opts.allowSecurityModifications) {
    const result: AIFixResult = {
      status: 'unfixable',
      reason: 'File contains security-critical code. Use --allow-security-modifications to proceed.',
    };
    printFixResult(result);
    return result;
  }

  const language = detectLanguage(filePath);
  const fileName = path.basename(filePath);
  const context = buildFileContext(fileName, filePath);
  const { systemPrompt, userPrompt } = buildPrompt([context], {
    logicFix: opts.logicFix,
    allowSecurityModifications: opts.allowSecurityModifications,
    language,
  });

  startSpinner('Sending to AI...');
  const result = await callAI(systemPrompt, userPrompt, { provider: opts.provider, model: opts.model });
  stopSpinner(result.status === 'fixed', result.status === 'fixed' ? 'AI response received' : 'AI could not fix');

  cache.set(cacheKey, result);

  printFixResult(result, language);

  if (result.status === 'fixed' && result.code) {
    pushHistory({
      file: filePath,
      original: content,
      fixed: result.code,
      type: opts.logicFix ? 'logic' : 'syntax',
      provider: opts.provider,
    });

    if (opts.save) saveFixedFile(filePath, result.code, opts.backup);
    if (opts.autoCommit) await commitFixes([filePath], opts.logicFix ? 'logic' : 'syntax');
    if (opts.run) {
      const execResult = await executeInSandbox(filePath, result.code);
      printExecutionResult(execResult);
    }
  }

  return result;
};

export const fixPasted = async (code: string, opts: FixOptions): Promise<AIFixResult> => {
  if (containsSecurityCode(code) && !opts.allowSecurityModifications) {
    return {
      status: 'unfixable',
      reason: 'Pasted code contains security-critical patterns. Use --allow-security-modifications.',
    };
  }

  const context = buildRawContext(code);
  const { systemPrompt, userPrompt } = buildPrompt([context], {
    logicFix: opts.logicFix,
    allowSecurityModifications: opts.allowSecurityModifications,
    language: 'typescript',
  });

  startSpinner('Sending to AI...');
  const result = await callAI(systemPrompt, userPrompt, { provider: opts.provider, model: opts.model });
  stopSpinner(result.status === 'fixed', result.status === 'fixed' ? 'Fixed' : 'Unfixable');

  printFixResult(result);
  return result;
};

export const fixMultipleFiles = async (
  fileMap: Map<string, string>,
  opts: FixOptions
): Promise<Map<string, AIFixResult>> => {
  const results = new Map<string, AIFixResult>();
  const fixedPaths: string[] = [];

  const entries = [...fileMap.entries()];
  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3);
    await Promise.allSettled(
      batch.map(async ([filePath]) => {
        const result = await fixFile(filePath, opts);
        results.set(filePath, result);
        if (result.status === 'fixed') fixedPaths.push(filePath);
      })
    );
  }

  if (opts.autoCommit && fixedPaths.length > 0) {
    await commitFixes(fixedPaths, opts.logicFix ? 'logic' : 'syntax');
  }

  return results;
};