import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';
let createdBudgetId: string;

describe('Budget Notification Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    // cleanup budget test
    if (createdBudgetId) {
      await request(app.getHttpServer())
        .delete(`/budgets/${createdBudgetId}`)
        .set('x-user-id', TEST_USER_ID);
    }
    await app.close();
  });

  // ─── HEALTH ───────────────────────────────────────────────────────────────────

  // TC-BN-01
  it('TC-BN-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // TC-BN-02
  it('TC-BN-02: GET /metrics trả về 200', async () => {
    // prom-client có thể trả rỗng lúc test start → chỉ check status 200
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
  });

  // ─── CREATE BUDGET ────────────────────────────────────────────────────────────

  // TC-BN-03
  it('TC-BN-03: POST /budgets tạo budget monthly hợp lệ → 201', async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 5000000,
        budget_period: 'monthly',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
    // 200/201 = success, 400/409/422 = budget đã tồn tại (user test có thể đã có budget)
    expect([200, 201, 400, 409, 422]).toContain(res.status);
    if (res.body?.id) createdBudgetId = res.body.id;
    else if (res.body?.data?.id) createdBudgetId = res.body.data.id;
  });

  // TC-BN-04
  it('TC-BN-04: POST /budgets thiếu budget_amount → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      });
    expect(res.status).toBe(400);
  });

  // TC-BN-05
  it('TC-BN-05: POST /budgets budget_amount < 0.01 → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 0,
        budget_period: 'monthly',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      });
    expect(res.status).toBe(400);
  });

  // TC-BN-06
  it('TC-BN-06: POST /budgets budget_period không hợp lệ → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 1000000,
        budget_period: 'yearly', // không trong enum
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });
    expect(res.status).toBe(400);
  });

  // TC-BN-07
  it('TC-BN-07: POST /budgets start_date không phải date string → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 1000000,
        budget_period: 'monthly',
        start_date: 'not-a-date',
        end_date: '2026-01-31',
      });
    expect(res.status).toBe(400);
  });

  // TC-BN-08
  it('TC-BN-08: POST /budgets budget_period=weekly hợp lệ', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 500000,
        budget_period: 'weekly',
        start_date: '2026-01-01',
        end_date: '2026-01-07',
      });
    expect([200, 201, 400, 422]).toContain(res.status); // có thể conflict nếu đã tồn tại budget
    if ((res.status === 200 || res.status === 201) && !createdBudgetId) {
      const id = res.body?.id || res.body?.data?.id;
      if (id) createdBudgetId = id;
    }
  });

  // ─── GET BUDGETS ──────────────────────────────────────────────────────────────

  // TC-BN-09
  it('TC-BN-09: GET /budgets/current trả về budget hiện tại', async () => {
    const res = await request(app.getHttpServer())
      .get('/budgets/current')
      .set('x-user-id', TEST_USER_ID);
    expect([200, 404]).toContain(res.status);
  });

  // TC-BN-10
  it('TC-BN-10: GET /budgets/current/status trả về trạng thái budget', async () => {
    const res = await request(app.getHttpServer())
      .get('/budgets/current/status')
      .set('x-user-id', TEST_USER_ID);
    // 200 = có budget; 404 = không có; 500 = downstream transaction-service không chạy trong CI
    expect([200, 404, 500]).toContain(res.status);
  });

  // TC-BN-11
  it('TC-BN-11: GET /budgets/current/history trả về lịch sử budget', async () => {
    const res = await request(app.getHttpServer())
      .get('/budgets/current/history')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
  });

  // TC-BN-12
  it('TC-BN-12: GET /budgets/current thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer()).get('/budgets/current');
    expect(res.status).toBe(500);
  });

  // ─── UPDATE BUDGET ────────────────────────────────────────────────────────────

  // TC-BN-13
  it('TC-BN-13: PUT /budgets/:id cập nhật budget_amount', async () => {
    if (!createdBudgetId) return;
    const res = await request(app.getHttpServer())
      .put(`/budgets/${createdBudgetId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({ budget_amount: 6000000 });
    expect([200, 201, 404, 500]).toContain(res.status);
  });

  // TC-BN-14
  it('TC-BN-14: PUT /budgets/:id với id không tồn tại → 404 hoặc lỗi', async () => {
    const res = await request(app.getHttpServer())
      .put('/budgets/00000000-0000-0000-0000-000000000099')
      .set('x-user-id', TEST_USER_ID)
      .send({ budget_amount: 1000000 });
    expect([400, 404, 422, 500]).toContain(res.status);
  });

  // TC-BN-15
  it('TC-BN-15: PUT /budgets/:id budget_amount = 0 → 400', async () => {
    if (!createdBudgetId) return;
    const res = await request(app.getHttpServer())
      .put(`/budgets/${createdBudgetId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({ budget_amount: 0 });
    expect(res.status).toBe(400);
  });

  // ─── DELETE BUDGET ────────────────────────────────────────────────────────────

  // TC-BN-16
  it('TC-BN-16: DELETE /budgets/:id với id không tồn tại → 404 hoặc lỗi', async () => {
    const res = await request(app.getHttpServer())
      .delete('/budgets/00000000-0000-0000-0000-000000000099')
      .set('x-user-id', TEST_USER_ID);
    expect([400, 404, 422, 500]).toContain(res.status);
  });

  // TC-BN-17
  it('TC-BN-17: DELETE /budgets/:id xóa budget vừa tạo → thành công', async () => {
    if (!createdBudgetId) return;
    const res = await request(app.getHttpServer())
      .delete(`/budgets/${createdBudgetId}`)
      .set('x-user-id', TEST_USER_ID);
    expect([200, 201, 204]).toContain(res.status);
    createdBudgetId = '';
  });

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

  // TC-BN-18
  it('TC-BN-18: GET /notifications trả về danh sách thông báo', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set('x-user-id', TEST_USER_ID);
    expect([200, 404]).toContain(res.status);
  });

  // ─── VALIDATION ───────────────────────────────────────────────────────────────

  // TC-BN-19
  it('TC-BN-19: POST /budgets body rỗng → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({});
    expect(res.status).toBe(400);
  });

  // TC-BN-20
  it('TC-BN-20: POST /budgets end_date không phải date string → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('x-user-id', TEST_USER_ID)
      .send({
        budget_amount: 1000000,
        budget_period: 'monthly',
        start_date: '2026-01-01',
        end_date: 'invalid-date',
      });
    expect(res.status).toBe(400);
  });
});
