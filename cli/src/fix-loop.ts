import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Config } from './config';
import { Logger } from './logger';
import { Executor, ParsedError } from './executor';
import { FileSystem } from './file-system';
import { AIAgent, AIResponse } from './ai-agent';
import { GitManager } from './git';

export interface FixLoopOptions {
  maxIterations?: number;
  autoCommit?: boolean;
  interactive?: boolean;
  checkType?: 'build' | 'typecheck' | 'lint' | 'all';
}

export interface FixLoopResult {
  success: boolean;
  iterations: number;
  fixesApplied: number;
  errors: ParsedError[];
  aborted: boolean;
}

export class FixLoop {
  private config: Config;
  private logger: Logger;
  private executor: Executor;
  private fileSystem: FileSystem;
  private aiAgent: AIAgent;
  private gitManager: GitManager;
  
  constructor(
    config: Config,
    logger: Logger,
    executor: Executor,
    fileSystem: FileSystem,
    aiAgent: AIAgent,
    gitManager: GitManager
  ) {
    this.config = config;
    this.logger = logger;
    this.executor = executor;
    this.fileSystem = fileSystem;
    this.aiAgent = aiAgent;
    this.gitManager = gitManager;
  }
  
  async run(options: FixLoopOptions = {}): Promise<FixLoopResult> {
    const maxIterations = options.maxIterations || this.config.maxRetries;
    const autoCommit = options.autoCommit ?? true;
    const interactive = options.interactive ?? true;
    const checkType = options.checkType || 'build';
    
    let iteration = 0;
    let fixesApplied = 0;
    let lastErrors: ParsedError[] = [];
    
    this.logger.box('🤖 AI Fix Loop Started', `Max iterations: ${maxIterations}\nCheck type: ${checkType}\nAuto-commit: ${autoCommit}`);
    
    while (iteration < maxIterations) {
      iteration++;
      this.logger.step(iteration, maxIterations, 'Running checks...');
      
      // Run the appropriate check
      const result = await this.runCheck(checkType);
      
      if (result.success) {
        this.logger.success('All checks passed!');
        
        if (autoCommit && fixesApplied > 0) {
          await this.gitManager.autoCommitFix(`Fixed ${fixesApplied} error(s) in ${iteration} iteration(s)`);
        }
        
        return {
          success: true,
          iterations: iteration,
          fixesApplied,
          errors: [],
          aborted: false
        };
      }
      
      // We have errors
      lastErrors = result.errors;
      this.logger.warn(`Found ${result.errors.length} error(s)`);
      
      // Display errors
      for (const error of result.errors.slice(0, 5)) {
        console.log(chalk.red(`  • ${error.file}${error.line ? `:${error.line}` : ''}: ${error.message}`));
      }
      if (result.errors.length > 5) {
        console.log(chalk.gray(`  ... and ${result.errors.length - 5} more`));
      }
      
      // Get relevant file contents
      const spinner = ora('Gathering context...').start();
      const fileContents = await this.gatherFileContents(result.errors);
      const projectStructure = await this.fileSystem.getProjectStructure(2);
      spinner.stop();
      
      // Ask AI for fixes
      const aiSpinner = ora('AI analyzing errors...').start();
      let aiResponse: AIResponse;
      
      try {
        if (iteration === 1) {
          aiResponse = await this.aiAgent.analyzeErrors(result.errors, fileContents, projectStructure);
        } else {
          const feedback = await this.aiAgent.provideFeedback(false, result.errors);
          if (!feedback) {
            aiSpinner.fail('AI could not provide feedback');
            break;
          }
          aiResponse = feedback;
        }
        aiSpinner.succeed('AI analysis complete');
      } catch (e) {
        aiSpinner.fail('AI analysis failed');
        this.logger.error('Failed to get AI response', e as Error);
        break;
      }
      
      // Display AI analysis
      this.logger.box('AI Analysis', `${aiResponse.analysis}\n\nConfidence: ${(aiResponse.confidence * 100).toFixed(0)}%\n\nReasoning: ${aiResponse.reasoning}`);
      
      if (aiResponse.fixes.length === 0) {
        this.logger.warn('AI could not determine fixes');
        break;
      }
      
      // Show proposed fixes
      console.log(chalk.cyan('\nProposed fixes:'));
      for (const fix of aiResponse.fixes) {
        console.log(chalk.yellow(`  📝 ${fix.file}: ${fix.description}`));
      }
      
      // Interactive confirmation
      if (interactive) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Apply these fixes?',
          default: true
        }]);
        
        if (!proceed) {
          this.logger.info('Fixes skipped by user');
          return {
            success: false,
            iterations: iteration,
            fixesApplied,
            errors: lastErrors,
            aborted: true
          };
        }
      }
      
      // Apply fixes
      const applySpinner = ora('Applying fixes...').start();
      try {
        // Get original contents for the fixes
        for (const fix of aiResponse.fixes) {
          try {
            fix.originalContent = await this.fileSystem.readFile(fix.file);
          } catch {
            fix.originalContent = '';
          }
        }
        
        await this.fileSystem.applyChanges(aiResponse.fixes);
        fixesApplied += aiResponse.fixes.length;
        applySpinner.succeed(`Applied ${aiResponse.fixes.length} fix(es)`);
      } catch (e) {
        applySpinner.fail('Failed to apply fixes');
        this.logger.error('Error applying fixes', e as Error);
        
        // Try to revert
        await this.fileSystem.revertChanges(aiResponse.fixes.map(f => f.file));
        break;
      }
      
      // Small delay before next iteration
      await this.delay(1000);
    }
    
    // Max iterations reached or loop broken
    this.logger.warn(`Fix loop ended after ${iteration} iterations with ${lastErrors.length} remaining error(s)`);
    
    return {
      success: false,
      iterations: iteration,
      fixesApplied,
      errors: lastErrors,
      aborted: false
    };
  }
  
  private async runCheck(checkType: string): Promise<{ success: boolean; errors: ParsedError[] }> {
    switch (checkType) {
      case 'typecheck':
        const typeResult = await this.executor.typeCheck();
        return { success: typeResult.success, errors: typeResult.errors };
        
      case 'lint':
        const lintResult = await this.executor.lint();
        return { success: lintResult.success, errors: lintResult.errors };
        
      case 'all':
        const typeRes = await this.executor.typeCheck();
        if (!typeRes.success) {
          return { success: false, errors: typeRes.errors };
        }
        const lintRes = await this.executor.lint();
        if (!lintRes.success) {
          return { success: false, errors: lintRes.errors };
        }
        const buildRes = await this.executor.build();
        return { success: buildRes.success, errors: buildRes.errors };
        
      case 'build':
      default:
        const buildResult = await this.executor.build();
        return { success: buildResult.success, errors: buildResult.errors };
    }
  }
  
  private async gatherFileContents(errors: ParsedError[]): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();
    const uniqueFiles = [...new Set(errors.map(e => e.file).filter(f => f))];
    
    for (const file of uniqueFiles) {
      try {
        const content = await this.fileSystem.readFile(file);
        fileContents.set(file, content);
      } catch {
        this.logger.debug(`Could not read file: ${file}`);
      }
    }
    
    return fileContents;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
