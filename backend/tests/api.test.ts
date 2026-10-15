import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('DocuMind API Integration Tests', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('documind-api');
  });

  it('GET /api/v1/ready returns ready status', async () => {
    const res = await request(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /api/v1/organizations returns authorized organizations', async () => {
    const res = await request(app)
      .get('/api/v1/organizations')
      .set('Authorization', 'Bearer demo-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].slug).toBe('apex-logistics');
  });

  it('GET /api/v1/documents returns paginated documents', async () => {
    const res = await request(app)
      .get('/api/v1/documents?limit=5')
      .set('Authorization', 'Bearer demo-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.limit).toBe(5);
  });

  it('GET /api/v1/dashboard/summary returns computed metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', 'Bearer demo-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_documents).toBeGreaterThanOrEqual(1);
    expect(res.body.data.processing_success_rate).toBeDefined();
  });

  it('POST /api/v1/knowledge/ask answers questions grounded in documents', async () => {
    const res = await request(app)
      .post('/api/v1/knowledge/ask')
      .set('Authorization', 'Bearer demo-token')
      .send({
        question: 'What is the total of invoice 4401?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeDefined();
    expect(res.body.data.supported).toBe(true);
  });

  it('POST /api/v1/exports/csv returns formula-safe CSV', async () => {
    const res = await request(app)
      .post('/api/v1/exports/csv')
      .set('Authorization', 'Bearer demo-token')
      .send({
        data_type: 'documents',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('ID,Title,Category');
  });
});
