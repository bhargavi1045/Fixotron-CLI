import chalk from 'chalk';
import { highlight } from 'cli-highlight';
import ora, { Ora } from 'ora';
import { AIFixResult } from './aiClient';
import { ExecutionResult } from './executor';

let spinner: Ora | null = null;

export const startSpinner = (text: string): void => {
  spinner = ora({ text, color: 'cyan' }).start();
};

export const stopSpinner = (success: boolean, text: string): void => {
  if (!spinner) return;
  if (success) spinner.succeed(chalk.green(text));
  else spinner.fail(chalk.red(text));
  spinner = null;
};

export const printHeader = (): void => {
  console.log('\n' + chalk.bold.cyan('Fixotron CLI-AI Bug Fixer'));
  console.log(chalk.gray('─────────────────────────────────────'));
};

export const printFileInfo = (info: Record<string, string>): void => {
  Object.entries(info).forEach(([key, val]) => {
    console.log(`  ${chalk.gray(key.padEnd(12))} ${chalk.white(val)}`);
  });
  console.log(chalk.gray('─────────────────────────────────────'));
};

export const printFixResult = (result: AIFixResult, language = 'typescript'): void => {
  if (result.status === 'unfixable') {
    console.log('\n' + chalk.red.bold('Unfixable'));
    console.log(chalk.gray('  Reason: ') + chalk.yellow(result.reason ?? 'Unknown'));
    return;
  }

  console.log('\n' + chalk.green.bold('Fixed successfully'));

  if (result.explanation) {
    console.log('\n' + chalk.cyan('  Logic changes:'));
    console.log(chalk.white('  ' + result.explanation));
  }

  if (result.code) {              
    console.log('\n' + chalk.gray('── Fixed Code Preview ──────────────────\n'));
    try {
      console.log(highlight(result.code, { language, ignoreIllegals: true }));
    } catch {
      console.log(result.code);
    }
  }

  if (result.files) {
    console.log('\n' + chalk.cyan('Multi-file results:'));
    Object.keys(result.files).forEach((f) => {
      console.log(chalk.green(`${f}`));
    });
  }
};

export const printExecutionResult = (res: ExecutionResult): void => {
  console.log('\n' + chalk.gray('── Execution Result ─────────────────────'));
  if (res.timedOut) {
    console.log(chalk.red('Timed out'));
    return;
  }
  const code = res.exitCode === 0
    ? chalk.green(`Exit code: ${res.exitCode}`)
    : chalk.red(`Exit code: ${res.exitCode}`);
  console.log(`  ${code}`);
  if (res.stdout) console.log(chalk.gray('\n  stdout:\n') + chalk.white(res.stdout));
  if (res.stderr) console.log(chalk.gray('\n  stderr:\n') + chalk.red(res.stderr));
};

export const printBatchSummary = (results: Map<string, AIFixResult>): void => {
  console.log('\n' + chalk.bold.cyan('  Batch Summary'));
  console.log(chalk.gray('─────────────────────────────────────'));
  results.forEach((result, file) => {
    const reason = result.status === 'unfixable' ? chalk.gray(` (${result.reason})`) : '';
    console.log(`${chalk.white(file)}${reason}`);
  });
};

export const printDivider = (): void => {
  console.log(chalk.gray('\n─────────────────────────────────────\n'));
};