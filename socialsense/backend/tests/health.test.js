import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createDemoApp } from '../demoApp.js';

const app = createDemoApp();

describe('Health API', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'commentiq-llm');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});
