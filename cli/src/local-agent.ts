import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger';
import { FileSystem } from './file-system';

const execAsync = promisify(exec);

export interface FileOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'rename' | 'copy';
  path: string;
  content?: string;
  newPath?: string;
}

export interface CommandOperation {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
}

export interface AgentInstruction {
  action: string;
  files?: FileOperation[];
  commands?: CommandOperation[];
  message?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export class LocalAgent {
  private logger: Logger;
  private fileSystem: FileSystem;
  private projectRoot: string;
  private safetyChecks: boolean;
  
  constructor(projectRoot: string, logger: Logger, safetyChecks: boolean = true) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.fileSystem = new FileSystem(projectRoot, logger);
    this.safetyChecks = safetyChecks;
  }
  
  /**
   * Process instructions from the AI agent
   */
  async processInstructions(instructions: AgentInstruction[]): Promise<AgentResponse[]> {
    const results: AgentResponse[] = [];
    
    for (const instruction of instructions) {
      try {
        const result = await this.executeInstruction(instruction);
        results.push(result);
        
        if (!result.success && this.safetyChecks) {
          this.logger.warn(`Stopping execution due to failed instruction: ${instruction.action}`);
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          message: `Error executing ${instruction.action}: ${(error as Error).message}`,
          errors: [(error as Error).message]
        });
        
        if (this.safetyChecks) break;
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single instruction
   */
  private async executeInstruction(instruction: AgentInstruction): Promise<AgentResponse> {
    switch (instruction.action) {
      case 'file_operations':
        return this.handleFileOperations(instruction.files || []);
      case 'run_commands':
        return this.handleCommands(instruction.commands || []);
      case 'create_file':
        return this.createFile(instruction.files?.[0]?.path || '', instruction.files?.[0]?.content || '');
      case 'read_file':
        return this.readFile(instruction.files?.[0]?.path || '');
      case 'update_file':
        return this.updateFile(instruction.files?.[0]?.path || '', instruction.files?.[0]?.content || '');
      case 'delete_file':
        return this.deleteFile(instruction.files?.[0]?.path || '');
      case 'list_files':
        return this.listFiles(instruction.files?.[0]?.path || '.');
      case 'run_command':
        return this.runCommand(instruction.commands?.[0] || { command: '' });
      case 'get_project_structure':
        return this.getProjectStructure();
      default:
        return { success: false, message: `Unknown action: ${instruction.action}` };
    }
  }
  
  /**
   * Handle multiple file operations
   */
  private async handleFileOperations(operations: FileOperation[]): Promise<AgentResponse> {
    const results: { path: string; success: boolean; error?: string }[] = [];
    
    for (const op of operations) {
      try {
        // Safety check: prevent operations outside project root
        if (this.safetyChecks && !this.isPathSafe(op.path)) {
          results.push({ path: op.path, success: false, error: 'Path outside project root' });
          continue;
        }
        
        switch (op.type) {
          case 'create':
          case 'update':
            await this.fileSystem.writeFile(op.path, op.content || '');
            results.push({ path: op.path, success: true });
            break;
            
          case 'read':
            await this.fileSystem.readFile(op.path);
            results.push({ path: op.path, success: true });
            break;
            
          case 'delete':
            await this.fileSystem.deleteFile(op.path);
            results.push({ path: op.path, success: true });
            break;
            
          case 'rename':
          case 'copy':
            if (op.newPath) {
              const content = await this.fileSystem.readFile(op.path);
              await this.fileSystem.writeFile(op.newPath, content);
              if (op.type === 'rename') {
                await this.fileSystem.deleteFile(op.path);
              }
              results.push({ path: op.path, success: true });
            } else {
              results.push({ path: op.path, success: false, error: 'newPath required for rename/copy' });
            }
            break;
        }
      } catch (error) {
        results.push({ path: op.path, success: false, error: (error as Error).message });
      }
    }
    
    const allSuccess = results.every(r => r.success);
    const errors = results.filter(r => !r.success).map(r => `${r.path}: ${r.error}`);
    
    return {
      success: allSuccess,
      message: allSuccess ? `All ${operations.length} file operations completed` : `${errors.length} operations failed`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Handle command execution
   */
  private async handleCommands(commands: CommandOperation[]): Promise<AgentResponse> {
    const results: { command: string; success: boolean; output?: string; error?: string }[] = [];
    
    for (const cmd of commands) {
      try {
        // Safety check: block dangerous commands
        if (this.safetyChecks && this.isDangerousCommand(cmd.command)) {
          results.push({ command: cmd.command, success: false, error: 'Command blocked for safety' });
          continue;
        }
        
        const result = await this.executeCommand(cmd);
        results.push({ command: cmd.command, success: true, output: result });
      } catch (error) {
        results.push({ command: cmd.command, success: false, error: (error as Error).message });
      }
    }
    
    const allSuccess = results.every(r => r.success);
    
    return {
      success: allSuccess,
      message: allSuccess ? `All ${commands.length} commands executed` : `Some commands failed`,
      data: results,
      errors: results.filter(r => !r.success).map(r => `${r.command}: ${r.error}`)
    };
  }
  
  /**
   * Create a new file
   */
  async createFile(filePath: string, content: string): Promise<AgentResponse> {
    try {
      if (this.safetyChecks && !this.isPathSafe(filePath)) {
        return { success: false, message: 'Path outside project root is not allowed' };
      }
      
      const exists = await this.fileSystem.fileExists(filePath);
      if (exists) {
        return { success: false, message: `File already exists: ${filePath}` };
      }
      
      await this.fileSystem.writeFile(filePath, content);
      this.logger.success(`Created file: ${filePath}`);
      
      return { success: true, message: `Created ${filePath}` };
    } catch (error) {
      return { success: false, message: `Failed to create file: ${(error as Error).message}` };
    }
  }
  
  /**
   * Read a file
   */
  async readFile(filePath: string): Promise<AgentResponse> {
    try {
      if (this.safetyChecks && !this.isPathSafe(filePath)) {
        return { success: false, message: 'Path outside project root is not allowed' };
      }
      
      const content = await this.fileSystem.readFile(filePath);
      return { success: true, message: `Read ${filePath}`, data: { content } };
    } catch (error) {
      return { success: false, message: `Failed to read file: ${(error as Error).message}` };
    }
  }
  
  /**
   * Update an existing file
   */
  async updateFile(filePath: string, content: string): Promise<AgentResponse> {
    try {
      if (this.safetyChecks && !this.isPathSafe(filePath)) {
        return { success: false, message: 'Path outside project root is not allowed' };
      }
      
      // Create backup before updating
      const exists = await this.fileSystem.fileExists(filePath);
      if (exists) {
        const original = await this.fileSystem.readFile(filePath);
        const backupPath = `${filePath}.backup`;
        await this.fileSystem.writeFile(backupPath, original);
      }
      
      await this.fileSystem.writeFile(filePath, content);
      this.logger.success(`Updated file: ${filePath}`);
      
      return { success: true, message: `Updated ${filePath}` };
    } catch (error) {
      return { success: false, message: `Failed to update file: ${(error as Error).message}` };
    }
  }
  
  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<AgentResponse> {
    try {
      if (this.safetyChecks && !this.isPathSafe(filePath)) {
        return { success: false, message: 'Path outside project root is not allowed' };
      }
      
      // Safety check: don't delete critical files
      if (this.safetyChecks && this.isCriticalFile(filePath)) {
        return { success: false, message: 'Cannot delete critical file' };
      }
      
      await this.fileSystem.deleteFile(filePath);
      this.logger.success(`Deleted file: ${filePath}`);
      
      return { success: true, message: `Deleted ${filePath}` };
    } catch (error) {
      return { success: false, message: `Failed to delete file: ${(error as Error).message}` };
    }
  }
  
  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<AgentResponse> {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.projectRoot, dirPath);
      
      if (this.safetyChecks && !fullPath.startsWith(this.projectRoot)) {
        return { success: false, message: 'Path outside project root is not allowed' };
      }
      
      const files = fs.readdirSync(fullPath, { withFileTypes: true });
      const listing = files.map(f => ({
        name: f.name,
        type: f.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, f.name)
      }));
      
      return { success: true, message: `Listed ${files.length} items in ${dirPath}`, data: listing };
    } catch (error) {
      return { success: false, message: `Failed to list files: ${(error as Error).message}` };
    }
  }
  
  /**
   * Run a command
   */
  async runCommand(cmd: CommandOperation): Promise<AgentResponse> {
    try {
      if (this.safetyChecks && this.isDangerousCommand(cmd.command)) {
        return { success: false, message: 'Command blocked for safety' };
      }
      
      const output = await this.executeCommand(cmd);
      return { success: true, message: `Command executed successfully`, data: { output } };
    } catch (error) {
      return { success: false, message: `Command failed: ${(error as Error).message}` };
    }
  }
  
  /**
   * Get project structure
   */
  async getProjectStructure(): Promise<AgentResponse> {
    try {
      const structure = await this.fileSystem.getProjectStructure(4);
      return { success: true, message: 'Project structure retrieved', data: { structure } };
    } catch (error) {
      return { success: false, message: `Failed to get structure: ${(error as Error).message}` };
    }
  }
  
  /**
   * Execute a shell command
   */
  private async executeCommand(cmd: CommandOperation): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullCommand = cmd.args ? `${cmd.command} ${cmd.args.join(' ')}` : cmd.command;
      const cwd = cmd.cwd || this.projectRoot;
      const timeout = cmd.timeout || 60000;
      
      this.logger.debug(`Executing: ${fullCommand} in ${cwd}`);
      
      exec(fullCommand, { cwd, timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }
  
  /**
   * Check if a path is safe (within project root)
   */
  private isPathSafe(filePath: string): boolean {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectRoot, filePath);
    const normalizedPath = path.normalize(fullPath);
    return normalizedPath.startsWith(this.projectRoot);
  }
  
  /**
   * Check if a command is dangerous
   */
  private isDangerousCommand(command: string): boolean {
    const dangerous = [
      'rm -rf /',
      'rm -rf ~',
      'rm -rf /*',
      'mkfs',
      'dd if=',
      ':(){:|:&};:',
      'chmod -R 777 /',
      'chown -R',
      '> /dev/sda',
      'wget.*|.*sh',
      'curl.*|.*sh',
      'sudo rm',
      'sudo chmod',
      'sudo chown',
    ];
    
    return dangerous.some(d => command.toLowerCase().includes(d.toLowerCase()));
  }
  
  /**
   * Check if a file is critical
   */
  private isCriticalFile(filePath: string): boolean {
    const critical = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      '.gitignore',
      '.env',
      'supabase/config.toml',
    ];
    
    return critical.some(c => filePath.endsWith(c));
  }
  
