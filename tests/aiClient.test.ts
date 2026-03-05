import { callAI } from '../src/aiClient';

const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: '{"status":"fixed","fileName":"test.ts","code":"const x = 1;"}' } }],
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

describe('aiClient', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"status":"fixed","fileName":"test.ts","code":"const x = 1;"}' } }],
    });
  });

  it('returns fixed result on valid response via groq', async () => {
    const result = await callAI('system', 'fix this code', { provider: 'groq' });
    expect(result.status).toBe('fixed');
  });

  it('returns fixed result on valid response via gemini', async () => {
    const result = await callAI('system', 'fix this code', { provider: 'gemini' });
    expect(result.status).toBe('fixed');
  });

  it('returns unfixable on empty response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    });
    const result = await callAI('system', 'fix', { provider: 'groq' });
    expect(result.status).toBe('unfixable');
    expect(result.reason).toContain('empty');
  });

  it('handles malformed JSON gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'this is not json at all!!!' } }],
    });
    const result = await callAI('system', 'fix', { provider: 'groq' });
    expect(result.status).toBe('unfixable');
    expect(result.reason).toContain('malformed');
  });

  it('uses groq as default provider', async () => {
    const result = await callAI('system', 'fix', { provider: 'groq' });
    expect(result.status).toBe('fixed');
  });
});