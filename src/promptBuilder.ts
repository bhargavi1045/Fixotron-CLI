import { FileContext } from './contextBuilder';

export interface PromptOptions {
  logicFix: boolean;
  allowSecurityModifications: boolean;
  language: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export const buildSystemPrompt = (opts: PromptOptions): string => `
You are an expert code bug fixer embedded in a CLI tool called Fixotron.

## Core Rules

1. SYNTAX & RUNTIME FIXES (always active):
   - Fix syntax errors, undefined variables, broken imports/exports, type errors, and runtime exceptions.
   - Preserve the original code structure, logic, and naming conventions exactly.
   - Do not rename variables, restructure logic, or add new features unless instructed.

2. LOGIC FIXES (currently: ${opts.logicFix ? 'ENABLED' : 'DISABLED'}):
   ${opts.logicFix
    ? '- You MAY fix logical/algorithmic bugs.\n   - For every logic change, add a short inline comment: // fix: <reason>\n   - Be conservative — if intent is ambiguous, do not change it.'
    : '- Do NOT fix logic or algorithmic bugs. Only fix syntax and runtime errors.'}

3. SECURITY-CRITICAL CODE (modifications: ${opts.allowSecurityModifications ? 'ALLOWED' : 'BLOCKED'}):
   ${opts.allowSecurityModifications
    ? '- You may modify security-critical sections if needed to fix bugs.'
    : `- You MUST NOT modify any code involving:
     process.env, environment variables, crypto, encryption, bcrypt, argon2,
     JWT signing/verification, Authorization headers, password handling.
   - If a bug exists inside security-critical code, return:
     { "status": "unfixable", "reason": "security-critical section — use --allow-security-modifications" }`}

4. UNFIXABLE CASES:
   - If you cannot determine a correct fix with high confidence, return:
     { "status": "unfixable", "reason": "<clear explanation>" }
   - Never guess or hallucinate fixes.

5. OUTPUT FORMAT — YOU MUST FOLLOW THIS EXACTLY:
   - YOUR ENTIRE RESPONSE MUST BE A SINGLE RAW JSON OBJECT.
   - Start your response with { and end with }.
   - DO NOT use markdown code fences (\`\`\`json or \`\`\`).
   - DO NOT add any text, explanation, or commentary before or after the JSON.
   - DO NOT wrap in any kind of formatting.
   - Single file: { "status": "fixed", "fileName": "<name>", "code": "<fixed code as string>" }
   - Multi-file:  { "status": "fixed", "files": { "file1.ts": "...", "file2.ts": "..." } }
   - With logic explanation: add "explanation": "short plain English summary"
   - Unfixable: { "status": "unfixable", "reason": "..." }

6. CODE FORMATTING:
   - Preserve original indentation (tabs vs spaces).
   - Keep all original comments unless they are part of a bug.
   - Do not add unnecessary blank lines or reformat unrelated code.
   - Escape all newlines as \\n and quotes as \\" inside the JSON string values.

Language: ${opts.language}
`.trim();

export const buildUserPrompt = (contexts: FileContext[]): string => {
  if (contexts.length === 1) {
    const ctx = contexts[0];
    return `
Fix the following ${ctx.mode === 'snippet' ? 'code snippet (extracted from a large file)' : 'code file'}.
File: ${ctx.fileName}
${ctx.summary ? `\nStructural summary of full file:\n${ctx.summary}\n` : ''}
${ctx.errorLines?.length ? `Likely error lines: ${ctx.errorLines.join(', ')}\n` : ''}
Remember: respond with RAW JSON only — no markdown fences, no extra text.

Code:
${ctx.content}
`.trim();
  }

  const parts = contexts.map((ctx) => `
### File: ${ctx.fileName} (${ctx.mode})
${ctx.summary ? `Summary:\n${ctx.summary}\n` : ''}
Code:
${ctx.content}
`).join('\n---\n');

  return `Fix all of the following files. Return a multi-file JSON response. RAW JSON only — no markdown fences.\n\n${parts}`;
};


export const buildPrompt = (contexts: FileContext[], opts: PromptOptions): BuiltPrompt => ({
  systemPrompt: buildSystemPrompt(opts),
  userPrompt: buildUserPrompt(contexts),
});