  /**
   * Parse AI response into instructions
   */
  parseAIResponse(response: string): AgentInstruction[] {
    const instructions: AgentInstruction[] = [];
    
    // Look for JSON code blocks
    const jsonMatches = response.match(/```json\s*([\s\S]*?)\s*```/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const jsonStr = match.replace(/```json\s*/, '').replace(/\s*```/, '');
          const parsed = JSON.parse(jsonStr);
          
          if (Array.isArray(parsed)) {
            instructions.push(...parsed);
          } else if (parsed.action) {
            instructions.push(parsed);
          }
        } catch (e) {
          this.logger.warn(`Failed to parse JSON instruction: ${(e as Error).message}`);
        }
      }
    }
    
    // Look for file creation patterns
    const fileMatches = response.match(/Create file[:\s]+`?([^`\n]+)`?[\s\S]*?```(?:typescript|javascript|tsx|jsx|json|css|html)?\s*([\s\S]*?)\s*```/gi);
    if (fileMatches) {
      for (const match of fileMatches) {
        const pathMatch = match.match(/Create file[:\s]+`?([^`\n]+)`?/i);
        const contentMatch = match.match(/```(?:typescript|javascript|tsx|jsx|json|css|html)?\s*([\s\S]*?)\s*```/i);
        
        if (pathMatch && contentMatch) {
          instructions.push({
            action: 'create_file',
            files: [{ type: 'create', path: pathMatch[1].trim(), content: contentMatch[1] }]
          });
        }
      }
    }
    
    return instructions;
  }
}
