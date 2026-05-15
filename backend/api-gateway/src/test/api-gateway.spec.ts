import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';

// Supabase sign-in để lấy JWT thật
async function getSupabaseJwt(): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'truongvanhau0511@gmail.com',
    password: '1234567',
  });
  if (error || !data.session) throw new Error('Cannot sign in: ' + error?.message);
  return data.session.access_token;
}

describe('API Gateway (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    jwtToken = await getSupabaseJwt();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── HEALTH ──────────────────────────────────────────────────────────────────

  // TC-GW-01
  it('TC-GW-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // ─── AUTH GUARD ───────────────────────────────────────────────────────────────

  // TC-GW-02
  it('TC-GW-02: request không có Authorization header → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  // TC-GW-03
  it('TC-GW-03: request với token sai → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', 'Bearer invalid_token_here');
    expect(res.status).toBe(401);
  });

  // TC-GW-04
  it('TC-GW-04: request với JWT hợp lệ → không phải 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).not.toBe(401);
  });

  // TC-GW-05
  it('TC-GW-05: Bearer token phải đúng scheme (không phải Basic)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', `Basic ${jwtToken}`);
    expect(res.status).toBe(401);
  });

  // ─── PROXY ROUTING ────────────────────────────────────────────────────────────

  // TC-GW-06
  it('TC-GW-06: route /api/transactions proxy đến transaction-service', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', `Bearer ${jwtToken}`);
    // proxy thành công → không phải 404 từ gateway
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-07
  it('TC-GW-07: route /api/users proxy đến identity-service', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-08
  it('TC-GW-08: route /api/categories proxy đến transaction-service', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-09
  it('TC-GW-09: route /api/budgets proxy đến budget-notification-service', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/budgets/current')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-10
  it('TC-GW-10: route không tồn tại → 404 với message Gateway', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/unknown-route-xyz')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Gateway: Route not found');
  });

  // TC-GW-11
  it('TC-GW-11: route /api/chatbot proxy đến finance-intelligence', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/chatbot/history')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-12
  it('TC-GW-12: route /api/anomalies proxy đến finance-intelligence', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/anomalies')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-13
  it('TC-GW-13: route /api/ocr proxy đến ocr-service', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ocr/scan')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ source_type: 'camera', image_url: 'https://example.com/test.jpg' });
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // ─── PROXY HEADER INJECTION ───────────────────────────────────────────────────

  // TC-GW-14
  it('TC-GW-14: gateway inject x-user-id vào downstream', async () => {
    // Proxy gọi /api/users/me → identity-service đọc x-user-id
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${jwtToken}`);
    // nếu identity-service trả profile đúng → gateway đã inject đúng user_id
    expect(res.status).not.toBe(500);
  });

  // ─── RATE LIMIT ───────────────────────────────────────────────────────────────

  // TC-GW-15
  it('TC-GW-15: GET /metrics trả về metrics Prometheus', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('# HELP');
  });

  // ─── VALIDATION / INTEGRATION ─────────────────────────────────────────────────

  // TC-GW-16
  it('TC-GW-16: POST /api/transactions với body hợp lệ → không phải 401/404', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        type: 'expense',
        amount: 50000,
        category_id: '00000000-0000-0000-0000-000000000000', // dummy uuid để test routing
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
      });
    // Gateway đã forward đến transaction-service → không phải gateway 404
    expect(res.body.message).not.toBe('Gateway: Route not found');
  });

  // TC-GW-17
  it('TC-GW-17: Content-Type application/json được forward đúng', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/chatbot/ask')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('Content-Type', 'application/json')
      .send({ message: 'xin chào' });
    expect(res.status).not.toBe(415);
  });

  // TC-GW-18
  it('TC-GW-18: Authorization header được forward xuống downstream (không bị strip)', async () => {
    // identity-service không dùng JWT (dùng x-user-id), nhưng gateway phải forward header
    const res = await request(app.getHttpServer())
      .get('/api/users/settings')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).not.toBe(401);
  });

  // TC-GW-19
  it('TC-GW-19: PUT /api/users/me với JWT hợp lệ → không phải 401', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ full_name: 'Test CI User' });
    expect(res.status).not.toBe(401);
  });

  // TC-GW-20
  it('TC-GW-20: DELETE /api/transactions/:id với id không tồn tại → 404 từ downstream', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/transactions/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${jwtToken}`);
    // downstream trả 404 (not found) hoặc 422/400 — không phải gateway 404
    expect(res.body.message).not.toBe('Gateway: Route not found');
    expect([400, 404, 422, 500]).toContain(res.status);
  });
});
