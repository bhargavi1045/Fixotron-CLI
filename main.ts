import dotenv from 'dotenv';
dotenv.config();

import { runCLI } from './src/cli';

async function main() {
  const requiredEnvCheck = () => {
    const provider = process.env.DEFAULT_PROVIDER || 'openai';
    if (provider === 'groq' && !process.env.GROQ_API_KEY) {
      console.error('Missing GROQ_API_KEY in .env');
      process.exit(1);
    }
    if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY in .env');
      process.exit(1);
    }
  };

  requiredEnvCheck();
  await runCLI();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});