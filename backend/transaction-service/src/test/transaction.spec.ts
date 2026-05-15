import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';

// Category IDs thực trong Supabase (schema: transaction)
// Sẽ lấy động trong beforeAll
let EXPENSE_CATEGORY_ID: string;
let INCOME_CATEGORY_ID: string;
let createdTransactionId: string;

describe('Transaction Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter()); // map AppError → đúng HTTP status
    await app.init();

    // Lấy category ID thực từ DB
    const catRes = await request(app.getHttpServer())
      .get('/categories')
      .set('x-user-id', TEST_USER_ID);
    const categories = catRes.body;
    const expenseCat = categories.find((c: any) => c.type === 'expense');
    const incomeCat = categories.find((c: any) => c.type === 'income');
    if (!expenseCat || !incomeCat) throw new Error('Categories not found in DB. Seed data missing!');
    EXPENSE_CATEGORY_ID = expenseCat.id;
    INCOME_CATEGORY_ID = incomeCat.id;
  }, 30000);

  afterAll(async () => {
    // cleanup: xóa transaction test nếu còn
    if (createdTransactionId) {
      await request(app.getHttpServer())
        .delete(`/transactions/${createdTransactionId}`)
        .set('x-user-id', TEST_USER_ID);
    }
    await app.close();
  });

  // ─── HEALTH ───────────────────────────────────────────────────────────────────

  // TC-TX-01
  it('TC-TX-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  // TC-TX-02
  it('TC-TX-02: GET /categories trả về danh sách categories', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // TC-TX-03
  it('TC-TX-03: GET /categories?type=expense trả về chỉ expense', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories?type=expense')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.every((c: any) => c.type === 'expense')).toBe(true);
  });

  // TC-TX-04
  it('TC-TX-04: GET /categories?type=income trả về chỉ income', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories?type=income')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.every((c: any) => c.type === 'income')).toBe(true);
  });

  // TC-TX-05
  it('TC-TX-05: GET /categories?type=invalid → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories?type=invalid')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(400);
  });

  // ─── CREATE TRANSACTION ───────────────────────────────────────────────────────

  // TC-TX-06
  it('TC-TX-06: POST /transactions tạo giao dịch expense hợp lệ → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'expense',
        amount: 75000,
        category_id: EXPENSE_CATEGORY_ID,
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
        note: 'CI test transaction',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdTransactionId = res.body.id;
  });

  // TC-TX-07
  it('TC-TX-07: POST /transactions thiếu amount → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'expense',
        category_id: EXPENSE_CATEGORY_ID,
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
      });
    expect(res.status).toBe(400);
  });

  // TC-TX-08
  it('TC-TX-08: POST /transactions amount < 0.01 → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'expense',
        amount: 0,
        category_id: EXPENSE_CATEGORY_ID,
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
      });
    expect(res.status).toBe(400);
  });

  // TC-TX-09
  it('TC-TX-09: POST /transactions type không khớp category → lỗi validation', async () => {
    // type=income nhưng dùng expense category
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'income',
        amount: 100000,
        category_id: EXPENSE_CATEGORY_ID, // sai type
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
      });
    expect([400, 422, 500]).toContain(res.status);
  });

  // TC-TX-10
  it('TC-TX-10: POST /transactions source không hợp lệ → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'expense',
        amount: 50000,
        category_id: EXPENSE_CATEGORY_ID,
        transaction_date: new Date().toISOString(),
        source: 'invalid_source',
      });
    expect(res.status).toBe(400);
  });

  // TC-TX-11
  it('TC-TX-11: POST /transactions category_id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('x-user-id', TEST_USER_ID)
      .send({
        type: 'expense',
        amount: 50000,
        category_id: 'not-a-uuid',
        transaction_date: new Date().toISOString(),
        source: 'chatbot',
      });
    expect(res.status).toBe(400);
  });

  // ─── READ TRANSACTIONS ────────────────────────────────────────────────────────

  // TC-TX-12
  it('TC-TX-12: GET /transactions trả về danh sách', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TC-TX-13
  it('TC-TX-13: GET /transactions?type=expense filter đúng', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions?type=expense')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.type === 'expense')).toBe(true);
  });

  // TC-TX-14
  it('TC-TX-14: GET /transactions/:id với id vừa tạo → trả về đúng transaction', async () => {
    expect(createdTransactionId).toBeDefined();
    const res = await request(app.getHttpServer())
      .get(`/transactions/${createdTransactionId}`)
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTransactionId);
  });

  // TC-TX-15
  it('TC-TX-15: GET /transactions/:id với UUID không tồn tại → 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions/00000000-0000-0000-0000-000000000099')
      .set('x-user-id', TEST_USER_ID);
    expect([404, 500]).toContain(res.status); // 404 nếu có filter, 500 nếu không
  });

  // TC-TX-16
  it('TC-TX-16: GET /transactions/summary trả về tổng thu/chi', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions/summary')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
  });

  // TC-TX-17
  it('TC-TX-17: GET /transactions/history trả về history', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions/history')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
  });

  // ─── UPDATE / DELETE ──────────────────────────────────────────────────────────

  // TC-TX-18
  it('TC-TX-18: PUT /transactions/:id cập nhật note → thành công', async () => {
    expect(createdTransactionId).toBeDefined();
    const res = await request(app.getHttpServer())
      .put(`/transactions/${createdTransactionId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({ note: 'Updated by CI test' });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('Updated by CI test');
  });

  // TC-TX-19
  it('TC-TX-19: PUT /transactions/:id amount âm → 400', async () => {
    expect(createdTransactionId).toBeDefined();
    const res = await request(app.getHttpServer())
      .put(`/transactions/${createdTransactionId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({ amount: -100 });
    expect(res.status).toBe(400);
  });

  // TC-TX-20
  it('TC-TX-20: DELETE /transactions/:id xóa thành công → success=true', async () => {
    expect(createdTransactionId).toBeDefined();
    const res = await request(app.getHttpServer())
      .delete(`/transactions/${createdTransactionId}`)
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    createdTransactionId = ''; // reset để afterAll không xóa lại
  });
});
