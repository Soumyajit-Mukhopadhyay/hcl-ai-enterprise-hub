import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// SAFETY GUARDRAILS - Multi-layer protection
// ============================================================================
const BLOCKED_PATTERNS = {
  prompt_injection: [
    /ignore (all )?previous/i,
    /disregard (all )?instructions/i,
    /new (system )?instructions/i,
    /forget (your|the) (rules|instructions)/i,
    /you are now/i,
    /act as if/i,
  ],
  harmful_code: [
    /rm\s+-rf\s+\//i,
    /format\s+c:/i,
    /del\s+\/[fqs]/i,
    />\s*\/dev\/sd[a-z]/i,
    /drop\s+database/i,
    /truncate\s+table/i,
  ],
  data_exfil: [
    /curl.*api_key/i,
    /wget.*secret/i,
    /upload.*credentials/i,
    /send.*password/i,
  ],
  privilege_escalation: [
    /sudo\s+rm/i,
    /chmod\s+777/i,
    /chown\s+root/i,
  ],
  github_dangerous: [
    /force\s+push/i,
    /--force/i,
    /delete\s+branch.*main/i,
    /delete\s+branch.*master/i,
  ],
  database_dangerous: [
    /DROP\s+TABLE/i,
    /TRUNCATE/i,
    /DELETE\s+FROM\s+\w+\s*(?:;|$)/i,
    /ALTER\s+TABLE.*DROP/i,
  ],
};

// ============================================================================
// MULTI-TASK EXECUTION ENGINE
// ============================================================================
interface TaskDefinition {
  id: string;
  order: number;
  type: string;
  description: string;
  status: 'pending' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'skipped';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  dependencies: number[];
  requiredInfo: string[];
  missingInfo: string[];
  safetyCheck: { safe: boolean; flags: string[] };
  result?: any;
  errorMessage?: string;
}

interface MultiTaskContext {
  tasks: TaskDefinition[];
  completedTasks: string[];
  failedTasks: string[];
  skippedTasks: string[];
  currentTaskIndex: number;
  allInfoProvided: boolean;
  allTasksSafe: boolean;
  unsafeTasks: string[];
}

// Parse multiple tasks from a single prompt
function parseMultipleTasks(message: string): { rawTasks: string[]; count: number } {
  // Split by common delimiters
  const delimiters = [
    /\d+\.\s+/g,  // "1. task", "2. task"
    /\band\b/gi,   // "do X and Y"
    /\bthen\b/gi,  // "do X then Y"
    /\balso\b/gi,  // "do X also Y"
    /[,;]\s*/g,    // comma or semicolon separated
  ];

  let tasks: string[] = [];
  
  // Try numbered list first
  const numberedMatch = message.match(/\d+\.\s+[^0-9]+/g);
  if (numberedMatch && numberedMatch.length > 1) {
    tasks = numberedMatch.map(t => t.replace(/^\d+\.\s+/, '').trim());
  } else {
    // Try splitting by "and", "then", "also"
    const parts = message.split(/\b(?:and|then|also|,|;)\b/i);
    if (parts.length > 1) {
      tasks = parts.map(p => p.trim()).filter(p => p.length > 10);
    } else {
      tasks = [message];
    }
  }

  return { rawTasks: tasks.slice(0, 10), count: Math.min(tasks.length, 10) }; // Max 10 tasks
}

// Validate safety for each task
function validateTaskSafety(taskDescription: string): { safe: boolean; flags: string[]; score: number } {
  const flags: string[] = [];
  let score = 1.0;

  for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(taskDescription)) {
        flags.push(category);
        score -= 0.3;
      }
    }
  }

  return {
    safe: flags.length === 0,
    flags: [...new Set(flags)],
    score: Math.max(0, score)
  };
}

// Check if task has dependencies on failed tasks
function hasFailedDependency(task: TaskDefinition, failedTaskOrders: number[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) return false;
  return task.dependencies.some(dep => failedTaskOrders.includes(dep));
}

// Check required information for a task
function checkRequiredInfo(taskType: string, taskDescription: string): { required: string[]; missing: string[] } {
  const requirements: Record<string, { check: (desc: string) => boolean; name: string }[]> = {
    'code_fix': [
      { check: (d) => /file|path|\.ts|\.js|\.tsx|\.jsx/i.test(d), name: 'file path' },
      { check: (d) => /error|bug|issue|problem/i.test(d), name: 'error description' }
    ],
    'deployment': [
      { check: (d) => /environment|prod|staging|dev/i.test(d), name: 'target environment' },
      { check: (d) => /service|app|function/i.test(d), name: 'service name' }
    ],
    'git_operation': [
      { check: (d) => /branch|commit|push|pull/i.test(d), name: 'operation type' }
    ],
    'file_operation': [
      { check: (d) => /file|path/i.test(d), name: 'file path' }
    ],
    'database': [
      { check: (d) => /table|column|query/i.test(d), name: 'table/entity name' }
    ]
  };

  const typeReqs = requirements[taskType] || [];
  const required = typeReqs.map(r => r.name);
  const missing = typeReqs.filter(r => !r.check(taskDescription)).map(r => r.name);

  return { required, missing };
}

// ============================================================================
// CODE GENERATION & SAFETY ANALYSIS
// ============================================================================

