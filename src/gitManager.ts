import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import { logger } from './utils';

const getGit = (cwd: string): SimpleGit => simpleGit(cwd);

export const isGitRepo = async (cwd: string): Promise<boolean> => {
  try {
    await getGit(cwd).status();
    return true;
  } catch {
    return false;
  }
};

export const commitFixes = async (
  filePaths: string[],
  fixType: 'syntax' | 'logic' = 'syntax'
): Promise<void> => {
  const cwd = process.cwd();

  if (!(await isGitRepo(cwd))) {
    logger.warn('Not a git repository — skipping auto-commit.');
    return;
  }

  const git = getGit(cwd);
  const relPaths = filePaths.map((f) => path.relative(cwd, f));

  try {
    await git.add(relPaths);
    const fileList = relPaths.join(', ');
    const msg = `fix(fixotron): auto-fixed ${fixType} errors in [${fileList}]`;
    await git.commit(msg, relPaths);
    logger.info(`Git commit created: "${msg}"`);
  } catch (err) {
    logger.error(`Git commit failed: ${err instanceof Error ? err.message : err}`);
  }
};

export const getLastCommitHash = async (): Promise<string | null> => {
  try {
    const git = getGit(process.cwd());
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash ?? null;
  } catch {
    return null;
  }
};

export const revertCommit = async (commitHash: string): Promise<void> => {
  const git = getGit(process.cwd());
  try {
    await git.raw(['revert', commitHash, '--no-commit']);
    logger.info(`Reverted commit: ${commitHash}`);
  } catch (err) {
    logger.error(`Git revert failed: ${err instanceof Error ? err.message : err}`);
  }
};