#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig, validateConfig } from './config';
import { Logger } from './logger';
import { GitManager } from './git';
import { Executor } from './executor';
import { FileSystem } from './file-system';
import { AIAgent } from './ai-agent';
import { FixLoop } from './fix-loop';
import { Watcher } from './watcher';

const program = new Command();

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('HCLTech AI Developer')} ${chalk.gray('- Full-Stack AI Coding Assistant')}  ${chalk.cyan('║')}
${chalk.cyan('╠═══════════════════════════════════════════════════════════╣')}
${chalk.cyan('║')}  ${chalk.yellow('⚡')} Auto-fix errors    ${chalk.yellow('⚡')} Git integration              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('⚡')} Watch mode         ${chalk.yellow('⚡')} AI-powered analysis          ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

program
  .name('hcl-dev')
  .description('AI-powered full-stack developer assistant')
  .version('1.0.0');

program
  .command('fix')
  .description('Analyze and fix errors in the project')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-m, --max-iterations <number>', 'Maximum fix iterations', '5')
  .option('-t, --type <type>', 'Check type: build, typecheck, lint, all', 'build')
  .option('--no-commit', 'Skip auto-commit after fixes')
  .option('--no-interactive', 'Run without prompts')
  .action(async (options) => {
    console.log(banner);
    
    const config = loadConfig(options.path);
    const errors = validateConfig(config);
    
    if (errors.length > 0) {
      console.log(chalk.red('Configuration errors:'));
      errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
      process.exit(1);
    }
    
    const logger = new Logger(config.logFile, config.verbose);
    const executor = new Executor(config.projectRoot, logger);
    const fileSystem = new FileSystem(config.projectRoot, logger);
    const aiAgent = new AIAgent(config, logger);
    const gitManager = new GitManager(config.projectRoot, logger);
    
    const fixLoop = new FixLoop(config, logger, executor, fileSystem, aiAgent, gitManager);
    
    try {
      const result = await fixLoop.run({
        maxIterations: parseInt(options.maxIterations),
        autoCommit: options.commit,
        interactive: options.interactive,
        checkType: options.type
      });
      
      if (result.success) {
        console.log(chalk.green(`\n✔ All errors fixed in ${result.iterations} iteration(s)!`));
        console.log(chalk.green(`  Applied ${result.fixesApplied} fix(es)`));
      } else if (result.aborted) {
        console.log(chalk.yellow('\n⚠ Fix loop aborted by user'));
      } else {
        console.log(chalk.red(`\n✖ Could not fix all errors after ${result.iterations} iterations`));
        console.log(chalk.red(`  ${result.errors.length} error(s) remaining`));
        process.exit(1);
      }
    } catch (e) {
      logger.error('Fix command failed', e as Error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for file changes and auto-fix errors')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('--no-auto-fix', 'Disable automatic fixing')
  .option('-d, --debounce <ms>', 'Debounce time in ms', '1000')
  .action(async (options) => {
    console.log(banner);
    
    const config = loadConfig(options.path);
    const errors = validateConfig(config);
    
    if (errors.length > 0) {
      console.log(chalk.red('Configuration errors:'));
      errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
      process.exit(1);
    }
    
    const logger = new Logger(config.logFile, config.verbose);
    const executor = new Executor(config.projectRoot, logger);
    const fileSystem = new FileSystem(config.projectRoot, logger);
    const aiAgent = new AIAgent(config, logger);
    const gitManager = new GitManager(config.projectRoot, logger);
    
    const fixLoop = new FixLoop(config, logger, executor, fileSystem, aiAgent, gitManager);
    const watcher = new Watcher(config, logger, executor, fixLoop);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\nShutting down...'));
      await watcher.stop();
      process.exit(0);
    });
    
    try {
      await watcher.start({
        autoFix: options.autoFix,
        debounceMs: parseInt(options.debounce)
      });
    } catch (e) {
      logger.error('Watch command failed', e as Error);
      process.exit(1);
    }
  });

program
  .command('clone <repo>')
  .description('Clone a repository and set up AI development')
  .option('-p, --path <path>', 'Target path')
  .option('--install', 'Install dependencies after cloning', true)
  .action(async (repo, options) => {
    console.log(banner);
    
    const config = loadConfig(process.cwd());
    const logger = new Logger(config.logFile, config.verbose);
    const gitManager = new GitManager(process.cwd(), logger);
    
    try {
      const clonedPath = await gitManager.clone(repo, options.path);
      console.log(chalk.green(`\n✔ Repository cloned to: ${clonedPath}`));
      
      if (options.install) {
        const newConfig = loadConfig(clonedPath);
        const executor = new Executor(clonedPath, logger);
        
        const spinner = ora('Installing dependencies...').start();
        const result = await executor.installDependencies();
        
        if (result.success) {
          spinner.succeed('Dependencies installed');
        } else {
          spinner.fail('Dependency installation failed');
          console.log(chalk.red(result.stderr));
        }
      }
      
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.white(`  cd ${clonedPath}`));
      console.log(chalk.white('  hcl-dev fix     # Fix any existing errors'));
      console.log(chalk.white('  hcl-dev watch   # Start watching for changes'));
      
    } catch (e) {
      logger.error('Clone failed', e as Error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show project and git status')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    console.log(banner);
    
    const config = loadConfig(options.path);
    const logger = new Logger(config.logFile, config.verbose);
    const gitManager = new GitManager(config.projectRoot, logger);
    const executor = new Executor(config.projectRoot, logger);
    const fileSystem = new FileSystem(config.projectRoot, logger);
    
    // Git status
    const gitStatus = await gitManager.getStatus();
    console.log(chalk.cyan('\n📦 Git Status:'));
    console.log(`  Branch: ${chalk.yellow(gitStatus.branch)}`);
    console.log(`  Ahead: ${gitStatus.ahead}, Behind: ${gitStatus.behind}`);
    console.log(`  Modified: ${gitStatus.modified.length}, Staged: ${gitStatus.staged.length}`);
    
    // Quick type check
    console.log(chalk.cyan('\n🔍 Quick Check:'));
    const spinner = ora('Running type check...').start();
    const result = await executor.typeCheck();
    
    if (result.success) {
      spinner.succeed('No TypeScript errors');
    } else {
      spinner.fail(`${result.errors.length} TypeScript error(s)`);
      result.errors.slice(0, 3).forEach(e => {
        console.log(chalk.red(`  • ${e.file}:${e.line}: ${e.message}`));
      });
    }
    
    // Project structure
    console.log(chalk.cyan('\n📁 Project Structure:'));
    const structure = await fileSystem.getProjectStructure(2);
    console.log(chalk.gray(structure));
  });

program
  .command('init')
  .description('Initialize AI developer configuration')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    console.log(banner);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'aiApiKey',
        message: 'Enter your AI API key (or press enter to use env variable):',
        default: ''
      },
      {
        type: 'list',
        name: 'aiModel',
        message: 'Select AI model:',
        choices: [
          'google/gemini-2.5-flash',
          'google/gemini-2.5-pro',
          'openai/gpt-5-mini',
          'openai/gpt-5'
        ],
        default: 'google/gemini-2.5-flash'
      },
      {
        type: 'number',
        name: 'maxRetries',
        message: 'Maximum fix iterations:',
        default: 5
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose logging?',
        default: false
      }
    ]);
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Create .hcl-dev.json
    const configPath = path.join(options.path, '.hcl-dev.json');
    const config = {
      aiModel: answers.aiModel,
      maxRetries: answers.maxRetries,
      verbose: answers.verbose,
      watchPatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      ignorePatterns: ['node_modules/**', 'dist/**', '.git/**']
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\n✔ Created ${configPath}`));
    
    // Create/update .env if API key provided
    if (answers.aiApiKey) {
      const envPath = path.join(options.path, '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      if (!envContent.includes('AI_API_KEY=')) {
        envContent += `\nAI_API_KEY=${answers.aiApiKey}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log(chalk.green(`✔ Added AI_API_KEY to ${envPath}`));
      }
    }
    
    // Add to .gitignore
    const gitignorePath = path.join(options.path, '.gitignore');
    let gitignoreContent = '';
    
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    }
    
    const toIgnore = ['.hcl-dev.log', '*.backup'];
    const toAdd = toIgnore.filter(item => !gitignoreContent.includes(item));
    
    if (toAdd.length > 0) {
      gitignoreContent += '\n# HCL AI Developer\n' + toAdd.join('\n') + '\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log(chalk.green(`✔ Updated ${gitignorePath}`));
    }
    
    console.log(chalk.cyan('\n🚀 Ready to go! Run:'));
    console.log(chalk.white('  hcl-dev fix     # Fix any errors'));
    console.log(chalk.white('  hcl-dev watch   # Start watching'));
  });