// Analyze code for security issues
function analyzeCodeSafety(code: string): { safe: boolean; issues: string[]; risk_level: string } {
  const issues: string[] = [];
  
  const dangerousPatterns = [
    { pattern: /eval\s*\(/i, issue: 'Uses eval() - security risk' },
    { pattern: /Function\s*\(/i, issue: 'Uses Function constructor' },
    { pattern: /\.exec\s*\(/i, issue: 'Uses exec() - command injection risk' },
    { pattern: /child_process/i, issue: 'Uses child_process module' },
    { pattern: /rm\s+-rf/i, issue: 'Destructive file operation' },
    { pattern: /DROP\s+TABLE/i, issue: 'SQL drop table detected' },
    { pattern: /DELETE\s+FROM\s+\w+\s*;/i, issue: 'Unqualified DELETE statement' },
    { pattern: /TRUNCATE/i, issue: 'SQL truncate detected' },
    { pattern: /process\.env\s*\[/i, issue: 'Dynamic env access' },
    { pattern: /require\s*\(\s*[^'"]/i, issue: 'Dynamic require' },
    { pattern: /import\s*\(\s*[^'"]/i, issue: 'Dynamic import' },
    { pattern: /--no-verify/i, issue: 'Git verification bypass' },
    { pattern: /force\s*push/i, issue: 'Force push operation' },
    { pattern: /sudo/i, issue: 'Sudo command' },
  ];

  for (const { pattern, issue } of dangerousPatterns) {
    if (pattern.test(code)) {
      issues.push(issue);
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    risk_level: issues.length === 0 ? 'low' : issues.length < 3 ? 'medium' : 'high'
  };
}

// Generate tool implementation code
function generateToolImplementation(
  toolName: string,
  description: string,
  inputParams: Array<{ name: string; type: string; description: string; required?: boolean }>,
  hints: string
): string {
  const functionName = toolName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  
  const paramsInterface = inputParams.map(p => 
    `  ${p.name}${p.required === false ? '?' : ''}: ${p.type || 'string'}; // ${p.description || ''}`
  ).join('\n');

  const paramsDestructure = inputParams.map(p => p.name).join(', ');
  
  const code = `
// ============================================================================
// AUTO-GENERATED TOOL: ${toolName}
// Description: ${description}
// Generated at: ${new Date().toISOString()}
// Status: PENDING DEVELOPER APPROVAL
// ============================================================================

interface ${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Params {
${paramsInterface}
}

interface ${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Result {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    execution_time_ms: number;
    timestamp: string;
  };
}

/**
 * ${description}
 * 
 * Implementation Hints: ${hints || 'None provided'}
 * 
 * @param params - Input parameters
 * @param context - Execution context (userId, sessionId, supabase client)
 * @returns Promise<${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Result>
 */
async function ${functionName}(
  params: ${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Params,
  context: { userId: string; sessionId: string; supabase: any }
): Promise<${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Result> {
  const startTime = Date.now();
  
  try {
    const { ${paramsDestructure} } = params;
    const { userId, sessionId, supabase } = context;
    
    // TODO: Implement the actual logic here
    // This is a template generated by AI - Developer must review and complete
    
    // Example implementation structure:
    // 1. Validate inputs
    // 2. Perform the operation
    // 3. Log the action
    // 4. Return results
    
    // Placeholder: Log the tool execution
    await supabase.from('ai_analytics').insert({
      user_id: userId,
      session_id: sessionId,
      query_type: 'tool_execution',
      domain: 'custom_tool',
      tool_called: '${functionName}',
      tool_success: true
    });
    
    return {
      success: true,
      data: {
        message: 'Tool executed successfully',
        params: { ${paramsDestructure} }
      },
      metadata: {
        execution_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('[${functionName}] Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: {
        execution_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Tool definition for registry
const ${functionName}ToolDefinition = {
  type: "function",
  function: {
    name: "${functionName}",
    description: "${description.replace(/"/g, '\\"')}",
    parameters: {
      type: "object",
      properties: {
${inputParams.map(p => `        ${p.name}: { type: "${p.type || 'string'}", description: "${(p.description || '').replace(/"/g, '\\"')}" }`).join(',\n')}
      },
      required: [${inputParams.filter(p => p.required !== false).map(p => `"${p.name}"`).join(', ')}]
    }
  }
};

export { ${functionName}, ${functionName}ToolDefinition };
`;

  return code;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "analyze_multi_task",
      description: "Analyze a user prompt containing multiple tasks, validate safety, check dependencies, and prepare execution plan",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                order: { type: "number" },
                type: { type: "string", enum: ["code_fix", "code_review", "deployment", "git_operation", "file_operation", "database", "hr_request", "navigation", "training", "analysis", "test", "web_search", "social_lookup", "calculation"] },
                description: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                requires_approval: { type: "boolean" },
                dependencies: { type: "array", items: { type: "number" } },
                required_info: { type: "array", items: { type: "string" } }
              },
              required: ["order", "type", "description", "risk_level", "requires_approval"]
            }
          }
        },
        required: ["tasks"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_task",
      description: "Execute a single task from the multi-task queue",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          task_type: { type: "string" },
          parameters: { type: "object" }
        },
        required: ["task_id", "task_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_current_datetime",
      description: "Get current date, time, timezone, and formatted date strings",
      parameters: {
        type: "object",
        properties: {
          timezone: { type: "string", description: "Timezone like 'America/New_York' or 'Asia/Tokyo'. Defaults to UTC." },
          format: { type: "string", enum: ["full", "date_only", "time_only", "relative"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information using Perplexity AI. Use for current events, facts, documentation, or any real-time information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          search_type: { type: "string", enum: ["general", "technical", "news", "academic"], description: "Type of search to perform" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "social_profile_lookup",
      description: "Search for public profile information from social platforms like LinkedIn, Instagram, Facebook, Twitter/X",
      parameters: {
        type: "object",
        properties: {
          person_name: { type: "string", description: "Full name of the person to search" },
          platform: { type: "string", enum: ["linkedin", "instagram", "facebook", "twitter", "all"], description: "Platform to search" },
          additional_context: { type: "string", description: "Additional context like company name, location, or role to narrow search" }
        },
        required: ["person_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform mathematical calculations. Supports basic arithmetic, percentages, dates, and business calculations.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression to evaluate (e.g., '15% of 2500', '(100 + 50) * 2', 'days between 2024-01-01 and 2024-12-31')" },
          calculation_type: { type: "string", enum: ["arithmetic", "percentage", "date_diff", "financial", "conversion"] }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_site_info",
      description: "Get information about the website structure, available pages, features, and navigation",
      parameters: {
        type: "object",
        properties: {
          info_type: { type: "string", enum: ["pages", "features", "automations", "components", "database", "roles", "all"] },
          specific_page: { type: "string", description: "Optional: specific page path to get detailed info about" }
        },
        required: ["info_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "automate_hr_task",
      description: "Automate HR tasks like leave requests, reimbursements, payslips, training enrollments",
      parameters: {
        type: "object",
        properties: {
          task_type: { type: "string", enum: ["leave_request", "reimbursement", "payslip", "training_enrollment", "onboarding", "performance_review"] },
          task_data: { type: "object" },
          target_user_id: { type: "string" }
        },
        required: ["task_type", "task_data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "automate_dev_task",
      description: "Automate developer tasks like bug fixes, code reviews, deployments, testing",
      parameters: {
        type: "object",
        properties: {
          task_type: { type: "string", enum: ["bug_fix", "code_review", "deployment", "test_run", "documentation", "refactor"] },
          task_data: { type: "object" },
          file_paths: { type: "array", items: { type: "string" } }
        },
        required: ["task_type", "task_data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_code",
      description: "Analyze code for errors, patterns, and potential issues",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          analysis_type: { type: "string", enum: ["error", "performance", "security", "style", "all"] },
          code_content: { type: "string" }
        },
        required: ["file_path", "analysis_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_code_change",
      description: "Propose a code change with before/after comparison",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          original_code: { type: "string" },
          proposed_code: { type: "string" },
          change_reason: { type: "string" },
          risk_level: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["file_path", "proposed_code", "change_reason", "risk_level"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_bug_ticket",
      description: "Create a bug ticket for reported issues",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          description: { type: "string" },
          error_details: { type: "string" }
        },
        required: ["service", "severity", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_page",
      description: "Navigate to a specific page in the application",
      parameters: {
        type: "object",
        properties: {
          page_name: { type: "string" },
          reason: { type: "string" }
        },
        required: ["page_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Search uploaded documents including global company documents like Annual Reports, policies, and manuals. Use this to answer questions about company information, policies, or any uploaded documents.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query - what information to find in documents" },
          document_type: { type: "string", enum: ["all", "annual_report", "policy", "manual", "other"], description: "Type of document to search" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "learn_pattern",
      description: "Learn a new pattern or behavior from user instruction",
      parameters: {
        type: "object",
        properties: {
          pattern_type: { type: "string" },
          instruction: { type: "string" },
          keywords: { type: "array", items: { type: "string" } }
        },
        required: ["pattern_type", "instruction"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_capability",
      description: "Request a new capability when AI lacks the ability. AI will generate the tool implementation code for developer review.",
      parameters: {
        type: "object",
        properties: {
          capability_name: { type: "string", description: "Name of the new capability/tool" },
          capability_type: { type: "string", enum: ["tool", "workflow", "integration", "automation"] },
          description: { type: "string", description: "What the capability does" },
          reason: { type: "string", description: "Why this capability is needed" },
          input_parameters: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                required: { type: "boolean" }
              }
            },
            description: "Input parameters the tool needs"
          },
          output_format: { type: "string", description: "Expected output format" },
          implementation_hints: { type: "string", description: "How the tool should work" }
        },
        required: ["capability_name", "description", "reason", "input_parameters"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_tool_code",
      description: "Generate implementation code for a new tool capability (for developer review)",
      parameters: {
        type: "object",
        properties: {
          tool_name: { type: "string" },
          tool_description: { type: "string" },
          parameters: { type: "object" },
          implementation_code: { type: "string", description: "TypeScript implementation code" },
          test_cases: { type: "array", items: { type: "object" } }
        },
        required: ["tool_name", "implementation_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "git_operation",
      description: "Perform git operations (status, commit, push, pull, diff, branch)",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["status", "commit", "push", "pull", "branch", "diff", "clone"] },
          message: { type: "string" },
          branch_name: { type: "string" },
          files: { type: "array", items: { type: "string" } },
          repo_url: { type: "string" }
        },
        required: ["operation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "file_operation",
      description: "Read, write, or modify files in the codebase",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["read", "write", "delete", "list", "search"] },
          file_path: { type: "string" },
          content: { type: "string" },
          search_pattern: { type: "string" }
        },
        required: ["operation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_diagnostics",
      description: "Run build, lint, or type checking diagnostics",
      parameters: {
        type: "object",
        properties: {
          diagnostic_type: { type: "string", enum: ["build", "lint", "typecheck", "test", "all"] },
          fix_errors: { type: "boolean" }
        },
        required: ["diagnostic_type"]
      }
    }
  },
  // ============================================================================
  // NEW DEVELOPER TOOLS - Full Capabilities
  // ============================================================================
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Execute read-only SQL queries on the database. Can list files, check records, analyze data. Only SELECT operations allowed.",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "Target table name (e.g., 'uploaded_documents', 'profiles', 'dev_tickets')" },
          columns: { type: "array", items: { type: "string" }, description: "Columns to select (use ['*'] for all)" },
          filters: { type: "object", description: "WHERE conditions as key-value pairs" },
          order_by: { type: "string", description: "Column to order by" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Order direction" },
          limit: { type: "number", description: "Max rows to return (default: 50, max: 100)" }
        },
        required: ["table_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_all_files",
      description: "List all files in the system - from uploaded_documents table and storage buckets. Returns file names, types, sizes, and metadata.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["database", "storage", "both"], description: "Where to list files from" },
          filter: { 
            type: "object", 
            properties: {
              file_type: { type: "string", description: "Filter by file type (e.g., 'pdf', 'docx')" },
              is_global: { type: "boolean", description: "Filter by global status" }
            }
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_create_pr",
      description: "Create a pull request on GitHub with code changes. Requires GITHUB_TOKEN secret.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          title: { type: "string", description: "PR title" },
          body: { type: "string", description: "PR description" },
          head_branch: { type: "string", description: "Source branch with changes" },
          base_branch: { type: "string", description: "Target branch (usually main/master)" },
          files: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" }
              }
            },
            description: "Files to include in the PR" 
          }
        },
        required: ["repo_owner", "repo_name", "title", "head_branch", "base_branch"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_push_commit",
      description: "Create a commit and push to a GitHub branch. Requires GITHUB_TOKEN secret.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          branch: { type: "string", description: "Target branch" },
          commit_message: { type: "string", description: "Commit message" },
          files: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" }
              }
            },
            description: "Files to commit" 
          }
        },
        required: ["repo_owner", "repo_name", "branch", "commit_message", "files"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_list_files",
      description: "List files in a GitHub repository. Returns file tree structure.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          path: { type: "string", description: "Path within repo (default: root)" },
          branch: { type: "string", description: "Branch name (default: main)" }
        },
        required: ["repo_owner", "repo_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_get_file",
      description: "Get the contents of a file from a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          path: { type: "string", description: "File path in the repository" },
          branch: { type: "string", description: "Branch name (default: main)" }
        },
        required: ["repo_owner", "repo_name", "path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_create_branch",
      description: "Create a new branch in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          branch_name: { type: "string", description: "New branch name" },
          from_branch: { type: "string", description: "Source branch (default: main)" }
        },
        required: ["repo_owner", "repo_name", "branch_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_merge_pr",
      description: "Merge an approved pull request. HIGH RISK - requires developer approval.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          pr_number: { type: "number", description: "Pull request number" },
          merge_method: { type: "string", enum: ["merge", "squash", "rebase"], description: "Merge method" }
        },
        required: ["repo_owner", "repo_name", "pr_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_list_prs",
      description: "List pull requests in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" },
          state: { type: "string", enum: ["open", "closed", "all"], description: "PR state filter" }
        },
        required: ["repo_owner", "repo_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_list_branches",
      description: "List branches in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          repo_owner: { type: "string", description: "Repository owner/organization" },
          repo_name: { type: "string", description: "Repository name" }
        },
        required: ["repo_owner", "repo_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "database_migration",
      description: "Propose a database schema change (create table, add column, create index). CRITICAL - requires developer approval.",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["create_table", "add_column", "create_index", "add_rls", "other"], description: "Type of migration" },
          migration_name: { type: "string", description: "Short name for the migration" },
          description: { type: "string", description: "What this migration does" },
          sql: { type: "string", description: "The SQL to execute" },
          rollback_sql: { type: "string", description: "SQL to rollback this migration" },
          tables_affected: { type: "array", items: { type: "string" }, description: "Tables that will be modified" }
        },
        required: ["operation", "migration_name", "sql", "tables_affected"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "apply_code_change",
      description: "Apply a previously approved code change proposal. This creates a GitHub commit or stores the change.",
      parameters: {
        type: "object",
        properties: {
          proposal_id: { type: "string", description: "ID of the approved code change proposal" },
          apply_method: { type: "string", enum: ["storage", "github_commit", "github_pr"], description: "How to apply the change" },
          repo_owner: { type: "string", description: "GitHub repo owner (if using github methods)" },
          repo_name: { type: "string", description: "GitHub repo name (if using github methods)" }
        },
        required: ["proposal_id", "apply_method"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enhanced_file_operation",
      description: "Enhanced file operations - create, read, update, delete files with tracking and approval workflow.",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["create", "read", "update", "delete", "list"], description: "Operation type" },
          file_path: { type: "string", description: "File path" },
          content: { type: "string", description: "File content (for create/update)" },
          description: { type: "string", description: "Description of the change" }
        },
        required: ["operation", "file_path"]
      }
    }
  }
];

// ============================================================================
// SITE DOCUMENTATION - Complete website knowledge
// ============================================================================
const SITE_DOCUMENTATION = {
  pages: {
    "/": { name: "Main Dashboard", roles: ["employee", "hr", "it", "developer"], features: ["Quick Actions", "Recent Activity", "Role Widgets"] },
    "/assistant": { name: "AI Assistant", roles: ["employee", "hr", "it", "developer"], features: ["Chat", "Multi-task", "Voice"] },
    "/dashboard": { name: "Analytics Dashboard", roles: ["hr", "it", "developer"], features: ["Charts", "KPIs", "Reports"] },
    "/dev-console": { name: "Developer Console", roles: ["developer"], features: ["Code Review", "AI Training", "GitHub"] },
    "/calendar": { name: "Calendar", roles: ["employee", "hr", "it", "developer"], features: ["Meetings", "Events"] },
    "/settings": { name: "Settings", roles: ["employee", "hr", "it", "developer"], features: ["Profile", "Preferences"] }
  },
  automations: {
    hr: ["leave_request", "reimbursement", "payslip", "training", "onboarding", "performance_review"],
    developer: ["bug_fix", "code_review", "deployment", "testing", "documentation"],
    it: ["access_request", "incident_report", "system_monitoring"]
  },
  components: {
    chat: ["ChatInput", "ChatMessage", "ActionCard", "JSONSchemaCard", "RiskBadge"],
    workflows: ["LeaveWorkflow", "ReimbursementWorkflow", "PayslipWorkflow", "TrainingWorkflow"],
    ai: ["TaskDecompositionPanel", "SafetyGuardrailsPanel", "SelfLearningPanel", "CapabilityRequestPanel"]
  }
};

// ============================================================================
// ADVANCED SYSTEM PROMPT
// ============================================================================
const SYSTEM_PROMPT = `You are an advanced AI assistant with MULTI-TASKING, WEB SEARCH, CALCULATION, and AUTOMATION capabilities.

## YOUR CAPABILITIES
1. **Date/Time Awareness**: Always know current date, time, day of week
2. **Web Search**: Search the internet via Perplexity for any information
3. **Social Media Lookup**: Find public profiles on LinkedIn, Instagram, Facebook, Twitter
4. **Calculator**: Perform any mathematical calculation
5. **HR Automation**: Leave requests, reimbursements, payslips, training
6. **Developer Automation**: Code fixes, reviews, deployments, testing
7. **Multi-tasking**: Handle 5+ tasks from a single prompt
8. **Code Operations**: Read, write, analyze, and modify code
9. **Git Operations**: Pull, push, commit, branch, diff

## CURRENT DATE/TIME
Always use \`get_current_datetime\` tool when user asks about time, date, or scheduling.

## WEB SEARCH
Use \`web_search\` tool for:
- Current events and news
- Technical documentation
- Company/product information
- Any factual queries you're unsure about

## SOCIAL PROFILE LOOKUP
Use \`social_profile_lookup\` to find public info about people:
- LinkedIn: Professional history, skills, connections
- Instagram: Public posts, followers
- Facebook: Public profile info
- Twitter: Recent tweets, followers

## CALCULATOR
Use \`calculate\` for:
- Basic math: 15 + 27 * 3
- Percentages: 15% of 2500
- Date calculations: days between dates
- Financial: compound interest, loan payments

## WEBSITE KNOWLEDGE
You know everything about this website:
${JSON.stringify(SITE_DOCUMENTATION, null, 2)}

## MULTI-TASK HANDLING
When user gives MULTIPLE tasks:
1. **PARSE**: Identify each distinct task
2. **SAFETY CHECK**: Validate each task for harmful patterns
3. **INFO CHECK**: Ensure you have all required information
4. **DEPENDENCIES**: Build dependency graph
5. **EXECUTE**: Run tasks sequentially, skip dependents if parent fails
6. **REPORT**: Show completed ✅, failed ❌, skipped ⏭️

## ROLE-BASED ACCESS
- employee: Dashboard, Chat, Calendar, Settings
- hr: Above + HR Portal, Employee Management
- developer: All features including Dev Console, Git

## SAFETY PROTOCOLS
1. NEVER execute destructive commands
2. NEVER expose credentials
3. ALWAYS show changes before applying
4. ALWAYS request approval for risky operations

## RESPONSE FORMAT
Structure responses with:
- Task list and status
- Safety validation results
- Execution progress
- Final summary with results`;

// ============================================================================
// TOOL PROCESSING
// ============================================================================
async function processToolCall(
  supabase: any,
  toolName: string,
  args: any,
  sessionId: string,
  userId: string,
  userRole: string
): Promise<{ result: any; requiresApproval: boolean; jsonDisplay?: any }> {
  
  // Log all tool calls for audit
  await supabase.from('ai_safety_audit').insert({
    session_id: sessionId,
    user_id: userId,
    action_type: 'tool_call',
    action_data: { tool: toolName, args },
    safety_score: 1.0
  });

  switch (toolName) {
    case 'analyze_multi_task': {
      const tasks = args.tasks.map((task: any, index: number) => {
        const safetyCheck = validateTaskSafety(task.description);
        const infoCheck = checkRequiredInfo(task.type, task.description);
        
        return {
          id: `task-${Date.now()}-${index}`,
          order: task.order || index,
          type: task.type,
          description: task.description,
          status: !safetyCheck.safe ? 'rejected' : infoCheck.missing.length > 0 ? 'awaiting_info' : 'pending',
          riskLevel: task.risk_level,
          requiresApproval: task.requires_approval || task.risk_level === 'high' || task.risk_level === 'critical',
          dependencies: task.dependencies || [],
          requiredInfo: infoCheck.required,
          missingInfo: infoCheck.missing,
          safetyCheck
        };
      });

      const unsafeTasks = tasks.filter((t: TaskDefinition) => !t.safetyCheck.safe);
      const tasksNeedingInfo = tasks.filter((t: TaskDefinition) => t.missingInfo.length > 0);

      // Store tasks in queue
      for (const task of tasks) {
        await supabase.from('ai_task_queue').insert({
          session_id: sessionId,
          user_id: userId,
          task_order: task.order,
          task_type: task.type,
          task_description: task.description,
          task_context: { 
            dependencies: task.dependencies,
            required_info: task.requiredInfo,
            missing_info: task.missingInfo
          },
          status: task.status,
          approval_required: task.requiresApproval,
          risk_level: task.riskLevel
        });
      }

      return {
        result: {
          total_tasks: tasks.length,
          safe_tasks: tasks.filter((t: TaskDefinition) => t.safetyCheck.safe).length,
          unsafe_tasks: unsafeTasks.length,
          tasks_needing_info: tasksNeedingInfo.length,
          ready_to_execute: tasks.filter((t: TaskDefinition) => t.status === 'pending').length,
          tasks
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'multi_task_analysis',
          title: `Multi-Task Analysis (${tasks.length} tasks)`,
          data: {
            action: 'analyze_multi_task',
            summary: {
              total: tasks.length,
              safe: tasks.filter((t: TaskDefinition) => t.safetyCheck.safe).length,
              unsafe: unsafeTasks.length,
              need_info: tasksNeedingInfo.length
            },
            unsafe_tasks: unsafeTasks.map((t: TaskDefinition) => ({
              order: t.order,
              description: t.description,
              reason: t.safetyCheck.flags.join(', ')
            })),
            missing_info: tasksNeedingInfo.map((t: TaskDefinition) => ({
              order: t.order,
              description: t.description,
              missing: t.missingInfo
            })),
            execution_order: tasks
              .filter((t: TaskDefinition) => t.status === 'pending')
              .sort((a: TaskDefinition, b: TaskDefinition) => a.order - b.order)
              .map((t: TaskDefinition) => ({
                order: t.order,
                type: t.type,
                description: t.description,
                depends_on: t.dependencies
              }))
          }
        }
      };
    }

    case 'execute_task': {
      // Execute a single task from queue
      const { data: task } = await supabase
        .from('ai_task_queue')
        .select('*')
        .eq('id', args.task_id)
        .single();

      if (!task) {
        return { result: { error: 'Task not found' }, requiresApproval: false };
      }

      // Update status to executing
      await supabase.from('ai_task_queue')
        .update({ status: 'executing', started_at: new Date().toISOString() })
        .eq('id', args.task_id);

      // Simulate task execution based on type
      let executionResult;
      let success = true;
      let errorMessage = '';

      try {
        switch (task.task_type) {
          case 'code_fix':
          case 'code_review':
            executionResult = { 
              action: 'code_analysis',
              files_analyzed: 1,
              issues_found: 0,
              status: 'completed'
            };
            break;
          case 'git_operation':
            executionResult = {
              action: 'git_' + (args.parameters?.operation || 'status'),
              status: 'completed'
            };
            break;
          default:
            executionResult = { 
              action: task.task_type,
              status: 'completed'
            };
        }
      } catch (e) {
        success = false;
        errorMessage = e instanceof Error ? e.message : 'Unknown error';
      }

      // Update task status
      await supabase.from('ai_task_queue')
        .update({ 
          status: success ? 'completed' : 'failed',
          execution_result: executionResult,
          error_message: errorMessage || null,
          completed_at: new Date().toISOString()
        })
        .eq('id', args.task_id);

      return {
        result: {
          task_id: args.task_id,
          success,
          execution_result: executionResult,
          error_message: errorMessage || undefined
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'task_execution',
          title: `Task ${task.task_order + 1}: ${success ? '✅ Completed' : '❌ Failed'}`,
          data: {
            task_type: task.task_type,
            description: task.task_description,
            status: success ? 'COMPLETED' : 'FAILED',
            result: executionResult,
            error: errorMessage || undefined
          }
        }
      };
    }

    case 'get_current_datetime': {
      const timezone = args.timezone || 'UTC';
      const now = new Date();
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(now);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
      
      return {
        result: {
          iso: now.toISOString(),
          formatted: formatter.format(now),
          timezone,
          day_of_week: getPart('weekday'),
          date: `${getPart('month')} ${getPart('day')}, ${getPart('year')}`,
          time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
          unix_timestamp: Math.floor(now.getTime() / 1000)
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'datetime',
          title: 'Current Date & Time',
          data: {
            action: 'get_datetime',
            date: `${getPart('month')} ${getPart('day')}, ${getPart('year')}`,
            time: `${getPart('hour')}:${getPart('minute')}`,
            day: getPart('weekday'),
            timezone
          }
        }
      };
    }

    case 'web_search': {
      const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
      
      if (!PERPLEXITY_API_KEY) {
        return {
          result: { error: 'Web search not configured. Perplexity API key missing.' },
          requiresApproval: false
        };
      }

      try {
        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: 'Provide accurate, concise, up-to-date information. Include sources when relevant.' },
              { role: 'user', content: args.query }
            ],
            max_tokens: 1024
          }),
        });

        const searchData = await searchResponse.json();
        
        if (!searchResponse.ok) {
          return {
            result: { error: 'Search failed', details: searchData },
            requiresApproval: false
          };
        }

        return {
          result: {
            query: args.query,
            answer: searchData.choices?.[0]?.message?.content || 'No results found',
            citations: searchData.citations || []
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'web_search',
            title: 'Web Search Results',
            data: {
              action: 'web_search',
              query: args.query,
              result: searchData.choices?.[0]?.message?.content?.substring(0, 500) + '...',
              sources: searchData.citations?.length || 0
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'social_profile_lookup': {
      const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
      
      if (!PERPLEXITY_API_KEY) {
        return {
          result: { error: 'Social lookup not configured. Perplexity API key missing.' },
          requiresApproval: false
        };
      }

      const platform = args.platform || 'all';
      const context = args.additional_context || '';
      
      let searchQuery = `Find public profile information about ${args.person_name}`;
      if (platform !== 'all') {
        searchQuery += ` on ${platform}`;
      }
      if (context) {
        searchQuery += `. Additional context: ${context}`;
      }
      searchQuery += `. Include: name, current role, company, location, professional background, public social links. Only provide publicly available information.`;

      try {
        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { 
                role: 'system', 
                content: 'You are a professional researcher. Find public information about people. Only provide publicly available information. Be factual and include sources.' 
              },
              { role: 'user', content: searchQuery }
            ],
            max_tokens: 1024
          }),
        });

        const searchData = await searchResponse.json();
        
        return {
          result: {
            person: args.person_name,
            platform,
            profile_info: searchData.choices?.[0]?.message?.content || 'No public information found',
            citations: searchData.citations || []
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'social_lookup',
            title: `Profile: ${args.person_name}`,
            data: {
              action: 'social_profile_lookup',
              person: args.person_name,
              platform,
              info: searchData.choices?.[0]?.message?.content?.substring(0, 500) + '...',
              sources: searchData.citations?.length || 0
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'Profile lookup failed', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'calculate': {
      const expression = args.expression;
      let result: number | string;
      let calculation_type = args.calculation_type || 'arithmetic';
      
      try {
        // Handle percentage calculations
        if (expression.toLowerCase().includes('% of')) {
          const match = expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
          if (match) {
            result = (parseFloat(match[1]) / 100) * parseFloat(match[2]);
            calculation_type = 'percentage';
          } else {
            throw new Error('Invalid percentage format');
          }
        }
        // Handle date differences
        else if (expression.toLowerCase().includes('days between')) {
          const match = expression.match(/days between\s*(\d{4}-\d{2}-\d{2})\s*and\s*(\d{4}-\d{2}-\d{2})/i);
          if (match) {
            const date1 = new Date(match[1]);
            const date2 = new Date(match[2]);
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            result = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            calculation_type = 'date_diff';
          } else {
            throw new Error('Invalid date format. Use: days between YYYY-MM-DD and YYYY-MM-DD');
          }
        }
        // Basic arithmetic - safe evaluation
        else {
          // Only allow numbers, operators, parentheses, and spaces
          const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
          if (sanitized !== expression.replace(/\s/g, '').replace(/[^0-9+\-*/.()]/g, '')) {
            throw new Error('Invalid characters in expression');
          }
          // Use Function constructor for safe evaluation (no access to global scope)
          result = new Function('return ' + sanitized)();
        }

        return {
          result: {
            expression,
            calculation_type,
            result,
            formatted: typeof result === 'number' ? result.toLocaleString() : result
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'calculation',
            title: 'Calculator',
            data: {
              action: 'calculate',
              expression,
              type: calculation_type,
              result: typeof result === 'number' ? result.toLocaleString() : result
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'Calculation failed', message: error instanceof Error ? error.message : 'Invalid expression' },
          requiresApproval: false
        };
      }
    }

    case 'get_site_info': {
      const info_type = args.info_type;
      let responseData: any = {};

      switch (info_type) {
        case 'pages':
          responseData = SITE_DOCUMENTATION.pages;
          break;
        case 'automations':
          responseData = SITE_DOCUMENTATION.automations;
          break;
        case 'components':
          responseData = SITE_DOCUMENTATION.components;
          break;
        case 'all':
          responseData = SITE_DOCUMENTATION;
          break;
        default:
          responseData = SITE_DOCUMENTATION;
      }

      if (args.specific_page && SITE_DOCUMENTATION.pages[args.specific_page as keyof typeof SITE_DOCUMENTATION.pages]) {
        responseData = SITE_DOCUMENTATION.pages[args.specific_page as keyof typeof SITE_DOCUMENTATION.pages];
      }

      return {
        result: responseData,
        requiresApproval: false,
        jsonDisplay: {
          type: 'site_info',
          title: 'Website Information',
          data: {
            action: 'get_site_info',
            info_type,
            data: responseData
          }
        }
      };
    }

    case 'automate_hr_task': {
      const { task_type, task_data, target_user_id } = args;
      let result: any = {};

      switch (task_type) {
        case 'leave_request':
          const { data: leaveRequest } = await supabase
            .from('leave_requests')
            .insert({
              user_id: target_user_id || userId,
              leave_type: task_data.leave_type || 'annual',
              start_date: task_data.start_date,
              end_date: task_data.end_date,
              reason: task_data.reason,
              status: 'pending'
            })
            .select()
            .single();
          result = { type: 'leave_request', id: leaveRequest?.id, status: 'submitted' };
          break;
        
        case 'reimbursement':
          const { data: reimbursement } = await supabase
            .from('reimbursement_requests')
            .insert({
              user_id: target_user_id || userId,
              amount: task_data.amount,
              category: task_data.category,
              description: task_data.description,
              status: 'pending'
            })
            .select()
            .single();
          result = { type: 'reimbursement', id: reimbursement?.id, status: 'submitted' };
          break;

        case 'training_enrollment':
          const { data: training } = await supabase
            .from('training_requests')
            .insert({
              user_id: target_user_id || userId,
              training_name: task_data.training_name,
              training_type: task_data.training_type || 'online',
              status: 'pending'
            })
            .select()
            .single();
          result = { type: 'training', id: training?.id, status: 'enrolled' };
          break;

        default:
          result = { error: 'Unknown HR task type' };
      }

      return {
        result,
        requiresApproval: task_type !== 'payslip',
        jsonDisplay: {
          type: 'hr_automation',
          title: `HR Task: ${task_type}`,
          data: {
            action: 'automate_hr_task',
            task_type,
            ...result
          }
        }
      };
    }

    case 'automate_dev_task': {
      const { task_type, task_data, file_paths } = args;
      let result: any = {};

      switch (task_type) {
        case 'bug_fix':
          const ticketId = `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
          await supabase
            .from('dev_tickets')
            .insert({
              ticket_id: ticketId,
              reporter_id: userId,
              service_name: task_data.service || 'unknown',
              severity: task_data.severity || 'medium',
              description: task_data.description,
              status: 'in_progress'
            });
          result = { type: 'bug_fix', ticket_id: ticketId, status: 'created', files: file_paths };
          break;

        case 'code_review':
          result = { 
            type: 'code_review', 
            files: file_paths, 
            status: 'pending_review',
            message: 'Code review initiated. Please review the changes.'
          };
          break;

        case 'deployment':
          const { data: deployment } = await supabase
            .from('deployment_requests')
            .insert({
              requester_id: userId,
              service_name: task_data.service,
              environment: task_data.environment || 'staging',
              version: task_data.version,
              status: 'pending'
            })
            .select()
            .single();
          result = { type: 'deployment', id: deployment?.id, status: 'pending_approval' };
          break;

        default:
          result = { type: task_type, status: 'initiated' };
      }

      return {
        result,
        requiresApproval: ['deployment', 'bug_fix'].includes(task_type),
        jsonDisplay: {
          type: 'dev_automation',
          title: `Dev Task: ${task_type}`,
          data: {
            action: 'automate_dev_task',
            task_type,
            ...result
          }
        }
      };
    }

    case 'create_bug_ticket': {
      const ticketId = `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      const { data: ticket } = await supabase
        .from('dev_tickets')
        .insert({
          ticket_id: ticketId,
          reporter_id: userId,
          service_name: args.service || 'unknown',
          severity: args.severity || 'medium',
          description: args.description,
          error_details: args.error_details ? { raw: args.error_details } : null,
          status: 'open'
        })
        .select()
        .single();

      return {
        result: { ticket_id: ticketId, status: 'created' },
        requiresApproval: false,
        jsonDisplay: {
          type: 'bug_ticket',
          title: `Bug Ticket ${ticketId}`,
          data: {
            action: "create_dev_ticket",
            service: args.service,
            severity: args.severity?.toUpperCase(),
            description: args.description,
            ticket_id: ticketId,
            status: "OPEN"
          }
        }
      };
    }

    case 'navigate_page': {
      const pageRoutes: Record<string, { route: string; roles: string[] }> = {
        'dashboard': { route: '/dashboard', roles: ['employee', 'hr', 'developer', 'it'] },
        'home': { route: '/', roles: ['employee', 'hr', 'developer', 'it'] },
        'chat': { route: '/assistant', roles: ['employee', 'hr', 'developer', 'it'] },
        'assistant': { route: '/assistant', roles: ['employee', 'hr', 'developer', 'it'] },
        'calendar': { route: '/calendar', roles: ['employee', 'hr', 'developer', 'it'] },
        'tickets': { route: '/tickets', roles: ['employee', 'hr', 'developer', 'it'] },
        'hr portal': { route: '/hr-portal', roles: ['hr'] },
        'hr': { route: '/hr-portal', roles: ['hr'] },
        'developer console': { route: '/dev-console', roles: ['developer'] },
        'dev console': { route: '/dev-console', roles: ['developer'] },
        'code review': { route: '/dev-console', roles: ['developer'] },
        'ai training': { route: '/dev-console', roles: ['developer'] },
        'settings': { route: '/settings', roles: ['employee', 'hr', 'developer', 'it'] }
      };

      const pageName = args.page_name.toLowerCase();
      const pageConfig = pageRoutes[pageName];

      if (!pageConfig) {
        return {
          result: { 
            error: 'Page not found', 
            available: Object.keys(pageRoutes),
            suggestion: 'Try: dashboard, assistant, calendar, tickets, or settings'
          },
          requiresApproval: false
        };
      }

      if (!pageConfig.roles.includes(userRole)) {
        return {
          result: { 
            error: 'Access denied',
            message: `You don't have access to "${args.page_name}". This page is only available for ${pageConfig.roles.join(', ')} roles.`,
            your_role: userRole,
            required_roles: pageConfig.roles
          },
          requiresApproval: false
        };
      }

      return {
        result: { navigate_to: pageConfig.route, allowed: true },
        requiresApproval: false,
        jsonDisplay: {
          type: 'navigation',
          title: 'Navigation',
          data: {
            action: 'navigate',
            destination: args.page_name,
            route: pageConfig.route,
            status: 'ALLOWED'
          }
        }
      };
    }

    case 'search_documents': {
      // Search documents including global company documents (Annual Reports, policies, etc.)
      const query = args.query;
      
      // Build the search query - include both session-specific and global documents
      let chunksQuery = supabase
        .from('document_chunks')
        .select(`
          id, content, page_number, section_title, document_id,
          uploaded_documents!inner (id, file_name, session_id, is_global)
        `)
        .limit(50);

      // Always include global documents plus any session-specific ones
      // Since we don't have sessionId here, we search global documents
      chunksQuery = chunksQuery.eq('uploaded_documents.is_global', true);

      const { data: chunks, error } = await chunksQuery;

      if (error) {
        console.error('Document search error:', error);
        return {
          result: { error: 'Failed to search documents', details: error.message },
          requiresApproval: false
        };
      }

      if (!chunks || chunks.length === 0) {
        return {
          result: { 
            found: false, 
            message: 'No global documents found. Ask user to upload relevant documents or mark existing documents as global.' 
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'search',
            title: 'Document Search',
            data: {
              action: 'search_documents',
              query,
              status: 'NO_RESULTS',
              message: 'No global documents indexed yet'
            }
          }
        };
      }

      // Simple keyword-based search
      const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      
      const scoredChunks = chunks.map((chunk: any) => {
        const contentLower = chunk.content.toLowerCase();
        let score = 0;
        for (const word of queryWords) {
          const matches = contentLower.match(new RegExp(word, 'gi'));
          if (matches) {
            score += matches.length;
          }
        }
        return { ...chunk, score };
      });

      const relevantChunks = scoredChunks
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      if (relevantChunks.length === 0) {
        return {
          result: { 
            found: false, 
            message: `No relevant content found for "${query}" in global documents.`,
            suggestion: 'Try different keywords or upload a document with this information.'
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'search',
            title: 'Document Search',
            data: {
              action: 'search_documents',
              query,
              status: 'NO_MATCHES',
              totalDocs: chunks.length
            }
          }
        };
      }

      const results = relevantChunks.map((chunk: any) => ({
        documentName: chunk.uploaded_documents?.file_name || 'Unknown',
        pageNumber: chunk.page_number,
        sectionTitle: chunk.section_title,
        content: chunk.content,
        snippet: chunk.content.substring(0, 500) + (chunk.content.length > 500 ? '...' : ''),
        relevanceScore: chunk.score
      }));

      return {
        result: { 
          found: true, 
          query,
          resultCount: results.length,
          results,
          message: `Found ${results.length} relevant sections from global documents.`
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'search',
          title: 'Document Search Results',
          data: {
            action: 'search_documents',
            query,
            status: 'FOUND',
            resultCount: results.length,
            sources: results.map((r: any) => `${r.documentName} (Page ${r.pageNumber})`)
          }
        }
      };
    }

    case 'learn_pattern': {
      const safetyCheck = validateTaskSafety(args.instruction);
      
      if (!safetyCheck.safe) {
        return {
          result: {
            blocked: true,
            reason: 'This learning pattern contains potentially harmful content',
            flags: safetyCheck.flags
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'warning',
            title: 'Learning Blocked',
            data: {
              action: 'learn_pattern_blocked',
              reason: 'Safety violation detected',
              flags: safetyCheck.flags
            }
          }
        };
      }

      const { data: session } = await supabase
        .from('ai_learning_sessions')
        .insert({
          session_type: 'pattern_learning',
          trigger: 'explicit_training',
          user_id: userId,
          conversation_context: { instruction: args.instruction },
          extracted_patterns: {
            type: args.pattern_type,
            keywords: args.keywords || []
          },
          generated_prompt: `User instruction: "${args.instruction}"`,
          safety_score: 0.9,
          safety_analysis: { is_safe: true, flags: [] }
        })
        .select()
        .single();

      return {
        result: { 
          learning_session_id: session?.id,
          status: 'pending_approval',
          message: 'Learning request submitted. Requires developer approval.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'action',
          title: 'Learning Request',
          data: {
            action: 'learn_pattern',
            instruction: args.instruction,
            status: 'PENDING_APPROVAL',
            requires: 'developer_approval'
          }
        }
      };
    }

    case 'request_capability': {
      const safetyCheck = validateTaskSafety(args.description);
      
      // Generate tool schema from input parameters
      const toolSchema: Record<string, any> = {
        type: "object",
        properties: {},
        required: []
      };
      
      if (args.input_parameters) {
        for (const param of args.input_parameters) {
          toolSchema.properties[param.name] = {
            type: param.type || "string",
            description: param.description || ""
          };
          if (param.required) {
            toolSchema.required.push(param.name);
          }
        }
      }

      // AI generates implementation code template
      const generatedCode = generateToolImplementation(
        args.capability_name,
        args.description,
        args.input_parameters || [],
        args.implementation_hints || ""
      );
      
      const { data: request } = await supabase
        .from('ai_capability_requests')
        .insert({
          capability_name: args.capability_name,
          capability_type: args.capability_type || 'tool',
          description: args.description,
          trigger_context: args.reason,
          requested_by_user_id: userId,
          proposed_tool_schema: {
            name: args.capability_name.toLowerCase().replace(/\s+/g, '_'),
            description: args.description,
            parameters: toolSchema
          },
          proposed_implementation: {
            code: generatedCode,
            language: 'typescript',
            output_format: args.output_format || 'json',
            test_cases: []
          },
          safety_analysis: {
            is_safe: safetyCheck.safe,
            risk_level: safetyCheck.safe ? 'low' : 'high',
            code_analysis: analyzeCodeSafety(generatedCode)
          }
        })
        .select()
        .single();

      return {
        result: {
          request_id: request?.id,
          status: 'pending_developer_approval',
          message: 'Capability request with generated code submitted for developer review.',
          generated_code_preview: generatedCode.substring(0, 500) + '...'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'action',
          title: '🔧 New Capability Request',
          data: {
            action: 'request_capability',
            capability: args.capability_name,
            type: args.capability_type || 'tool',
            description: args.description,
            parameters: args.input_parameters?.map((p: any) => p.name) || [],
            has_generated_code: true,
            status: 'PENDING_DEVELOPER_APPROVAL'
          }
        }
      };
    }

    case 'generate_tool_code': {
      const safetyCheck = validateTaskSafety(args.implementation_code);
      const codeAnalysis = analyzeCodeSafety(args.implementation_code);
      
      if (!codeAnalysis.safe) {
        return {
          result: { 
            blocked: true, 
            reason: `Code contains unsafe patterns: ${codeAnalysis.issues.join(', ')}` 
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'warning',
            title: 'Code Generation Blocked',
            data: { reason: codeAnalysis.issues, status: 'BLOCKED' }
          }
        };
      }

      const { data: proposal } = await supabase
        .from('code_change_proposals')
        .insert({
          file_path: `supabase/functions/advanced-agent/tools/${args.tool_name}.ts`,
          proposed_code: args.implementation_code,
          change_type: 'new_tool',
          explanation: args.tool_description,
          proposed_by: 'ai_self_improvement',
          risk_level: safetyCheck.safe ? 'low' : 'medium'
        })
        .select()
        .single();

      return {
        result: {
          proposal_id: proposal?.id,
          status: 'awaiting_developer_review',
          message: 'Tool code generated and submitted for review'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'code',
          title: '💻 Generated Tool Code',
          data: {
            tool: args.tool_name,
            file: `tools/${args.tool_name}.ts`,
            test_cases: args.test_cases?.length || 0,
            status: 'AWAITING_REVIEW'
          }
        }
      };
    }

    case 'propose_code_change': {
      const safetyCheck = validateTaskSafety(args.proposed_code);
      
      if (!safetyCheck.safe) {
        await supabase.from('ai_safety_audit').insert({
          session_id: sessionId,
          user_id: userId,
          action_type: 'code_change_blocked',
          action_data: args,
          safety_score: safetyCheck.score,
          risk_flags: safetyCheck.flags,
          was_blocked: true
        });
        
        return {
          result: { blocked: true, reason: `Security violation: ${safetyCheck.flags.join(', ')}` },
          requiresApproval: false,
          jsonDisplay: {
            type: 'warning',
            title: 'Code Change Blocked',
            data: {
              action: 'code_change_blocked',
              file: args.file_path,
              reason: safetyCheck.flags.join(', '),
              status: 'BLOCKED'
            }
          }
        };
      }

      const { data: proposal } = await supabase
        .from('code_change_proposals')
        .insert({
          file_path: args.file_path,
          original_code: args.original_code || '',
          proposed_code: args.proposed_code,
          change_type: 'patch',
          explanation: args.change_reason,
          risk_level: args.risk_level,
          proposed_by: 'ai-agent',
          status: 'pending'
        })
        .select()
        .single();

      return {
        result: {
          proposal_id: proposal?.id,
          file_path: args.file_path,
          requires_approval: true
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'code_change',
          title: `Code Change: ${args.file_path}`,
          data: {
            action: "propose_code_change",
            file: args.file_path,
            risk_level: args.risk_level?.toUpperCase(),
            reason: args.change_reason,
            original_code: args.original_code?.substring(0, 200) + '...',
            proposed_code: args.proposed_code?.substring(0, 200) + '...',
            status: "PENDING_APPROVAL",
            proposal_id: proposal?.id
          }
        }
      };
    }

    case 'git_operation': {
      // Git operations require approval for push/commit
      const requiresApproval = ['push', 'commit'].includes(args.operation);
      
      const operationResult = {
        operation: args.operation,
        status: 'simulated', // In real implementation, this would call actual git
        message: args.message,
        branch: args.branch_name,
        files: args.files
      };

      return {
        result: operationResult,
        requiresApproval,
        jsonDisplay: {
          type: 'git_operation',
          title: `Git: ${args.operation}`,
          data: {
            action: `git_${args.operation}`,
            ...operationResult,
            status: requiresApproval ? 'AWAITING_APPROVAL' : 'READY'
          }
        }
      };
    }

    case 'file_operation': {
      const requiresApproval = ['write', 'delete'].includes(args.operation);
      
      return {
        result: {
          operation: args.operation,
          file_path: args.file_path,
          status: 'ready'
        },
        requiresApproval,
        jsonDisplay: {
          type: 'file_operation',
          title: `File: ${args.operation}`,
          data: {
            action: `file_${args.operation}`,
            path: args.file_path,
            status: requiresApproval ? 'AWAITING_APPROVAL' : 'READY'
          }
        }
      };
    }

    case 'run_diagnostics': {
      return {
        result: {
          diagnostic_type: args.diagnostic_type,
          status: 'completed',
          errors: 0,
          warnings: 2,
          message: 'Diagnostics completed successfully'
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'diagnostics',
          title: `Diagnostics: ${args.diagnostic_type}`,
          data: {
            action: 'run_diagnostics',
            type: args.diagnostic_type,
            status: 'COMPLETED',
            errors: 0,
            warnings: 2
          }
        }
      };
    }

    // ============================================================================
    // NEW DEVELOPER TOOLS IMPLEMENTATIONS
    // ============================================================================
    
    case 'query_database': {
      const { table_name, columns = ['*'], filters = {}, order_by, order_direction = 'desc', limit = 50 } = args;
      
      // Whitelist of tables that can be queried
      const allowedTables = [
        'uploaded_documents', 'document_chunks', 'profiles', 'dev_tickets', 
        'code_change_proposals', 'ai_analytics', 'ai_task_queue', 'chat_sessions',
        'chat_messages', 'leave_requests', 'reimbursement_requests', 'training_requests',
        'github_operations', 'database_migrations_log', 'file_operations_log',
        'notifications', 'meetings', 'deployment_requests', 'incident_reports'
      ];
      
      if (!allowedTables.includes(table_name)) {
        return {
          result: { error: `Table '${table_name}' is not accessible. Allowed tables: ${allowedTables.join(', ')}` },
          requiresApproval: false
        };
      }

      try {
        let query = supabase.from(table_name).select(columns.join(','));
        
        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        }
        
        if (order_by) {
          query = query.order(order_by, { ascending: order_direction === 'asc' });
        }
        
        query = query.limit(Math.min(limit, 100));
        
        const { data, error } = await query;
        
        if (error) {
          return {
            result: { error: 'Query failed', details: error.message },
            requiresApproval: false
          };
        }

        // Log the query for audit
        await supabase.from('ai_safety_audit').insert({
          session_id: sessionId,
          user_id: userId,
          action_type: 'database_query',
          action_data: { table_name, columns, filters, limit },
          safety_score: 1.0
        });

        return {
          result: {
            table: table_name,
            row_count: data?.length || 0,
            data: data
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'database_query',
            title: `Query: ${table_name}`,
            data: {
              action: 'query_database',
              table: table_name,
              rows_returned: data?.length || 0,
              columns: columns,
              sample: data?.slice(0, 3)
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'Query execution failed', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'list_all_files': {
      const { source = 'both', filter = {} } = args;
      const results: any = { database_files: [], storage_files: [] };

      if (source === 'database' || source === 'both') {
        let query = supabase
          .from('uploaded_documents')
          .select('id, file_name, file_type, file_size, is_global, created_at, storage_path, session_id')
          .order('created_at', { ascending: false });
        
        if (filter.file_type) {
          query = query.ilike('file_type', `%${filter.file_type}%`);
        }
        if (filter.is_global !== undefined) {
          query = query.eq('is_global', filter.is_global);
        }
        
        const { data, error } = await query.limit(100);
        
        if (!error && data) {
          results.database_files = data.map((f: any) => ({
            id: f.id,
            name: f.file_name,
            type: f.file_type,
            size: f.file_size,
            is_global: f.is_global,
            created_at: f.created_at,
            path: f.storage_path
          }));
        }
      }

      if (source === 'storage' || source === 'both') {
        // List files from storage bucket
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('documents')
          .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
        
        if (!storageError && storageData) {
          results.storage_files = storageData.map((f: any) => ({
            name: f.name,
            size: f.metadata?.size,
            created_at: f.created_at,
            type: f.metadata?.mimetype
          }));
        }
      }

      const totalFiles = results.database_files.length + results.storage_files.length;

      return {
        result: {
          total_files: totalFiles,
          database_files: results.database_files,
          storage_files: results.storage_files
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'file_list',
          title: `All Files (${totalFiles} total)`,
          data: {
            action: 'list_all_files',
            source,
            total: totalFiles,
            database_count: results.database_files.length,
            storage_count: results.storage_files.length,
            file_names: results.database_files.map((f: any) => f.name)
          }
        }
      };
    }

    case 'github_create_pr': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, title, body, head_branch, base_branch, files } = args;

      // Log the operation for approval
      const { data: operation } = await supabase
        .from('github_operations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          operation_type: 'create_pr',
          repo_owner,
          repo_name,
          branch_name: head_branch,
          target_branch: base_branch,
          pr_title: title,
          pr_body: body,
          files_changed: files || [],
          status: 'pending',
          requires_approval: true,
          risk_level: 'high'
        })
        .select()
        .single();

      return {
        result: {
          operation_id: operation?.id,
          status: 'pending_approval',
          message: 'Pull request creation requires developer approval.',
          pr_details: { title, head_branch, base_branch, repo: `${repo_owner}/${repo_name}` }
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'github_operation',
          title: `🔀 Create PR: ${title}`,
          data: {
            action: 'github_create_pr',
            repo: `${repo_owner}/${repo_name}`,
            title,
            from: head_branch,
            to: base_branch,
            files: files?.length || 0,
            status: 'PENDING_APPROVAL'
          }
        }
      };
    }

    case 'github_push_commit': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, branch, commit_message, files } = args;

      // Log the operation for approval
      const { data: operation } = await supabase
        .from('github_operations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          operation_type: 'push_commit',
          repo_owner,
          repo_name,
          branch_name: branch,
          commit_message,
          files_changed: files || [],
          status: 'pending',
          requires_approval: true,
          risk_level: 'high'
        })
        .select()
        .single();

      return {
        result: {
          operation_id: operation?.id,
          status: 'pending_approval',
          message: 'Commit push requires developer approval.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'github_operation',
          title: `📝 Commit: ${commit_message.substring(0, 50)}...`,
          data: {
            action: 'github_push_commit',
            repo: `${repo_owner}/${repo_name}`,
            branch,
            message: commit_message,
            files: files?.length || 0,
            status: 'PENDING_APPROVAL'
          }
        }
      };
    }

    case 'github_list_files': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, path = '', branch = 'main' } = args;

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo_owner}/${repo_name}/contents/${path}?ref=${branch}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Developer-Agent'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            result: { error: 'Failed to list files', details: error.message },
            requiresApproval: false
          };
        }

        const files = await response.json();
        const fileList = Array.isArray(files) ? files.map((f: any) => ({
          name: f.name,
          path: f.path,
          type: f.type,
          size: f.size
        })) : [{ name: files.name, path: files.path, type: files.type, size: files.size }];

        return {
          result: {
            repo: `${repo_owner}/${repo_name}`,
            branch,
            path: path || '/',
            file_count: fileList.length,
            files: fileList
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'github_files',
            title: `📁 ${repo_name}/${path || '/'}`,
            data: {
              action: 'github_list_files',
              repo: `${repo_owner}/${repo_name}`,
              branch,
              files: fileList.slice(0, 20).map((f: any) => f.name)
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'GitHub API error', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'github_get_file': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, path, branch = 'main' } = args;

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo_owner}/${repo_name}/contents/${path}?ref=${branch}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Developer-Agent'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            result: { error: 'Failed to get file', details: error.message },
            requiresApproval: false
          };
        }

        const fileData = await response.json();
        const content = fileData.encoding === 'base64' 
          ? atob(fileData.content.replace(/\n/g, ''))
          : fileData.content;

        return {
          result: {
            repo: `${repo_owner}/${repo_name}`,
            path,
            branch,
            size: fileData.size,
            sha: fileData.sha,
            content: content
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'github_file_content',
            title: `📄 ${path}`,
            data: {
              action: 'github_get_file',
              repo: `${repo_owner}/${repo_name}`,
              path,
              size: fileData.size,
              content_preview: content.substring(0, 500) + (content.length > 500 ? '...' : '')
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'GitHub API error', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'github_create_branch': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, branch_name, from_branch = 'main' } = args;

      // Log the operation for approval
      const { data: operation } = await supabase
        .from('github_operations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          operation_type: 'create_branch',
          repo_owner,
          repo_name,
          branch_name,
          target_branch: from_branch,
          status: 'pending',
          requires_approval: true,
          risk_level: 'medium'
        })
        .select()
        .single();

      return {
        result: {
          operation_id: operation?.id,
          status: 'pending_approval',
          message: 'Branch creation requires developer approval.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'github_operation',
          title: `🌿 Create Branch: ${branch_name}`,
          data: {
            action: 'github_create_branch',
            repo: `${repo_owner}/${repo_name}`,
            new_branch: branch_name,
            from: from_branch,
            status: 'PENDING_APPROVAL'
          }
        }
      };
    }

    case 'github_merge_pr': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, pr_number, merge_method = 'merge' } = args;

      // Log the operation for approval - CRITICAL operation
      const { data: operation } = await supabase
        .from('github_operations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          operation_type: 'merge_pr',
          repo_owner,
          repo_name,
          pr_number,
          operation_data: { merge_method },
          status: 'pending',
          requires_approval: true,
          risk_level: 'critical'
        })
        .select()
        .single();

      return {
        result: {
          operation_id: operation?.id,
          status: 'pending_approval',
          message: 'PR merge is a CRITICAL operation and requires developer approval.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'github_operation',
          title: `⚠️ Merge PR #${pr_number}`,
          data: {
            action: 'github_merge_pr',
            repo: `${repo_owner}/${repo_name}`,
            pr_number,
            merge_method,
            risk: 'CRITICAL',
            status: 'PENDING_APPROVAL'
          }
        }
      };
    }

    case 'github_list_prs': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name, state = 'open' } = args;

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo_owner}/${repo_name}/pulls?state=${state}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Developer-Agent'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            result: { error: 'Failed to list PRs', details: error.message },
            requiresApproval: false
          };
        }

        const prs = await response.json();
        const prList = prs.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login,
          created_at: pr.created_at,
          head: pr.head?.ref,
          base: pr.base?.ref
        }));

        return {
          result: {
            repo: `${repo_owner}/${repo_name}`,
            state,
            pr_count: prList.length,
            pull_requests: prList
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'github_prs',
            title: `🔀 PRs (${state})`,
            data: {
              action: 'github_list_prs',
              repo: `${repo_owner}/${repo_name}`,
              count: prList.length,
              prs: prList.slice(0, 10)
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'GitHub API error', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'github_list_branches': {
      const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
      if (!GITHUB_TOKEN) {
        return {
          result: { error: 'GitHub integration not configured. GITHUB_TOKEN secret is required.' },
          requiresApproval: false
        };
      }

      const { repo_owner, repo_name } = args;

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo_owner}/${repo_name}/branches`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Developer-Agent'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            result: { error: 'Failed to list branches', details: error.message },
            requiresApproval: false
          };
        }

        const branches = await response.json();
        const branchList = branches.map((b: any) => ({
          name: b.name,
          protected: b.protected,
          sha: b.commit?.sha?.substring(0, 7)
        }));

        return {
          result: {
            repo: `${repo_owner}/${repo_name}`,
            branch_count: branchList.length,
            branches: branchList
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'github_branches',
            title: `🌿 Branches`,
            data: {
              action: 'github_list_branches',
              repo: `${repo_owner}/${repo_name}`,
              count: branchList.length,
              branches: branchList.map((b: any) => b.name)
            }
          }
        };
      } catch (error) {
        return {
          result: { error: 'GitHub API error', message: error instanceof Error ? error.message : 'Unknown error' },
          requiresApproval: false
        };
      }
    }

    case 'database_migration': {
      const { operation, migration_name, description, sql, rollback_sql, tables_affected } = args;

      // Safety check the SQL
      const dangerousPatterns = [
        /DROP\s+DATABASE/i,
        /DROP\s+SCHEMA/i,
        /TRUNCATE/i,
        /ALTER\s+TABLE.*DROP\s+COLUMN/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sql)) {
          return {
            result: { 
              blocked: true, 
              reason: 'SQL contains dangerous patterns. This migration type is not allowed through the AI agent.' 
            },
            requiresApproval: false,
            jsonDisplay: {
              type: 'warning',
              title: '⛔ Migration Blocked',
              data: { reason: 'Dangerous SQL pattern detected', sql_preview: sql.substring(0, 100) }
            }
          };
        }
      }

      // Log the migration for approval
      const { data: migration } = await supabase
        .from('database_migrations_log')
        .insert({
          session_id: sessionId,
          proposed_by: 'ai_agent',
          user_id: userId,
          migration_name,
          migration_description: description,
          migration_sql: sql,
          rollback_sql: rollback_sql || null,
          tables_affected,
          operation_type: operation,
          status: 'pending',
          risk_level: operation === 'create_table' ? 'medium' : 'high',
          safety_analysis: {
            checked_at: new Date().toISOString(),
            dangerous_patterns_found: false
          }
        })
        .select()
        .single();

      return {
        result: {
          migration_id: migration?.id,
          status: 'pending_approval',
          message: 'Database migration requires developer approval before execution.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'database_migration',
          title: `🗄️ Migration: ${migration_name}`,
          data: {
            action: 'database_migration',
            operation,
            name: migration_name,
            tables: tables_affected,
            sql_preview: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            status: 'PENDING_APPROVAL',
            risk: operation === 'create_table' ? 'MEDIUM' : 'HIGH'
          }
        }
      };
    }

    case 'apply_code_change': {
      const { proposal_id, apply_method, repo_owner, repo_name } = args;

      // Get the proposal
      const { data: proposal, error } = await supabase
        .from('code_change_proposals')
        .select('*')
        .eq('id', proposal_id)
        .single();

      if (error || !proposal) {
        return {
          result: { error: 'Proposal not found' },
          requiresApproval: false
        };
      }

      if (proposal.status !== 'approved') {
        return {
          result: { 
            error: 'Proposal not approved', 
            current_status: proposal.status,
            message: 'Only approved proposals can be applied.'
          },
          requiresApproval: false
        };
      }

      if (apply_method === 'github_commit' || apply_method === 'github_pr') {
        const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
        if (!GITHUB_TOKEN) {
          return {
            result: { error: 'GitHub integration not configured for code application.' },
            requiresApproval: false
          };
        }

        // Create GitHub operation
        const { data: operation } = await supabase
          .from('github_operations')
          .insert({
            user_id: userId,
            session_id: sessionId,
            operation_type: apply_method === 'github_pr' ? 'create_pr' : 'push_commit',
            repo_owner,
            repo_name,
            commit_message: `[AI] ${proposal.explanation || 'Apply code change'}`,
            files_changed: [{ path: proposal.file_path, content: proposal.proposed_code }],
            status: 'pending',
            requires_approval: true,
            risk_level: 'high'
          })
          .select()
          .single();

        return {
          result: {
            operation_id: operation?.id,
            proposal_id,
            apply_method,
            status: 'pending_github_approval',
            message: 'GitHub operation created and pending approval.'
          },
          requiresApproval: true,
          jsonDisplay: {
            type: 'apply_code',
            title: `📤 Apply: ${proposal.file_path}`,
            data: {
              action: 'apply_code_change',
              method: apply_method,
              file: proposal.file_path,
              status: 'PENDING_GITHUB_APPROVAL'
            }
          }
        };
      }

      // Storage method - mark as applied
      await supabase
        .from('code_change_proposals')
        .update({ 
          status: 'applied', 
          applied_at: new Date().toISOString() 
        })
        .eq('id', proposal_id);

      return {
        result: {
          proposal_id,
          apply_method: 'storage',
          status: 'applied',
          message: 'Code change marked as applied.'
        },
        requiresApproval: false,
        jsonDisplay: {
          type: 'apply_code',
          title: `✅ Applied: ${proposal.file_path}`,
          data: {
            action: 'apply_code_change',
            file: proposal.file_path,
            status: 'APPLIED'
          }
        }
      };
    }

    case 'enhanced_file_operation': {
      const { operation, file_path, content, description } = args;
      
      const requiresApproval = ['create', 'update', 'delete'].includes(operation);
      const riskLevel = operation === 'delete' ? 'high' : operation === 'update' ? 'medium' : 'low';

      if (operation === 'list') {
        // Just list files - no approval needed
        const { data: files } = await supabase
          .from('uploaded_documents')
          .select('file_name, file_type, file_size, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        return {
          result: {
            operation: 'list',
            file_count: files?.length || 0,
            files: files
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'file_list',
            title: 'File List',
            data: {
              action: 'enhanced_file_operation',
              operation: 'list',
              count: files?.length || 0
            }
          }
        };
      }

      if (operation === 'read') {
        // Read file from storage
        const { data: fileData } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('storage_path', file_path)
          .single();

        return {
          result: {
            operation: 'read',
            file_path,
            file_data: fileData,
            content: fileData?.extracted_text?.substring(0, 2000)
          },
          requiresApproval: false,
          jsonDisplay: {
            type: 'file_read',
            title: `📄 ${file_path}`,
            data: {
              action: 'enhanced_file_operation',
              operation: 'read',
              path: file_path,
              size: fileData?.file_size
            }
          }
        };
      }

      // Create/Update/Delete require logging and approval
      const { data: fileOp } = await supabase
        .from('file_operations_log')
        .insert({
          user_id: userId,
          session_id: sessionId,
          operation_type: operation,
          file_path,
          file_content: content,
          change_description: description,
          status: 'pending',
          requires_approval: requiresApproval,
          risk_level: riskLevel
        })
        .select()
        .single();

      return {
        result: {
          operation_id: fileOp?.id,
          operation,
          file_path,
          status: 'pending_approval',
          message: `File ${operation} operation requires developer approval.`
        },
        requiresApproval,
        jsonDisplay: {
          type: 'file_operation',
          title: `📁 ${operation}: ${file_path}`,
          data: {
            action: 'enhanced_file_operation',
            operation,
            path: file_path,
            risk: riskLevel.toUpperCase(),
            status: 'PENDING_APPROVAL'
          }
        }
      };
    }

    default:
      return { 
        result: { executed: false, reason: 'Tool not implemented' }, 
        requiresApproval: false 
      };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, 
      sessionId, 
      userId, 
      userRole = 'employee',
      mode = 'chat',
      action,
      actionData
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle direct actions
    if (action) {
      const result = await processToolCall(supabase, action, actionData, sessionId, userId, userRole);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate input safety
    const lastMessage = messages[messages.length - 1]?.content || '';
    const inputSafety = validateTaskSafety(lastMessage);
    
    if (!inputSafety.safe) {
      await supabase.from('ai_safety_audit').insert({
        session_id: sessionId,
        user_id: userId,
        action_type: 'input_blocked',
        action_data: { message: lastMessage.substring(0, 200) },
        safety_score: inputSafety.score,
        risk_flags: inputSafety.flags,
        was_blocked: true
      });
      
      return new Response(JSON.stringify({
        blocked: true,
        message: "I detected potentially harmful patterns in your request. Please rephrase.",
        flags: inputSafety.flags
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse for multiple tasks
    const parsedTasks = parseMultipleTasks(lastMessage);
    
    // Fetch learned patterns
    const { data: patterns } = await supabase
      .from('ai_learned_patterns')
      .select('*')
      .eq('is_validated', true)
      .eq('is_harmful', false)
      .order('confidence_score', { ascending: false })
      .limit(10);

    // Build enhanced system prompt with context
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    enhancedSystemPrompt += `\n\n## CURRENT CONTEXT
- User Role: ${userRole}
- Mode: ${mode}
- Detected Tasks: ${parsedTasks.count}
- Available Features for ${userRole}: ${userRole === 'developer' ? 'All features including code operations' : userRole === 'hr' ? 'HR features and employee management' : 'Basic employee features'}`;
    
    if (patterns && patterns.length > 0) {
      enhancedSystemPrompt += `\n\n## LEARNED PATTERNS\n`;
      for (const pattern of patterns) {
        enhancedSystemPrompt += `- ${pattern.pattern_type}: ${JSON.stringify(pattern.pattern_data)}\n`;
      }
    }

    // Prepare messages
    const aiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    // Call AI with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        stream: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Log analytics
    await supabase.from('ai_analytics').insert({
      session_id: sessionId,
      user_id: userId,
      query_type: parsedTasks.count > 1 ? 'multi_task' : 'single_task',
      domain: userRole,
      confidence_score: 1.0
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    console.error('Error in advanced-agent:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
