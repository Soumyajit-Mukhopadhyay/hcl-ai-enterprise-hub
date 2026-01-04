import axios from 'axios';
import { Config } from './config';
import { Logger } from './logger';
import { ParsedError } from './executor';
import { FileChange } from './file-system';

export interface AIResponse {
  analysis: string;
  fixes: FileChange[];
  confidence: number;
  reasoning: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIAgent {
  private config: Config;
  private logger: Logger;
  private conversationHistory: ConversationMessage[] = [];
  
  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeConversation();
  }
  
  private initializeConversation(): void {
    this.conversationHistory = [{
      role: 'system',
      content: `You are an expert full-stack developer AI assistant. Your job is to analyze code errors and provide fixes.

IMPORTANT RULES:
1. Always return valid JSON in your responses when fixing errors
2. Provide complete file contents in your fixes, not just snippets
3. Explain your reasoning clearly
4. If you're uncertain, say so and provide your best guess with lower confidence
5. Consider the entire project context when making fixes
6. Follow the existing code style and patterns
7. Don't introduce new dependencies unless absolutely necessary

When analyzing errors, consider:
- TypeScript type errors and how to fix them
- Import/export issues
- React component errors
- Build configuration problems
- ESLint/linting issues

Response format for fixes (use this JSON structure):
{
  "analysis": "Brief analysis of the problem",
  "reasoning": "Step-by-step reasoning for the fix",
  "confidence": 0.0-1.0,
  "fixes": [
    {
      "file": "relative/path/to/file.ts",
      "description": "What this fix does",
      "newContent": "Complete new file content"
    }
  ]
}`
    }];
  }
  
  async analyzeErrors(
    errors: ParsedError[],
    fileContents: Map<string, string>,
    projectStructure: string
  ): Promise<AIResponse> {
    this.logger.info('Analyzing errors with AI...');
    
    const errorSummary = errors.map(e => 
      `${e.type.toUpperCase()} in ${e.file}${e.line ? `:${e.line}` : ''}: ${e.message}`
    ).join('\n');
    
    const fileContexts = Array.from(fileContents.entries())
      .map(([file, content]) => `--- ${file} ---\n${content}\n--- end ${file} ---`)
      .join('\n\n');
    
    const userMessage = `
I have the following errors in my project:

${errorSummary}

Project structure:
${projectStructure}

Relevant file contents:
${fileContexts}

Please analyze these errors and provide fixes. Return your response as valid JSON with the structure:
{
  "analysis": "...",
  "reasoning": "...",
  "confidence": 0.0-1.0,
  "fixes": [{"file": "...", "description": "...", "newContent": "..."}]
}`;
    
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });
    
    try {
      const response = await this.callAI();
      
      // Parse the AI response
      const parsed = this.parseAIResponse(response);
      
      this.conversationHistory.push({
        role: 'assistant',
        content: response
      });
      
      return parsed;
    } catch (error) {
      this.logger.error('AI analysis failed', error as Error);
      throw error;
    }
  }
  
  async provideFeedback(wasSuccessful: boolean, remainingErrors?: ParsedError[]): Promise<AIResponse | null> {
    if (wasSuccessful) {
      this.conversationHistory.push({
        role: 'user',
        content: 'The fix worked! All errors are resolved. Thank you.'
      });
      return null;
    }
    
    const errorSummary = remainingErrors?.map(e => 
      `${e.type.toUpperCase()} in ${e.file}${e.line ? `:${e.line}` : ''}: ${e.message}`
    ).join('\n') || 'Unknown errors remain';
    
    this.conversationHistory.push({
      role: 'user',
      content: `The previous fix didn't fully work. There are still errors:

${errorSummary}

Please analyze what went wrong and provide an updated fix. Remember to return valid JSON.`
    });
    
    try {
      const response = await this.callAI();
      const parsed = this.parseAIResponse(response);
      
      this.conversationHistory.push({
        role: 'assistant',
        content: response
      });
      
      return parsed;
    } catch (error) {
      this.logger.error('AI feedback analysis failed', error as Error);
      throw error;
    }
  }
  
  private async callAI(): Promise<string> {
    const response = await axios.post(
      this.config.aiGatewayUrl,
      {
        model: this.config.aiModel,
        messages: this.conversationHistory,
        temperature: 0.2,
        max_tokens: 8000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    return response.data.choices[0].message.content;
  }
  
  private parseAIResponse(response: string): AIResponse {
    // Try to extract JSON from the response
    let jsonStr = response;
    
    // Handle markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      return {
        analysis: parsed.analysis || 'No analysis provided',
        fixes: (parsed.fixes || []).map((fix: any) => ({
          file: fix.file,
          originalContent: '',
          newContent: fix.newContent || fix.content || '',
          description: fix.description || 'No description'
        })),
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (e) {
      this.logger.warn('Could not parse AI response as JSON, treating as analysis only');
      
      return {
        analysis: response,
        fixes: [],
        confidence: 0.3,
        reasoning: 'Response was not in expected JSON format'
      };
    }
  }
  
  resetConversation(): void {
    this.initializeConversation();
  }
}
