import { Command } from 'commander';
import inquirer from 'inquirer';
import { readFolder } from './fileManager';
import { fixFile, fixPasted, fixMultipleFiles, FixOptions } from './bugFixer';
import { undo, redo, getHistory } from './historyManager';
import { printHeader, printFileInfo, printBatchSummary, printDivider } from './outputFormatter';
import { AIProvider } from './aiClient';
import { logger } from './utils';
import readline from 'readline';

export const runCLI = async (): Promise<void> => {
  const program = new Command();

  program
    .name('fixotron')
    .description('AI-powered CLI bug fixer and code refactoring tool')
    .version('1.0.0');

  program
    .command('fix', { isDefault: true })
    .description('Fix bugs in a file, folder, or pasted code')
    .option('--file <path>', 'Path to a single file to fix')
    .option('--folder <path>', 'Path to a folder to fix recursively')
    .option('--paste', 'Read code from stdin')
    .option('--logic-fix', 'Enable logic/algorithmic bug fixing', false)
    .option('--allow-security-modifications', 'Allow AI to modify security-critical code', false)
    .option('--save', 'Write fixed code back to disk', false)
    .option('--backup', 'Create backup before overwriting', false)
    .option('--auto-commit', 'Git commit after successful fix', false)
    .option('--run', 'Execute fixed code in sandbox', false)
    .option('--provider <provider>', 'AI provider: openai or claude', process.env.DEFAULT_PROVIDER ?? 'openai')
    .option('--model <model>', 'Model override')
    .option('--debug', 'Enable verbose debug logging', false)
    .action(async (options) => {
      if (options.debug) process.env.DEBUG = 'true';

      printHeader();

      const fixOpts: FixOptions = {
        provider: options.provider as AIProvider,
        model: options.model,
        logicFix: options.logicFix,
        allowSecurityModifications: options.allowSecurityModifications,
        save: options.save,
        backup: options.backup,
        autoCommit: options.autoCommit,
        run: options.run,
      };
      if (options.paste) {
        printFileInfo({
          'Mode:': 'stdin / paste',
          'Provider:': fixOpts.provider,
          'Logic fix:': fixOpts.logicFix ? 'enabled' : 'disabled',
        });

        const code = await readStdin();
        if (!code.trim()) {
          logger.error('No code received from stdin.');
          return;
        }

        await fixPasted(code, fixOpts);

        if (fixOpts.save) {
          const { saveIt } = await inquirer.prompt([{
            type: 'confirm', name: 'saveIt', message: 'Save fixed code to fixotron-output.ts?', default: true,
          }]);
          if (saveIt) {
            const { savePastedCode } = await import('./fileManager');
            savePastedCode(code);
          }
        }
        return;
      }
      if (options.file) {
        printFileInfo({
          'File:': options.file,
          'Provider:': fixOpts.provider,
          'Logic fix:': fixOpts.logicFix ? 'enabled' : 'disabled',
          'Security:': fixOpts.allowSecurityModifications ? 'unrestricted' : 'protected',
        });

        const result = await fixFile(options.file, fixOpts);

        if (result.status === 'fixed' && !fixOpts.save) {
          const { saveIt } = await inquirer.prompt([{
            type: 'confirm', name: 'saveIt', message: 'Save fixed file to disk?', default: false,
          }]);
          if (saveIt) {
            const { saveFixedFile } = await import('./fileManager');
            const { backupIt } = await inquirer.prompt([{
              type: 'confirm', name: 'backupIt', message: 'Create backup first?', default: true,
            }]);
            saveFixedFile(options.file, result.code!, backupIt);
          }
        }
        return;
      }
      if (options.folder) {
        printFileInfo({
          'Folder:': options.folder,
          'Provider:': fixOpts.provider,
          'Logic fix:': fixOpts.logicFix ? 'enabled' : 'disabled',
        });

        const fileMap = await readFolder(options.folder);
        logger.info(`Found ${fileMap.size} supported files.`);

        const results = await fixMultipleFiles(fileMap, fixOpts);
        printBatchSummary(results);
        return;
      }

      logger.error('Please specify --file, --folder, or --paste. Run fixotron --help for usage.');
    });

  program
    .command('undo')
    .description('Revert the last AI fix')
    .action(() => {
      const record = undo();
      if (record) {
        console.log(`✅ Restored: ${record.file}`);
      }
    });

  program
    .command('redo')
    .description('Reapply the last undone fix')
    .action(() => {
      const record = redo();
      if (record) {
        console.log(`✅ Reapplied: ${record.file}`);
      }
    });

  program
    .command('history')
    .description('Show fix history')
    .action(() => {
      const history = getHistory();
      if (history.length === 0) {
        console.log('No fix history found.');
        return;
      }
      console.log('\n📋 Fix History:\n');
      history.slice(-10).reverse().forEach((r, i) => {
        console.log(`  ${i + 1}. [${new Date(r.timestamp).toLocaleString()}] ${r.type} — ${r.file}`);
      });
      printDivider();
    });

  await program.parseAsync(process.argv);
};

const readStdin = (): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    const lines: string[] = [];
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines.join('\n')));
  });
};