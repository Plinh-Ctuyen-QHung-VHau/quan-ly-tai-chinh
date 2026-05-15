import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';

describe('Identity Service (e2e)', () => {
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
    await app.close();
  });

  // ─── HEALTH ───────────────────────────────────────────────────────────────────

  // TC-ID-01
  it('TC-ID-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // TC-ID-02
  it('TC-ID-02: GET /metrics trả về Prometheus metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('# HELP');
  });

  // ─── API: GET /users/me ───────────────────────────────────────────────────────

  // TC-ID-03
  it('TC-ID-03: GET /users/me với x-user-id hợp lệ → trả về profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  // TC-ID-04
  it('TC-ID-04: GET /users/me thiếu x-user-id → 500 (decorator throw)', async () => {
    const res = await request(app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(500);
  });

  // TC-ID-05
  it('TC-ID-05: GET /users/me với user_id không tồn tại → 404 hoặc trả null', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('x-user-id', '00000000-0000-0000-0000-000000000000');
    expect([200, 404]).toContain(res.status);
  });

  // ─── API: PUT /users/me ───────────────────────────────────────────────────────

  // TC-ID-06
  it('TC-ID-06: PUT /users/me với full_name hợp lệ → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', TEST_USER_ID)
      .send({ full_name: 'CI Test User' });
    expect(res.status).toBe(200);
  });

  // TC-ID-07
  it('TC-ID-07: PUT /users/me với avatar_url không phải URL → 400', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', TEST_USER_ID)
      .send({ avatar_url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  // TC-ID-08
  it('TC-ID-08: PUT /users/me với body rỗng → 200 (tất cả fields optional)', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', TEST_USER_ID)
      .send({});
    expect(res.status).toBe(200);
  });

  // TC-ID-09
  it('TC-ID-09: PUT /users/me với avatar_url hợp lệ → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', TEST_USER_ID)
      .send({ avatar_url: 'https://example.com/avatar.png' });
    expect(res.status).toBe(200);
  });

  // ─── API: GET /users/settings ─────────────────────────────────────────────────

  // TC-ID-10
  it('TC-ID-10: GET /users/settings trả về settings object', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/settings')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
  });

  // ─── API: PUT /users/settings ─────────────────────────────────────────────────

  // TC-ID-11
  it('TC-ID-11: PUT /users/settings với theme=dark → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/settings')
      .set('x-user-id', TEST_USER_ID)
      .send({ theme: 'dark' });
    expect(res.status).toBe(200);
  });

  // TC-ID-12
  it('TC-ID-12: PUT /users/settings với theme=light → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/settings')
      .set('x-user-id', TEST_USER_ID)
      .send({ theme: 'light' });
    expect(res.status).toBe(200);
  });

  // TC-ID-13
  it('TC-ID-13: PUT /users/settings với theme không hợp lệ → 400', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/settings')
      .set('x-user-id', TEST_USER_ID)
      .send({ theme: 'purple' });
    expect(res.status).toBe(400);
  });

  // TC-ID-14
  it('TC-ID-14: PUT /users/settings với timezone hợp lệ → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/settings')
      .set('x-user-id', TEST_USER_ID)
      .send({ timezone: 'Asia/Ho_Chi_Minh' });
    expect(res.status).toBe(200);
  });

  // TC-ID-15
  it('TC-ID-15: PUT /users/settings với language hợp lệ → cập nhật thành công', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/settings')
      .set('x-user-id', TEST_USER_ID)
      .send({ language: 'vi' });
    expect(res.status).toBe(200);
  });

  // ─── API: POST /users/auth-events ─────────────────────────────────────────────

  // TC-ID-16
  it('TC-ID-16: POST /users/auth-events với action=login → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/auth-events')
      .set('x-user-id', TEST_USER_ID)
      .send({ action: 'login' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
  });

  // TC-ID-17
  it('TC-ID-17: POST /users/auth-events với action=logout → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/auth-events')
      .set('x-user-id', TEST_USER_ID)
      .send({ action: 'logout' });
    expect(res.status).toBe(201);
  });

  // TC-ID-18
  it('TC-ID-18: POST /users/auth-events với action=password_reset → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/auth-events')
      .set('x-user-id', TEST_USER_ID)
      .send({ action: 'password_reset' });
    expect(res.status).toBe(201);
  });

  // TC-ID-19
  it('TC-ID-19: POST /users/auth-events với action không hợp lệ → lỗi', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/auth-events')
      .set('x-user-id', TEST_USER_ID)
      .send({ action: 'delete_account' });
    expect([400, 422, 500]).toContain(res.status);
  });

  // TC-ID-20
  it('TC-ID-20: PUT /users/me whitelist fields - field lạ bị loại bỏ không gây lỗi', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', TEST_USER_ID)
      .send({ full_name: 'CI User', unknown_field: 'should be stripped' });
    expect(res.status).toBe(200);
  });
});
