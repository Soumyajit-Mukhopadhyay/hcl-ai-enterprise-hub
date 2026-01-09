import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from './logger';
import { LocalAgent, AgentInstruction, AgentResponse } from './local-agent';
import { FileSystem } from './file-system';
import { GitManager } from './git';
import { Executor } from './executor';

interface WebSocketMessage {
  type: string;
  requestId?: string;
  data?: any;
}

interface ConnectedClient {
  ws: WebSocket;
  authenticated: boolean;
  permissions: string[];
}

export class WebSocketAgentServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private logger: Logger;
  private agent: LocalAgent;
  private fileSystem: FileSystem;
  private gitManager: GitManager;
  private executor: Executor;
  private projectRoot: string;
  private authToken: string;
  
  constructor(projectRoot: string, logger: Logger, authToken?: string) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.agent = new LocalAgent(projectRoot, logger);
    this.fileSystem = new FileSystem(projectRoot, logger);
    this.gitManager = new GitManager(projectRoot, logger);
    this.executor = new Executor(projectRoot, logger);
    this.authToken = authToken || process.env.AGENT_AUTH_TOKEN || 'default-dev-token';
  }
  
  /**
   * Start the WebSocket server
   */
  start(port: number = 8765): void {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.logger.info(`Client connected: ${clientId}`);
      
      this.clients.set(clientId, {
        ws,
        authenticated: false,
        permissions: []
      });
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString()) as WebSocketMessage;
          await this.handleMessage(clientId, data);
        } catch (error) {
          this.sendError(clientId, 'Invalid message format', (error as Error).message);
        }
      });
      
      ws.on('close', () => {
        this.logger.info(`Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for ${clientId}`, error);
        this.clients.delete(clientId);
      });
      
      // Send welcome message
      this.send(clientId, {
        type: 'connected',
        data: { clientId, message: 'Connected to Local Agent Server' }
      });
    });
    
    this.logger.success(`WebSocket server started on port ${port}`);
    console.log(`\n🔌 WebSocket Agent Server running at ws://localhost:${port}`);
    console.log(`   Use this to connect the web AI to your local codebase\n`);
  }
  
  /**
   * Stop the server
   */
  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.logger.info('WebSocket server stopped');
    }
  }
  
  /**
   * Handle incoming messages
   */
  private async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Handle authentication first
    if (message.type === 'auth') {
      await this.handleAuth(clientId, message);
      return;
    }
    
    // All other messages require authentication
    if (!client.authenticated) {
      this.sendError(clientId, 'Not authenticated', 'Please authenticate first', message.requestId);
      return;
    }
    
    switch (message.type) {
      case 'ping':
        this.send(clientId, { type: 'pong', requestId: message.requestId });
        break;
        
      case 'create_file':
        await this.handleCreateFile(clientId, message);
        break;
        
      case 'read_file':
        await this.handleReadFile(clientId, message);
        break;
        
      case 'update_file':
        await this.handleUpdateFile(clientId, message);
        break;
        
      case 'delete_file':
        await this.handleDeleteFile(clientId, message);
        break;
        
      case 'list_files':
        await this.handleListFiles(clientId, message);
        break;
        
      case 'run_command':
        await this.handleRunCommand(clientId, message);
        break;
        
      case 'get_structure':
        await this.handleGetStructure(clientId, message);
        break;
        
      case 'git_status':
        await this.handleGitStatus(clientId, message);
        break;
        
      case 'git_commit':
        await this.handleGitCommit(clientId, message);
        break;
        
      case 'git_push':
        await this.handleGitPush(clientId, message);
        break;
        
      case 'git_pull':
        await this.handleGitPull(clientId, message);
        break;
        
      case 'execute_instructions':
        await this.handleExecuteInstructions(clientId, message);
        break;
        
      case 'type_check':
        await this.handleTypeCheck(clientId, message);
        break;
        
      case 'build':
        await this.handleBuild(clientId, message);
        break;
        
      default:
        this.sendError(clientId, 'Unknown message type', message.type, message.requestId);
    }
  }
  
  /**
   * Authentication handler
   */
  private async handleAuth(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const token = message.data?.token;
    
    if (token === this.authToken) {
      client.authenticated = true;
      client.permissions = message.data?.permissions || ['read', 'write', 'execute'];
      
      this.send(clientId, {
        type: 'auth_success',
        requestId: message.requestId,
        data: { 
          authenticated: true,
          permissions: client.permissions,
          projectRoot: this.projectRoot
        }
      });
      
      this.logger.success(`Client ${clientId} authenticated`);
    } else {
      this.sendError(clientId, 'Authentication failed', 'Invalid token', message.requestId);
    }
  }
  
  /**
   * File operation handlers
   */
  private async handleCreateFile(clientId: string, message: WebSocketMessage): Promise<void> {
    const { path, content } = message.data || {};
    const result = await this.agent.createFile(path, content);
    this.sendResult(clientId, 'file_created', result, message.requestId);
  }
  
  private async handleReadFile(clientId: string, message: WebSocketMessage): Promise<void> {
    const { path } = message.data || {};
    const result = await this.agent.readFile(path);
    this.sendResult(clientId, 'file_content', result, message.requestId);
  }
  
  private async handleUpdateFile(clientId: string, message: WebSocketMessage): Promise<void> {
    const { path, content } = message.data || {};
    const result = await this.agent.updateFile(path, content);
    this.sendResult(clientId, 'file_updated', result, message.requestId);
  }
  
  private async handleDeleteFile(clientId: string, message: WebSocketMessage): Promise<void> {
    const { path } = message.data || {};
    const result = await this.agent.deleteFile(path);
    this.sendResult(clientId, 'file_deleted', result, message.requestId);
  }
  
  private async handleListFiles(clientId: string, message: WebSocketMessage): Promise<void> {
    const { path } = message.data || {};
    const result = await this.agent.listFiles(path || '.');
    this.sendResult(clientId, 'files_listed', result, message.requestId);
  }
  
  /**
   * Command execution handler
   */
  private async handleRunCommand(clientId: string, message: WebSocketMessage): Promise<void> {
    const { command, args, cwd, timeout } = message.data || {};
    const result = await this.agent.runCommand({ command, args, cwd, timeout });
    this.sendResult(clientId, 'command_result', result, message.requestId);
  }
  
  /**
   * Project structure handler
   */
  private async handleGetStructure(clientId: string, message: WebSocketMessage): Promise<void> {
    const result = await this.agent.getProjectStructure();
    this.sendResult(clientId, 'structure', result, message.requestId);
  }
  
  /**
   * Git operation handlers
   */
  private async handleGitStatus(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      const status = await this.gitManager.getStatus();
      this.send(clientId, {
        type: 'git_status',
        requestId: message.requestId,
        data: { success: true, status }
      });
    } catch (error) {
      this.sendError(clientId, 'Git status failed', (error as Error).message, message.requestId);
    }
  }
  
  private async handleGitCommit(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      const { commitMessage } = message.data || {};
      await this.gitManager.commit(commitMessage || 'AI-assisted changes');
      this.send(clientId, {
        type: 'git_committed',
        requestId: message.requestId,
        data: { success: true, message: 'Changes committed' }
      });
    } catch (error) {
      this.sendError(clientId, 'Git commit failed', (error as Error).message, message.requestId);
    }
  }
  
  private async handleGitPush(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      await this.gitManager.push();
      this.send(clientId, {
        type: 'git_pushed',
        requestId: message.requestId,
        data: { success: true, message: 'Changes pushed' }
      });
    } catch (error) {
      this.sendError(clientId, 'Git push failed', (error as Error).message, message.requestId);
    }
  }
  
  private async handleGitPull(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      await this.gitManager.pull();
      this.send(clientId, {
        type: 'git_pulled',
        requestId: message.requestId,
        data: { success: true, message: 'Changes pulled' }
      });
    } catch (error) {
      this.sendError(clientId, 'Git pull failed', (error as Error).message, message.requestId);
    }
  }
  
  /**
   * Execute multiple instructions
   */
  private async handleExecuteInstructions(clientId: string, message: WebSocketMessage): Promise<void> {
    const instructions = message.data?.instructions as AgentInstruction[];
    
    if (!instructions || !Array.isArray(instructions)) {
      this.sendError(clientId, 'Invalid instructions', 'Expected array of instructions', message.requestId);
      return;
    }
    
    const results = await this.agent.processInstructions(instructions);
    this.send(clientId, {
      type: 'instructions_executed',
      requestId: message.requestId,
      data: { success: results.every(r => r.success), results }
    });
  }
  
  /**
   * Type check handler
   */
  private async handleTypeCheck(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      const result = await this.executor.typeCheck();
      this.send(clientId, {
        type: 'type_check_result',
        requestId: message.requestId,
        data: { 
          success: result.success,
          errors: result.errors,
          output: result.stdout
        }
      });
    } catch (error) {
      this.sendError(clientId, 'Type check failed', (error as Error).message, message.requestId);
    }
  }
  
  /**
   * Build handler
   */
  private async handleBuild(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      const result = await this.executor.build();
      this.send(clientId, {
        type: 'build_result',
        requestId: message.requestId,
        data: { 
          success: result.success,
          errors: result.errors,
          output: result.stdout
        }
      });
    } catch (error) {
      this.sendError(clientId, 'Build failed', (error as Error).message, message.requestId);
    }
  }
  
  /**
   * Utility methods
   */
  private send(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
  
  private sendResult(clientId: string, type: string, result: AgentResponse, requestId?: string): void {
    this.send(clientId, { type, requestId, data: result });
  }
  
  private sendError(clientId: string, error: string, details?: string, requestId?: string): void {
    this.send(clientId, {
      type: 'error',
      requestId,
      data: { success: false, error, details }
    });
  }
  
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