program
  .command('push')
  .description('Commit and push changes')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-m, --message <message>', 'Commit message')
  .action(async (options) => {
    console.log(banner);
    
    const config = loadConfig(options.path);
    const logger = new Logger(config.logFile, config.verbose);
    const gitManager = new GitManager(config.projectRoot, logger);
    
    try {
      const status = await gitManager.getStatus();
      
      if (!status.hasChanges && status.ahead === 0) {
        console.log(chalk.yellow('Nothing to push'));
        return;
      }
      
      if (status.hasChanges) {
        const message = options.message || `🤖 AI-assisted changes at ${new Date().toISOString()}`;
        await gitManager.commit(message);
      }
      
      await gitManager.push();
      console.log(chalk.green('\n✔ Changes pushed successfully!'));
      
    } catch (e) {
      logger.error('Push failed', e as Error);
      process.exit(1);
    }
  });

program
  .command('pull')
  .description('Pull latest changes')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    console.log(banner);
    
    const config = loadConfig(options.path);
    const logger = new Logger(config.logFile, config.verbose);
    const gitManager = new GitManager(config.projectRoot, logger);
    
    try {
      await gitManager.pull();
      console.log(chalk.green('\n✔ Repository updated!'));
    } catch (e) {
      logger.error('Pull failed', e as Error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(banner);
  program.outputHelp();
}
