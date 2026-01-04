import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import { Logger } from './logger';

export interface GitStatus {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  hasChanges: boolean;
}

export class GitManager {
  private git: SimpleGit;
  private logger: Logger;
  private repoPath: string;
  
  constructor(repoPath: string, logger: Logger) {
    this.repoPath = repoPath;
    this.logger = logger;
    this.git = simpleGit(repoPath);
  }
  
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }
  
  async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status();
      
      return {
        isRepo: true,
        branch: status.current || 'unknown',
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added,
        hasChanges: status.modified.length > 0 || status.staged.length > 0 || status.not_added.length > 0
      };
    } catch (e) {
      return {
        isRepo: false,
        branch: '',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        hasChanges: false
      };
    }
  }
  
  async clone(repoUrl: string, targetPath?: string): Promise<string> {
    const destination = targetPath || path.basename(repoUrl, '.git');
    this.logger.info(`Cloning ${repoUrl} to ${destination}...`);
    
    await this.git.clone(repoUrl, destination);
    this.logger.success(`Repository cloned successfully`);
    
    return path.resolve(destination);
  }
  
  async pull(): Promise<void> {
    this.logger.info('Pulling latest changes...');
    const result = await this.git.pull();
    
    if (result.files.length > 0) {
      this.logger.success(`Pulled ${result.files.length} files`);
    } else {
      this.logger.info('Already up to date');
    }
  }
  
  async push(): Promise<void> {
    const status = await this.getStatus();
    
    if (!status.hasChanges && status.ahead === 0) {
      this.logger.info('Nothing to push');
      return;
    }
    
    this.logger.info('Pushing changes...');
    await this.git.push();
    this.logger.success('Changes pushed successfully');
  }
  
  async commit(message: string): Promise<void> {
    this.logger.info('Creating commit...');
    await this.git.add('.');
    await this.git.commit(message);
    this.logger.success(`Committed: ${message}`);
  }
  
  async createBranch(branchName: string): Promise<void> {
    this.logger.info(`Creating branch: ${branchName}`);
    await this.git.checkoutLocalBranch(branchName);
    this.logger.success(`Switched to new branch: ${branchName}`);
  }
  
  async checkout(branchName: string): Promise<void> {
    this.logger.info(`Checking out: ${branchName}`);
    await this.git.checkout(branchName);
    this.logger.success(`Switched to branch: ${branchName}`);
  }
  
  async stash(): Promise<void> {
    this.logger.info('Stashing changes...');
    await this.git.stash();
    this.logger.success('Changes stashed');
  }
  
  async stashPop(): Promise<void> {
    this.logger.info('Applying stashed changes...');
    await this.git.stash(['pop']);
    this.logger.success('Stashed changes applied');
  }
  
  async getLastCommitMessage(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.message || '';
  }
  
  async getDiff(file?: string): Promise<string> {
    if (file) {
      return await this.git.diff([file]);
    }
    return await this.git.diff();
  }
  
  async autoCommitFix(fixDescription: string): Promise<void> {
    const status = await this.getStatus();
    
    if (!status.hasChanges) {
      return;
    }
    
    const message = `🤖 AI Fix: ${fixDescription}`;
    await this.commit(message);
  }
}
