import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'path';
import { Config } from './config';
import { Logger } from './logger';
import { Executor } from './executor';
import { FixLoop, FixLoopOptions } from './fix-loop';

export interface WatcherOptions {
  autoFix?: boolean;
  debounceMs?: number;
  fixOptions?: FixLoopOptions;
}

export class Watcher {
  private config: Config;
  private logger: Logger;
  private executor: Executor;
  private fixLoop: FixLoop;
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  
  constructor(
    config: Config,
    logger: Logger,
    executor: Executor,
    fixLoop: FixLoop
  ) {
    this.config = config;
    this.logger = logger;
    this.executor = executor;
    this.fixLoop = fixLoop;
  }
  
  async start(options: WatcherOptions = {}): Promise<void> {
    const { autoFix = true, debounceMs = 1000 } = options;
    
    this.logger.info('Starting file watcher...');
    
    const watchPaths = this.config.watchPatterns.map(p => 
      path.join(this.config.projectRoot, p)
    );
    
    this.watcher = chokidar.watch(watchPaths, {
      ignored: this.config.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    
    const handleChange = async (filePath: string, eventType: string) => {
      const relativePath = path.relative(this.config.projectRoot, filePath);
      this.logger.info(`${eventType}: ${relativePath}`);
      
      // Debounce multiple rapid changes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(async () => {
        if (this.isProcessing) {
          this.logger.debug('Already processing, skipping...');
          return;
        }
        
        this.isProcessing = true;
        
        try {
          // First, run a quick type check
          const result = await this.executor.typeCheck();
          
          if (!result.success) {
            this.logger.warn(`Found ${result.errors.length} error(s)`);
            
            if (autoFix) {
              this.logger.info('Auto-fix enabled, starting fix loop...');
              await this.fixLoop.run({
                ...options.fixOptions,
                interactive: false,
                maxIterations: 3
              });
            }
          } else {
            this.logger.success('No errors detected');
          }
        } catch (e) {
          this.logger.error('Error during processing', e as Error);
        } finally {
          this.isProcessing = false;
        }
      }, debounceMs);
    };
    
    this.watcher
      .on('change', (path) => handleChange(path, 'Modified'))
      .on('add', (path) => handleChange(path, 'Added'))
      .on('unlink', (path) => handleChange(path, 'Deleted'))
      .on('error', (error) => this.logger.error('Watcher error', error))
      .on('ready', () => {
        this.logger.success('File watcher ready');
        this.logger.info('Watching for changes... (Press Ctrl+C to stop)');
      });
  }
  
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.info('File watcher stopped');
    }
  }
}
