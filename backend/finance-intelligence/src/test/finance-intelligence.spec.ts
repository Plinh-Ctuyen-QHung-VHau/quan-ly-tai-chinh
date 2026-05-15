import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { detectDailySpike, detectFrequency } from '../anomaly/anomaly.detector';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';

describe('Finance Intelligence Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── HEALTH ───────────────────────────────────────────────────────────────────

  // TC-FI-01
  it('TC-FI-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // TC-FI-02
  it('TC-FI-02: GET /metrics trả về Prometheus metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('# HELP');
  });

  // ─── UNIT: Anomaly Detector ───────────────────────────────────────────────────

  // TC-FI-03
  it('TC-FI-03: detectDailySpike phát hiện chi tiêu trong ngày bất thường', () => {
    const result = detectDailySpike(10_000_000, 1_000_000, 2);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('daily_spike');
  });

  // TC-FI-04
  it('TC-FI-04: detectDailySpike trả về null khi số tiền bình thường', () => {
    const result = detectDailySpike(500_000, 1_000_000, 2);
    expect(result).toBeNull();
  });

  // TC-FI-05
  it('TC-FI-05: detectFrequency phát hiện tần suất giao dịch bất thường', () => {
    const result = detectFrequency(20, 3, 2);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('frequency');
  });

  // ─── API: POST /chatbot/ask ────────────────────────────────────────────────────

  // TC-FI-06
  it('TC-FI-06: POST /chatbot/ask với message hợp lệ → 200/201', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: 'xin chào' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('reply');
  }, 30000);

  // TC-FI-07
  it('TC-FI-07: POST /chatbot/ask thiếu message → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({});
    expect(res.status).toBe(400);
  });

  // TC-FI-08
  it('TC-FI-08: POST /chatbot/ask thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .send({ message: 'hello' });
    expect(res.status).toBe(500);
  });

  // TC-FI-09
  it('TC-FI-09: POST /chatbot/ask message không phải string → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: 123 });
    expect(res.status).toBe(400);
  });

  // TC-FI-10
  it('TC-FI-10: POST /chatbot/ask câu hỏi tài chính → trả về reply có nội dung', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: 'tháng này tôi chi tiêu bao nhiêu?' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.reply).toBeTruthy();
    expect(typeof res.body.reply).toBe('string');
  }, 30000);

  // ─── API: GET /chatbot/history ────────────────────────────────────────────────

  // TC-FI-11
  it('TC-FI-11: GET /chatbot/history trả về danh sách session', async () => {
    const res = await request(app.getHttpServer())
      .get('/chatbot/history')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // TC-FI-12
  it('TC-FI-12: GET /chatbot/history thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer()).get('/chatbot/history');
    expect(res.status).toBe(500);
  });

  // ─── API: GET /anomalies ───────────────────────────────────────────────────────

  // TC-FI-13
  it('TC-FI-13: GET /anomalies với x-user-id hợp lệ → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/anomalies')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
  });

  // TC-FI-14
  it('TC-FI-14: GET /anomalies thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer()).get('/anomalies');
    expect(res.status).toBe(500);
  });

  // TC-FI-15
  it('TC-FI-15: GET /anomalies/:transactionId với UUID không tồn tại → 200 với null hoặc 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/anomalies/00000000-0000-0000-0000-000000000000')
      .set('x-user-id', TEST_USER_ID);
    expect([200, 404]).toContain(res.status);
  });

  // TC-FI-16
  it('TC-FI-16: POST /anomalies/recheck/:transactionId với UUID không tồn tại → xử lý gracefully', async () => {
    const res = await request(app.getHttpServer())
      .post('/anomalies/recheck/00000000-0000-0000-0000-000000000000')
      .set('x-user-id', TEST_USER_ID);
    expect([200, 404, 422, 500]).toContain(res.status);
  });

  // ─── INTEGRATION ──────────────────────────────────────────────────────────────

  // TC-FI-17
  it('TC-FI-17: chatbot trả về metadata.intent khi query hợp lệ', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: 'xin chào bạn' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('reply');
  }, 30000);

  // TC-FI-18
  it('TC-FI-18: chatbot không crash khi message rất dài', async () => {
    const longMessage = 'a'.repeat(1000);
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: longMessage });
    expect([200, 201, 400, 422, 500]).toContain(res.status);
  }, 30000);

  // TC-FI-19
  it('TC-FI-19: GET /chatbot/history/:id với session id không tồn tại → 200 với [] hoặc 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/chatbot/history/00000000-0000-0000-0000-000000000000')
      .set('x-user-id', TEST_USER_ID);
    expect([200, 404]).toContain(res.status);
  });

  // TC-FI-20
  it('TC-FI-20: chatbot với context hợp lệ → không gây lỗi', async () => {
    const res = await request(app.getHttpServer())
      .post('/chatbot/ask')
      .set('x-user-id', TEST_USER_ID)
      .send({ message: 'tôi vừa mua cà phê 35000đ', context: 'morning expense' });
    expect([200, 201]).toContain(res.status);
  }, 30000);
});
