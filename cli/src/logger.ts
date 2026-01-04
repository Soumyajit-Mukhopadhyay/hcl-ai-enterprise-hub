import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

export class Logger {
  private logFile: string;
  private verbose: boolean;
  
  constructor(logFile: string, verbose: boolean = false) {
    this.logFile = logFile;
    this.verbose = verbose;
    
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (e) {
      // Silently fail file logging
    }
  }
  
  debug(message: string): void {
    if (this.verbose) {
      const formatted = this.formatMessage('DEBUG', message);
      console.log(chalk.gray(formatted));
      this.writeToFile(formatted);
    }
  }
  
  info(message: string): void {
    const formatted = this.formatMessage('INFO', message);
    console.log(chalk.blue('ℹ'), message);
    this.writeToFile(formatted);
  }
  
  warn(message: string): void {
    const formatted = this.formatMessage('WARN', message);
    console.log(chalk.yellow('⚠'), chalk.yellow(message));
    this.writeToFile(formatted);
  }
  
  error(message: string, error?: Error): void {
    const formatted = this.formatMessage('ERROR', message);
    console.log(chalk.red('✖'), chalk.red(message));
    if (error && this.verbose) {
      console.log(chalk.red(error.stack || error.message));
    }
    this.writeToFile(formatted + (error ? `\n${error.stack}` : ''));
  }
  
  success(message: string): void {
    const formatted = this.formatMessage('SUCCESS', message);
    console.log(chalk.green('✔'), chalk.green(message));
    this.writeToFile(formatted);
  }
  
  step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
    this.writeToFile(this.formatMessage('STEP', `[${step}/${total}] ${message}`));
  }
  
  code(filename: string, content: string): void {
    console.log(chalk.magenta(`\n--- ${filename} ---`));
    console.log(chalk.gray(content));
    console.log(chalk.magenta('--- end ---\n'));
  }
  
  diff(filename: string, original: string, modified: string): void {
    const Diff = require('diff');
    const changes = Diff.diffLines(original, modified);
    
    console.log(chalk.magenta(`\n--- Diff: ${filename} ---`));
    changes.forEach((part: any) => {
      const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.gray;
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const lines = part.value.split('\n').filter((l: string) => l);
      lines.forEach((line: string) => {
        console.log(color(`${prefix} ${line}`));
      });
    });
    console.log(chalk.magenta('--- end diff ---\n'));
  }
  
  box(title: string, content: string): void {
    const lines = content.split('\n');
    const maxLen = Math.max(title.length, ...lines.map(l => l.length));
    const border = '─'.repeat(maxLen + 2);
    
    console.log(chalk.cyan(`┌${border}┐`));
    console.log(chalk.cyan('│'), chalk.bold(title.padEnd(maxLen)), chalk.cyan('│'));
    console.log(chalk.cyan(`├${border}┤`));
    lines.forEach(line => {
      console.log(chalk.cyan('│'), line.padEnd(maxLen), chalk.cyan('│'));
    });
    console.log(chalk.cyan(`└${border}┘`));
  }
}
