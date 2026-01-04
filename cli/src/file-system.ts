import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger } from './logger';

export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  modified: Date;
}

export interface FileChange {
  file: string;
  originalContent: string;
  newContent: string;
  description: string;
}

export class FileSystem {
  private logger: Logger;
  private projectRoot: string;
  
  constructor(projectRoot: string, logger: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger;
  }
  
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return fs.readFileSync(fullPath, 'utf-8');
  }
  
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    this.logger.debug(`Written: ${filePath}`);
  }
  
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.debug(`Deleted: ${filePath}`);
    }
  }
  
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    return fs.existsSync(fullPath);
  }
  
  async findFiles(patterns: string[], ignorePatterns: string[] = []): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: ignorePatterns,
        nodir: true
      });
      allFiles.push(...files);
    }
    
    return [...new Set(allFiles)];
  }
  
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const fullPath = this.resolvePath(filePath);
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    return {
      path: fullPath,
      relativePath: filePath,
      content,
      size: stats.size,
      modified: stats.mtime
    };
  }
  
  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      const fullPath = this.resolvePath(change.file);
      
      // Backup original
      if (fs.existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup`;
        fs.copyFileSync(fullPath, backupPath);
        this.logger.debug(`Backup created: ${backupPath}`);
      }
      
      // Apply change
      await this.writeFile(change.file, change.newContent);
      this.logger.success(`Applied fix to: ${change.file}`);
      this.logger.diff(change.file, change.originalContent || '', change.newContent);
    }
  }
  
  async revertChanges(files: string[]): Promise<void> {
    for (const file of files) {
      const fullPath = this.resolvePath(file);
      const backupPath = `${fullPath}.backup`;
      
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, fullPath);
        fs.unlinkSync(backupPath);
        this.logger.info(`Reverted: ${file}`);
      }
    }
  }
  
  async cleanBackups(): Promise<void> {
    const backups = await glob('**/*.backup', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**']
    });
    
    for (const backup of backups) {
      const fullPath = this.resolvePath(backup);
      fs.unlinkSync(fullPath);
    }
    
    if (backups.length > 0) {
      this.logger.info(`Cleaned ${backups.length} backup files`);
    }
  }
  
  async getProjectStructure(maxDepth: number = 3): Promise<string> {
    const structure: string[] = [];
    
    const walk = (dir: string, depth: number, prefix: string = ''): void => {
      if (depth > maxDepth) return;
      
      const items = fs.readdirSync(dir);
      const filteredItems = items.filter(item => 
        !item.startsWith('.') && 
        item !== 'node_modules' && 
        item !== 'dist' &&
        item !== 'build'
      );
      
      filteredItems.forEach((item, index) => {
        const isLast = index === filteredItems.length - 1;
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        const connector = isLast ? '└── ' : '├── ';
        
        structure.push(`${prefix}${connector}${item}`);
        
        if (stats.isDirectory()) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          walk(itemPath, depth + 1, newPrefix);
        }
      });
    };
    
    walk(this.projectRoot, 0);
    return structure.join('\n');
  }
  
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.projectRoot, filePath);
  }
}
