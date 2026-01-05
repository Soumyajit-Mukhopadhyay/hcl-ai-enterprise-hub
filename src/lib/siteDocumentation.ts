// Complete Website Documentation for AI Context
// This file provides the AI with full knowledge of the website structure

export const SITE_DOCUMENTATION = {
  overview: {
    name: "Enterprise AI Assistant Portal",
    description: "A multi-role enterprise portal with AI-powered automation for HR, IT, and Developer teams",
    version: "2.0.0",
    lastUpdated: new Date().toISOString()
  },

  roles: {
    employee: {
      description: "Regular employee with access to basic HR functions",
      permissions: ["view_leave_balance", "submit_leave_request", "view_payslip", "submit_reimbursement", "report_bug"],
      restrictedPages: ["/dev-console", "/admin"]
    },
    hr: {
      description: "HR personnel with approval and management capabilities",
      permissions: ["all_employee_permissions", "approve_leave", "approve_reimbursement", "manage_training", "view_all_employees"],
      restrictedPages: ["/dev-console"]
    },
    it: {
      description: "IT support with access and deployment management",
      permissions: ["manage_access_requests", "manage_deployments", "handle_incidents", "system_monitoring"],
      restrictedPages: []
    },
    developer: {
      description: "Developer with full code and system access",
      permissions: ["all_permissions", "code_changes", "approve_ai_capabilities", "self_learning_config", "github_integration"],
      restrictedPages: []
    }
  },

  pages: {
    "/": {
      name: "Main Dashboard",
      description: "Central hub after login with quick actions and recent activity",
      component: "MainDashboard",
      accessibleBy: ["employee", "hr", "it", "developer"],
      features: ["Quick Actions", "Recent Activity", "Role-specific Widgets"]
    },
    "/assistant": {
      name: "AI Assistant",
      description: "Chat interface with the intelligent AI assistant",
      component: "Assistant",
      accessibleBy: ["employee", "hr", "it", "developer"],
      features: ["Multi-task Processing", "Natural Language Commands", "Task Decomposition"]
    },
    "/dashboard": {
      name: "Analytics Dashboard",
      description: "Real-time analytics and metrics dashboard",
      component: "Dashboard",
      accessibleBy: ["hr", "it", "developer"],
      features: ["Charts", "KPIs", "Domain Tabs"]
    },
    "/dev-console": {
      name: "Developer Console",
      description: "Developer tools for code review, AI training, and GitHub integration",
      component: "DevConsole",
      accessibleBy: ["developer"],
      features: ["Bug Reports", "Code Review", "Self-Learning AI", "Capability Requests", "GitHub Integration"]
    },
    "/auth": {
      name: "Authentication",
      description: "Login and signup page",
      component: "Auth",
      accessibleBy: ["public"],
      features: ["Login", "Signup", "Password Reset"]
    }
  },

  components: {
    navigation: {
      AppSidebar: "Main sidebar navigation with role-based menu items",
      RoleBasedNav: "Dynamic navigation based on user role"
    },
    chat: {
      ChatInput: "Message input with file attachment support",
      ChatMessage: "Individual message display with markdown support",
      ActionCard: "Interactive action cards for approvals",
      JSONSchemaCard: "Structured JSON display for technical details",
      RiskBadge: "Risk level indicator",
      CitationCard: "Source citations display",
      GlassBoxVisualization: "AI reasoning transparency view"
    },
    workflows: {
      LeaveWorkflow: "Leave request submission and tracking",
      ReimbursementWorkflow: "Expense reimbursement workflow",
      PayslipWorkflow: "Payslip viewing and download",
      TrainingWorkflow: "Training enrollment and tracking",
      OnboardingWorkflow: "New employee onboarding",
      PerformanceWorkflow: "Performance review management",
      PayrollWorkflow: "Payroll processing",
      AccessRequestWorkflow: "System access requests",
      DeploymentWorkflow: "Code deployment management",
      IncidentWorkflow: "Incident reporting and resolution",
      TicketWorkflow: "Support ticket management"
    },
    ai: {
      TaskDecompositionPanel: "Multi-task breakdown visualization",
      SafetyGuardrailsPanel: "Safety checks and blocked patterns",
      FeedbackLearningPanel: "User feedback collection",
      ApprovalWorkflowPanel: "Action approval interface",
      ToolRegistryPanel: "Available AI tools display",
      SelfLearningPanel: "AI training interface for developers",
      CapabilityRequestPanel: "New capability request management",
      DeveloperMode: "Developer-specific AI controls"
    },
    developer: {
      CodeChangeReview: "Code diff viewer with approval",
      GitHubIntegrationPanel: "Git operations and sync",
      CodeDiffViewer: "Side-by-side code comparison"
    }
  },

  database: {
    tables: {
      profiles: "User profile information",
      user_roles: "User role assignments",
      chat_sessions: "Chat conversation sessions",
      chat_messages: "Individual chat messages",
      leave_requests: "Leave/vacation requests",
      leave_balance: "Employee leave balances",
      reimbursement_requests: "Expense reimbursements",
      training_requests: "Training enrollments",
      payslip_requests: "Payslip access requests",
      meetings: "Meeting scheduling",
      notifications: "User notifications",
      approval_requests: "Generic approval workflow",
      access_requests: "System access requests",
      deployment_requests: "Code deployment requests",
      incident_reports: "IT incident reports",
      dev_tickets: "Developer bug tickets",
      code_change_proposals: "AI proposed code changes",
      ai_task_queue: "Multi-task queue",
      ai_tool_registry: "Available AI tools",
      ai_learned_patterns: "AI learned behaviors",
      ai_feedback: "User feedback on AI responses",
      ai_safety_audit: "Safety check logs",
      ai_blocked_patterns: "Blocked harmful patterns",
      ai_capability_requests: "New capability requests",
      ai_learning_sessions: "AI training sessions",
      ai_analytics: "AI usage analytics"
    }
  },

  automations: {
    hr: {
      leave_management: {
        description: "Automated leave request processing",
        actions: ["Submit leave", "Check balance", "Auto-approve if eligible", "Notify manager"]
      },
      reimbursement: {
        description: "Expense reimbursement automation",
        actions: ["Submit expense", "OCR receipt", "Validate amounts", "Route for approval"]
      },
      payslip: {
        description: "Payslip generation and distribution",
        actions: ["Generate payslip", "Calculate taxes", "Send notification"]
      },
      onboarding: {
        description: "New employee onboarding automation",
        actions: ["Create accounts", "Assign training", "Setup access", "Notify team"]
      },
      training: {
        description: "Training management",
        actions: ["Enroll in course", "Track progress", "Issue certificate"]
      },
      performance: {
        description: "Performance review automation",
        actions: ["Schedule reviews", "Collect feedback", "Generate reports"]
      }
    },
    developer: {
      bug_workflow: {
        description: "Automated bug detection and fixing",
        actions: ["Create ticket", "Analyze code", "Propose fix", "Test changes", "Deploy fix"]
      },
      code_review: {
        description: "AI-assisted code review",
        actions: ["Analyze changes", "Check security", "Suggest improvements", "Approve/reject"]
      },
      deployment: {
        description: "Automated deployment pipeline",
        actions: ["Build", "Test", "Stage", "Deploy", "Rollback"]
      },
      github_integration: {
        description: "Real-time GitHub sync",
        actions: ["Pull", "Push", "Commit", "Create PR", "Merge"]
      }
    },
    it: {
      access_management: {
        description: "Access request automation",
        actions: ["Request access", "Validate need", "Provision access", "Audit log"]
      },
      incident_management: {
        description: "Incident response automation",
        actions: ["Detect incident", "Alert team", "Diagnose", "Resolve", "Post-mortem"]
      }
    }
  },

  aiCapabilities: {
    core: [
      "Multi-task decomposition and parallel execution",
      "Natural language understanding with intent classification",
      "Safety guardrails and harmful pattern detection",
      "Role-based access control enforcement",
      "Self-learning from feedback and conversations",
      "Tool calling with approval workflow"
    ],
    tools: [
      "Web search via Perplexity",
      "Calculator for computations",
      "Date/time awareness",
      "Social media profile lookup",
      "Code analysis and generation",
      "File read/write operations",
      "Git operations",
      "Database queries"
    ],
    socialPlatforms: {
      linkedin: "Professional profile and work history lookup",
      instagram: "Public profile and activity search",
      facebook: "Public profile information",
      twitter: "Public tweets and profile"
    }
  }
};

export const getSiteContext = () => JSON.stringify(SITE_DOCUMENTATION, null, 2);

export const getPageInfo = (path: string) => {
  return SITE_DOCUMENTATION.pages[path as keyof typeof SITE_DOCUMENTATION.pages] || null;
};

export const getRolePermissions = (role: string) => {
  return SITE_DOCUMENTATION.roles[role as keyof typeof SITE_DOCUMENTATION.roles] || null;
};

export const getAutomations = (domain: 'hr' | 'developer' | 'it') => {
  return SITE_DOCUMENTATION.automations[domain] || null;
};
