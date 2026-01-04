import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

export interface Config {
  // AI Configuration
  aiGatewayUrl: string;
  aiApiKey: string;
  aiModel: string;
  
  // GitHub Configuration
  githubToken: string;
  
  // Project Configuration
  projectRoot: string;
  watchPatterns: string[];
  ignorePatterns: string[];
  
  // Execution Configuration
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  
  // Logging
  verbose: boolean;
  logFile: string;
}

export function loadConfig(projectPath?: string): Config {
  const root = projectPath || process.cwd();
  
  // Try to load project-specific config
  const configPath = path.join(root, '.hcl-dev.json');
  let projectConfig: Partial<Config> = {};
  
  if (fs.existsSync(configPath)) {
    try {
      projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('Warning: Could not parse .hcl-dev.json');
    }
  }
  
  return {
    // AI Configuration
    aiGatewayUrl: process.env.AI_GATEWAY_URL || 'https://ai.gateway.lovable.dev/v1/chat/completions',
    aiApiKey: process.env.AI_API_KEY || process.env.LOVABLE_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'google/gemini-2.5-flash',
    
    // GitHub Configuration
    githubToken: process.env.GITHUB_TOKEN || '',
    
    // Project Configuration
    projectRoot: root,
    watchPatterns: projectConfig.watchPatterns || ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.css'],
    ignorePatterns: projectConfig.ignorePatterns || ['node_modules/**', 'dist/**', '.git/**', 'build/**'],
    
    // Execution Configuration
    maxRetries: projectConfig.maxRetries || 5,
    retryDelay: projectConfig.retryDelay || 2000,
    timeout: projectConfig.timeout || 60000,
    
    // Logging
    verbose: process.env.VERBOSE === 'true' || false,
    logFile: path.join(root, '.hcl-dev.log'),
    
    ...projectConfig
  };
}

export function validateConfig(config: Config): string[] {
  const errors: string[] = [];
  
  if (!config.aiApiKey) {
    errors.push('AI_API_KEY or LOVABLE_API_KEY is required. Set it in .env file.');
  }
  
  if (!fs.existsSync(config.projectRoot)) {
    errors.push(`Project root does not exist: ${config.projectRoot}`);
  }
  
  return errors;
}
