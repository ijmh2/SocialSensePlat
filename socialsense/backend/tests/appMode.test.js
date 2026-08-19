import { describe, expect, it } from 'vitest';
import { resolveAppMode } from '../config/appMode.js';

describe('application startup mode', () => {
  it('starts the minimal demo when SaaS dependencies are absent', () => {
    expect(resolveAppMode({ OPENAI_API_KEY: 'test-key' })).toBe('demo');
  });

  it('infers full mode only when billing and database configuration exist', () => {
    expect(resolveAppMode({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      STRIPE_SECRET_KEY: 'stripe-key',
    })).toBe('full');
  });

  it('honours an explicit supported mode', () => {
    expect(resolveAppMode({ APP_MODE: 'DEMO', SUPABASE_URL: 'present' })).toBe('demo');
  });
});
