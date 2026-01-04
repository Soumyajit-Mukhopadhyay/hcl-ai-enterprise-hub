import { execa, ExecaChildProcess, ExecaReturnValue } from 'execa';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';
import treeKill from 'tree-kill';

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  errors: ParsedError[];
}

export interface ParsedError {
  file: string;
  line: number | null;
  column: number | null;
  message: string;
  type: 'typescript' | 'eslint' | 'runtime' | 'build' | 'unknown';
  fullError: string;
}

export class Executor {
  private logger: Logger;
  private projectRoot: string;
  private runningProcess: ExecaChildProcess | null = null;
  
  constructor(projectRoot: string, logger: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger;
  }
  
  async runCommand(command: string, args: string[] = [], options?: { timeout?: number; cwd?: string }): Promise<ExecutionResult> {
    const startTime = Date.now();
    const cwd = options?.cwd || this.projectRoot;
    
    this.logger.debug(`Running: ${command} ${args.join(' ')}`);
    
    try {
      this.runningProcess = execa(command, args, {
        cwd,
        timeout: options?.timeout || 60000,
        reject: false,
        all: true
      });
      
      const result = await this.runningProcess as ExecaReturnValue;
      this.runningProcess = null;
      
      const duration = Date.now() - startTime;
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const allOutput = result.all || stdout + stderr;
      
      const errors = this.parseErrors(allOutput);
      
      return {
        success: result.exitCode === 0,
        stdout,
        stderr,
        exitCode: result.exitCode ?? null,
        duration,
        errors
      };
    } catch (e: any) {
      this.runningProcess = null;
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: e.message || String(e),
        exitCode: e.exitCode ?? 1,
        duration,
        errors: [{
          file: '',
          line: null,
          column: null,
          message: e.message || String(e),
          type: 'unknown',
          fullError: e.message || String(e)
        }]
      };
    }
  }
  
  async kill(): Promise<void> {
    if (this.runningProcess && this.runningProcess.pid) {
      return new Promise((resolve) => {
        treeKill(this.runningProcess!.pid!, 'SIGTERM', () => {
          this.runningProcess = null;
          resolve();
        });
      });
    }
  }
  
  async typeCheck(): Promise<ExecutionResult> {
    this.logger.info('Running TypeScript type check...');
    return this.runCommand('npx', ['tsc', '--noEmit']);
  }
  
  async lint(): Promise<ExecutionResult> {
    this.logger.info('Running ESLint...');
    return this.runCommand('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js,.jsx']);
  }
  
  async build(): Promise<ExecutionResult> {
    this.logger.info('Building project...');
    
    // Detect package manager
    const hasYarn = fs.existsSync(path.join(this.projectRoot, 'yarn.lock'));
    const hasPnpm = fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'));
    const hasBun = fs.existsSync(path.join(this.projectRoot, 'bun.lockb'));
    
    let cmd = 'npm';
    if (hasYarn) cmd = 'yarn';
    if (hasPnpm) cmd = 'pnpm';
    if (hasBun) cmd = 'bun';
    
    return this.runCommand(cmd, ['run', 'build'], { timeout: 120000 });
  }
  
  async test(): Promise<ExecutionResult> {
    this.logger.info('Running tests...');
    return this.runCommand('npm', ['test', '--', '--passWithNoTests'], { timeout: 120000 });
  }
  
  async installDependencies(): Promise<ExecutionResult> {
    this.logger.info('Installing dependencies...');
    
    const hasYarn = fs.existsSync(path.join(this.projectRoot, 'yarn.lock'));
    const hasPnpm = fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'));
    const hasBun = fs.existsSync(path.join(this.projectRoot, 'bun.lockb'));
    
    if (hasBun) {
      return this.runCommand('bun', ['install'], { timeout: 120000 });
    }
    if (hasPnpm) {
      return this.runCommand('pnpm', ['install'], { timeout: 120000 });
    }
    if (hasYarn) {
      return this.runCommand('yarn', ['install'], { timeout: 120000 });
    }
    return this.runCommand('npm', ['install'], { timeout: 120000 });
  }
  
  private parseErrors(output: string): ParsedError[] {
    const errors: ParsedError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // TypeScript errors: src/file.ts(10,5): error TS2345: ...
      const tsMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/);
      if (tsMatch) {
        errors.push({
          file: tsMatch[1],
          line: parseInt(tsMatch[2]),
          column: parseInt(tsMatch[3]),
          message: tsMatch[5],
          type: 'typescript',
          fullError: line
        });
        continue;
      }
      
      // Vite/ESBuild errors: src/file.ts:10:5 - error ...
      const viteMatch = line.match(/^(.+?):(\d+):(\d+)\s*[-–]\s*(error|warning)[:\s]*(.+)$/i);
      if (viteMatch) {
        errors.push({
          file: viteMatch[1],
          line: parseInt(viteMatch[2]),
          column: parseInt(viteMatch[3]),
          message: viteMatch[5],
          type: 'build',
          fullError: line
        });
        continue;
      }
      
      // ESLint errors: /path/file.ts:10:5 error ...
      const eslintMatch = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(.+)$/);
      if (eslintMatch) {
        errors.push({
          file: '',
          line: parseInt(eslintMatch[1]),
          column: parseInt(eslintMatch[2]),
          message: eslintMatch[4],
          type: 'eslint',
          fullError: line
        });
        continue;
      }
      
      // Generic error patterns
      const genericMatch = line.match(/error[:\s]+(.+)/i);
      if (genericMatch && !line.includes('0 errors')) {
        errors.push({
          file: '',
          line: null,
          column: null,
          message: genericMatch[1],
          type: 'unknown',
          fullError: line
        });
      }
    }
    
    return errors;
  }
  
  async runDev(): Promise<ExecaChildProcess> {
    this.logger.info('Starting development server...');
    
    const hasBun = fs.existsSync(path.join(this.projectRoot, 'bun.lockb'));
    const cmd = hasBun ? 'bun' : 'npm';
    
    this.runningProcess = execa(cmd, ['run', 'dev'], {
      cwd: this.projectRoot,
      stdio: 'pipe'
    });
    
    return this.runningProcess;
  }
}
