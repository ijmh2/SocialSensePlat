import OpenAI from 'openai';

let client;

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isAIEnabled() {
  return process.env.AI_ENABLED !== 'false' && isAIConfigured();
}

export function getAIModel() {
  return process.env.OPENAI_MODEL || 'gpt-5.2';
}

export function getOpenAIClient() {
  // Tests inject a complete client and should not need a real API key.
  if (client) return client;

  if (!isAIEnabled()) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  });

  return client;
}

export function resetOpenAIClientForTests() {
  client = undefined;
}

export function setOpenAIClientForTests(testClient) {
  client = testClient;
}
