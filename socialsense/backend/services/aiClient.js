import OpenAI from 'openai';

let client;

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getAIModel() {
  return process.env.OPENAI_MODEL || 'gpt-5.2';
}

export function getOpenAIClient() {
  if (!isAIConfigured()) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
  }

  return client;
}

export function resetOpenAIClientForTests() {
  client = undefined;
}

export function setOpenAIClientForTests(testClient) {
  client = testClient;
}
