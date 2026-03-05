import fs from 'fs';

export type FileMode = 'full' | 'snippet';

export interface FileContext {
  fileName: string;
  mode: FileMode;
  content: string;
  summary?: string;
  errorLines?: number[];
}

const LINE_LIMIT = 1000;
const SNIPPET_PADDING = 7;

const detectErrorLines = (lines: string[]): number[] => {
  const patterns = [
    /\bSyntaxError\b/,
    /\bundefined\b.*\bproperty\b/i,
    /\bcannot read\b/i,
    /\bexpected\b.*[;:{(]/i,
    /\bunexpected token\b/i,
    /\/\/ (TODO|FIXME|BUG|HACK|ERROR)/i,
  ];
  const errorLines: number[] = [];
  lines.forEach((line, i) => {
    if (patterns.some((p) => p.test(line))) {
      errorLines.push(i + 1);
    }
  });
  return errorLines;
};

const generateSummary = (lines: string[]): string => {
  const interesting = lines.filter((l) =>
    /^\s*(export\s+)?(default\s+)?(function|class|const|let|var|async function|import|export)\s+/.test(l)
  );
  return interesting.slice(0, 30).join('\n');
};

const extractSnippets = (lines: string[], errorLines: number[]): string => {
  const included = new Set<number>();
  errorLines.forEach((lineNo) => {
    for (
      let i = Math.max(0, lineNo - SNIPPET_PADDING - 1);
      i < Math.min(lines.length, lineNo + SNIPPET_PADDING);
      i++
    ) {
      included.add(i);
    }
  });

  const sorted = [...included].sort((a, b) => a - b);
  const result: string[] = [];
  let prev = -2;

  sorted.forEach((i) => {
    if (i > prev + 1) result.push(`\n// ... (line ${i + 1})`);
    result.push(`${String(i + 1).padStart(4)} | ${lines[i]}`);
    prev = i;
  });

  return result.join('\n');
};

export const buildFileContext = (fileName: string, filePath: string): FileContext => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');

  if (lines.length < LINE_LIMIT) {
    return { fileName, mode: 'full', content: raw };
  }

  const errorLines = detectErrorLines(lines);
  const snippet = errorLines.length > 0
    ? extractSnippets(lines, errorLines)
    : lines.slice(0, 50).join('\n') + '\n// ... (file truncated, showing first 50 lines)';

  const summary = generateSummary(lines);

  return {
    fileName,
    mode: 'snippet',
    content: snippet,
    summary,
    errorLines,
  };
};

export const buildRawContext = (code: string, fileName = 'pasted-code'): FileContext => {
  const lines = code.split('\n');
  if (lines.length < LINE_LIMIT) {
    return { fileName, mode: 'full', content: code };
  }
  const errorLines = detectErrorLines(lines);
  return {
    fileName,
    mode: 'snippet',
    content: extractSnippets(lines, errorLines),
    summary: generateSummary(lines),
    errorLines,
  };
};