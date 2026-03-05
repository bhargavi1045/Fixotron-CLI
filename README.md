# Fixotron-CLI : AI-powered command-line tool that automatically detects and fixes bugs in your code 
----
## Overview
Fixotron CLI is an AI-powered developer tool that automatically detects and fixes bugs in JavaScript, TypeScript, and Python files.

It integrates with Groq and Google Gemini, applies strict prompt engineering and security safeguards, and provides a full workflow for:

✓Reading code files

✓Building contextual prompts

✓Calling AI models

✓Parsing responses safely

✓Showing syntax-highlighted diffs

✓Writing fixes to disk

✓Managing backups and history

✓Running fixed code in a sandbox

---
## Features 

1. Multi-Provider AI : Groq and Gemini
2. Smart Context Strategy :
   
   • Files <1000 lines → full file sent to AI
   
   • Files ≥1000 lines → relevant snippets + structural summary
3. Security Gate :
   Blocks AI access to sensitive code:
   • process.env
   
   • crypto
   
   • jwt
   
   • bcrypt
   
   • auth middleware
   
   • authorization headers
   
4. Automatic Fixing
   • Syntax errors
   
   • Runtime errors
   
   • Optional logic fixes (--logic-fix)
   
5. Backup and Restore
   
   • Timestamped backups before overwriting files
   
6. Undo/Redo : Persistent fix history
7. Batch Fixing

---
## Tech Stack 
| Layer | Technology |
|---|---|
| Language | TypeScript (Node.js) |
| CLI Framework | Commander.js |
| AI Providers | Groq API, Gemini API |
| Terminal UI | Chalk, Ora, cli-highlight, Inquirer |
| Git Integration | simple-git |
| Testing | Jest + ts-jest |
| Runtime | ts-node |

---
## Installation

**1️. Clone the repository**
```bash
git clone https://github.com/yourusername/fixotron-cli.git
cd fixotron-cli
```

**2. dependencies**
```bash
npm install
```

**3️. Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your API keys.

## Environment Setup
```env
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=AIza_your_key_here
DEFAULT_PROVIDER=groq
```
---
## Usage

**Fix a single file**
```bash
npx ts-node main.ts fix --file src/server.ts
```

**Fix and save back to disk**
```bash
npx ts-node main.ts fix --file src/server.ts --save --backup
```

**Fix an entire folder**
```bash
npx ts-node main.ts fix --folder src --save --backup
```

**Fix code from stdin**
```bash
npx ts-node main.ts fix --paste < broken.js
```
or
```bash
echo "const x = {" | npx ts-node main.ts fix --paste
```

**Enable logic bug fixing**
```bash
npx ts-node main.ts fix --file utils.ts --logic-fix --save
```

**Allow AI to modify security-critical code**
```bash
npx ts-node main.ts fix --file auth.ts --allow-security-modifications --save --backup
```

**Auto-commit fixes to Git**
```bash
npx ts-node main.ts fix --file src/api.ts --save --auto-commit
```

**Run fixed code in sandbox**
```bash
npx ts-node main.ts fix --file script.js --save --run
```

**Use Gemini instead of Groq**
```bash
npx ts-node main.ts fix --file src/app.ts --provider gemini
```

---

## Undo / Redo

**Undo the last fix**
```bash
npx ts-node main.ts undo
```

**Redo the fix**
```bash
npx ts-node main.ts redo
```

**View history**
```bash
npx ts-node main.ts history
```
## CLI Flags

| Flag | Description |
|---|---|
| `--file <path>` | Fix a single file |
| `--folder <path>` | Fix all supported files recursively |
| `--paste` | Read code from stdin |
| `--logic-fix` | Enable logic/algorithmic bug fixing |
| `--allow-security-modifications` | Allow AI to modify auth/crypto/env code |
| `--save` | Write fixed code to disk |
| `--backup` | Create timestamped backup |
| `--auto-commit` | Commit fixes to git |
| `--run` | Execute fixed code in sandbox |
| `--provider <name>` | AI provider (`groq` or `gemini`) |
| `--model <name>` | Override model |
| `--debug` | Enable verbose logging |

---

##  Supported File Types

| Extension | Language |
|---|---|
| `.ts`, `.tsx` | TypeScript |
| `.js`, `.jsx` | JavaScript |
| `.py` | Python |

---

##  How It Works
```
Your file
   │
   ▼
contextBuilder.ts
 ├── <1000 lines → send full file
 └── ≥1000 lines → extract snippets + summary
   │
   ▼
promptBuilder.ts
 └── builds AI prompt with rules
   │
   ▼
aiClient.ts
 ├── calls Groq / Gemini
 ├── retries with backoff
 └── parses response safely
   │
   ▼
bugFixer.ts
 ├── security gate
 ├── history manager
 ├── file write
 ├── git commit
 └── sandbox execution
   │
   ▼
outputFormatter.ts
 └── syntax-highlighted terminal output
```
---
## Running Tests

**Run all tests**
```bash
npm test
```

**Watch mode**
```bash
npm run test:watch
```

**Coverage**
```bash
npm run test:coverage
```
