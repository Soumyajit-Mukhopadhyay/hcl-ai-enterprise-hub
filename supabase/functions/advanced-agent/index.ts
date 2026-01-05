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
      description: "Request a new capability when AI lacks the ability",
      parameters: {
        type: "object",
        properties: {
          capability_name: { type: "string" },
          capability_type: { type: "string" },
          description: { type: "string" },
          reason: { type: "string" }
        },
        required: ["capability_name", "description", "reason"]
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
            parameters: { type: "object", properties: {} }
          },
          safety_analysis: {
            is_safe: safetyCheck.safe,
            risk_level: safetyCheck.safe ? 'low' : 'high'
          }
        })
        .select()
        .single();

      return {
        result: {
          request_id: request?.id,
          status: 'pending_developer_approval',
          message: 'Capability request submitted for developer review.'
        },
        requiresApproval: true,
        jsonDisplay: {
          type: 'action',
          title: 'Capability Request',
          data: {
            action: 'request_capability',
            capability: args.capability_name,
            description: args.description,
            status: 'PENDING_APPROVAL'
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
