import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { isSupportedFile, logger } from './utils';

export const readFile = (filePath: string): string => {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(filePath, 'utf-8');
};

export const readFolder = async (folderPath: string): Promise<Map<string, string>> => {
  if (!fs.existsSync(folderPath)) throw new Error(`Folder not found: ${folderPath}`);

  const files = await glob('**/*.{ts,tsx,js,jsx,py}', {
    cwd: folderPath,
    ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
    absolute: true,
  });

  const result = new Map<string, string>();
  for (const file of files) {
    if (isSupportedFile(file)) {
      result.set(file, fs.readFileSync(file, 'utf-8'));
    }
  }
  return result;
};

export const backupFile = (filePath: string): string => {
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup.${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  logger.info(`Backup saved: ${backupPath}`);
  return backupPath;
};

export const writeFile = (filePath: string, content: string): void => {
  fs.writeFileSync(filePath, content, 'utf-8');
  logger.info(`Fixed file written: ${filePath}`);
};

export const saveFixedFile = (
  originalPath: string,
  fixedCode: string,
  backup: boolean
): void => {
  if (backup && fs.existsSync(originalPath)) {
    backupFile(originalPath);
  }
  writeFile(originalPath, fixedCode);
};

export const savePastedCode = (fixedCode: string, ext = '.ts'): string => {
  const outPath = path.join(process.cwd(), `fixotron-output${ext}`);
  fs.writeFileSync(outPath, fixedCode, 'utf-8');
  logger.info(`Output saved: ${outPath}`);
  return outPath;
};