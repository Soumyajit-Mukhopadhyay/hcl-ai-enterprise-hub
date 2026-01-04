# HCLTech AI Developer CLI

A powerful AI-powered full-stack developer assistant that automatically fixes errors, watches for changes, and integrates with Git.

## 🚀 Features

- **Auto-Fix Loop**: Continuously analyzes and fixes errors until success
- **Watch Mode**: Monitors file changes and auto-fixes in real-time
- **Git Integration**: Automatic commits, push, pull, and branch management
- **AI-Powered Analysis**: Uses Google Gemini/OpenAI for intelligent error analysis
- **Multi-Check Support**: TypeScript, ESLint, and build checks
- **Interactive Mode**: Approve or reject fixes before applying
- **Backup & Revert**: Automatic backups with easy rollback

## 📦 Installation

### From the cloned repository:

```bash
# Navigate to the CLI directory
cd cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Link globally (makes 'hcl-dev' available everywhere)
npm link
```

### Quick install:

```bash
cd cli && npm install && npm run build && npm link
```

## ⚙️ Configuration

### 1. Initialize Configuration

```bash
hcl-dev init
```

This creates a `.hcl-dev.json` config file in your project.

### 2. Set Up API Key

Create a `.env` file in your project root:

```env
# Required: Your AI API key
AI_API_KEY=your_api_key_here

# Optional: Custom AI gateway (defaults to Lovable AI)
AI_GATEWAY_URL=https://ai.gateway.lovable.dev/v1/chat/completions

# Optional: Choose model (defaults to gemini-2.5-flash)
AI_MODEL=google/gemini-2.5-flash

# Optional: GitHub token for private repos
GITHUB_TOKEN=your_github_token
```

### 3. Configuration File (.hcl-dev.json)

```json
{
  "aiModel": "google/gemini-2.5-flash",
  "maxRetries": 5,
  "retryDelay": 2000,
  "timeout": 60000,
  "verbose": false,
  "watchPatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "ignorePatterns": ["node_modules/**", "dist/**", ".git/**"]
}
```

## 📖 Commands

### `hcl-dev fix`

Analyze and fix errors in your project.

```bash
# Basic fix (build check)
hcl-dev fix

# TypeScript only
hcl-dev fix --type typecheck

# ESLint only
hcl-dev fix --type lint

# All checks
hcl-dev fix --type all

# Non-interactive mode
hcl-dev fix --no-interactive

# Skip auto-commit
hcl-dev fix --no-commit

# Custom max iterations
hcl-dev fix --max-iterations 10
```

### `hcl-dev watch`

Watch for file changes and auto-fix errors.

```bash
# Start watching with auto-fix
hcl-dev watch

# Watch without auto-fix (just report errors)
hcl-dev watch --no-auto-fix

# Custom debounce time
hcl-dev watch --debounce 2000
```

### `hcl-dev clone <repo>`

Clone a repository and set up AI development.

```bash
# Clone and install dependencies
hcl-dev clone https://github.com/user/repo.git

# Clone to specific directory
hcl-dev clone https://github.com/user/repo.git --path my-project

# Clone without installing dependencies
hcl-dev clone https://github.com/user/repo.git --no-install
```

### `hcl-dev status`

Show project and git status.

```bash
hcl-dev status
```

### `hcl-dev push`

Commit and push changes.

```bash
# Auto-generated commit message
hcl-dev push

# Custom commit message
hcl-dev push -m "feat: add new feature"
```

### `hcl-dev pull`

Pull latest changes.

```bash
hcl-dev pull
```

## 🔄 How the Fix Loop Works

```
┌─────────────────────────────────────────────────────────────┐
│                     HCL-DEV FIX LOOP                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. RUN CHECK (build/typecheck/lint)                       │
│              │                                              │
│              ▼                                              │
│   2. PARSE ERRORS                                           │
│              │                                              │
│              ▼                                              │
│   3. GATHER FILE CONTEXT                                    │
│              │                                              │
│              ▼                                              │
│   4. AI ANALYSIS                                            │
│      ├── Analyzes errors                                    │
│      ├── Considers project structure                        │
│      └── Proposes fixes                                     │
│              │                                              │
│              ▼                                              │
│   5. SHOW PROPOSED FIXES                                    │
│              │                                              │
│              ▼                                              │
│   6. APPLY FIXES (with backup)                              │
│              │                                              │
│              ▼                                              │
│   7. REPEAT until success or max iterations                 │
│              │                                              │
│              ▼                                              │
│   8. AUTO-COMMIT (optional)                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Workflow Example

```bash
# 1. Clone a repository
hcl-dev clone https://github.com/your-org/your-project.git

# 2. Navigate to project
cd your-project

# 3. Initialize AI developer config
hcl-dev init

# 4. Fix any existing errors
hcl-dev fix

# 5. Start development with auto-fix
hcl-dev watch

# 6. Make changes... errors are auto-fixed!

# 7. Push when ready
hcl-dev push -m "feat: implement new feature"
```

## 🛠️ Supported Error Types

- **TypeScript**: Type errors, import issues, syntax errors
- **ESLint**: Linting violations, code style issues
- **Build**: Vite/Webpack build failures
- **Runtime**: Common React errors

## 📝 Logs

- All operations are logged to `.hcl-dev.log`
- Enable verbose mode for detailed logging: `VERBOSE=true hcl-dev fix`

## 🔐 Security

- API keys are stored in `.env` (add to `.gitignore`)
- Backup files are created before any changes
- Interactive mode allows reviewing fixes before applying

## 🤝 Supported AI Models

- `google/gemini-2.5-flash` (default, fast)
- `google/gemini-2.5-pro` (more accurate)
- `openai/gpt-5-mini` (balanced)
- `openai/gpt-5` (most capable)

## ⚠️ Requirements

- Node.js 18+
- Git installed and configured
- Valid AI API key

## 📄 License

MIT License - HCLTech AI Team
