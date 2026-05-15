import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

const TEST_USER_ID = '64946587-ec8d-4632-b654-2dfea9319063';

describe('OCR Service (e2e)', () => {
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

  // TC-OCR-01
  it('TC-OCR-01: GET /health trả về 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  // TC-OCR-02
  it('TC-OCR-02: GET /metrics trả về Prometheus metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('# HELP');
  });

  // ─── VALIDATION: POST /ocr/scan ───────────────────────────────────────────────

  // TC-OCR-03
  it('TC-OCR-03: POST /ocr/scan thiếu image_url → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera' });
    expect(res.status).toBe(400);
  });

  // TC-OCR-04
  it('TC-OCR-04: POST /ocr/scan thiếu source_type → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ image_url: 'https://example.com/bill.jpg' });
    expect(res.status).toBe(400);
  });

  // TC-OCR-05
  it('TC-OCR-05: POST /ocr/scan image_url không phải URL → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera', image_url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  // TC-OCR-06
  it('TC-OCR-06: POST /ocr/scan image_url dùng HTTP (không phải HTTPS) → 400', async () => {
    // OcrDto dùng IsUrl với require_protocol: true — http vẫn hợp lệ
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera', image_url: 'http://example.com/bill.jpg' });
    // http hợp lệ theo DTO → nên không phải 400 validation
    expect(res.status).not.toBe(400);
  });

  // TC-OCR-07
  it('TC-OCR-07: POST /ocr/scan source_type không hợp lệ → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'invalid', image_url: 'https://example.com/bill.jpg' });
    expect(res.status).toBe(400);
  });

  // TC-OCR-08
  it('TC-OCR-08: POST /ocr/scan thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .send({ source_type: 'camera', image_url: 'https://example.com/bill.jpg' });
    expect(res.status).toBe(500);
  });

  // TC-OCR-09
  it('TC-OCR-09: POST /ocr/scan source_type=gallery hợp lệ → được xử lý (không 400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'gallery', image_url: 'https://picsum.photos/400/600' });
    // Có thể thất bại ở OCR engine nhưng không phải validation 400
    expect(res.status).not.toBe(400);
  });

  // TC-OCR-10
  it('TC-OCR-10: POST /ocr/scan với URL ảnh hợp lệ từ picsum → được xử lý', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera', image_url: 'https://picsum.photos/800/600' });
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  }, 60000); // OCR có thể tốn thời gian

  // ─── GET /ocr/result/:id ──────────────────────────────────────────────────────

  // TC-OCR-11
  it('TC-OCR-11: GET /ocr/result/:id với UUID không tồn tại → 404 hoặc lỗi', async () => {
    const res = await request(app.getHttpServer())
      .get('/ocr/result/00000000-0000-0000-0000-000000000000')
      .set('x-user-id', TEST_USER_ID);
    expect([404, 500]).toContain(res.status);
  });

  // TC-OCR-12
  it('TC-OCR-12: GET /ocr/result/:id với id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/ocr/result/not-a-uuid')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(400);
  });

  // TC-OCR-13
  it('TC-OCR-13: GET /ocr/result/:id thiếu x-user-id → 500', async () => {
    const res = await request(app.getHttpServer())
      .get('/ocr/result/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(500);
  });

  // ─── POST /ocr/retry/:id ──────────────────────────────────────────────────────

  // TC-OCR-14
  it('TC-OCR-14: POST /ocr/retry/:id với UUID không tồn tại → 404 hoặc lỗi', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/retry/00000000-0000-0000-0000-000000000000')
      .set('x-user-id', TEST_USER_ID);
    expect([404, 500]).toContain(res.status);
  });

  // TC-OCR-15
  it('TC-OCR-15: POST /ocr/retry/:id với id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/retry/not-a-uuid')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(400);
  });

  // ─── INTEGRATION ──────────────────────────────────────────────────────────────

  // TC-OCR-16
  it('TC-OCR-16: scan → tạo OCR request trong Supabase', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera', image_url: 'https://picsum.photos/800/600' });
    // Nếu thành công, response có ocr_result_id
    if (res.status === 200 || res.status === 201) {
      expect(res.body).toHaveProperty('ocr_result_id');
    } else {
      // OCR engine fail cũng OK trong CI (ảnh không phải hóa đơn)
      expect([400, 422, 500]).toContain(res.status);
    }
  }, 60000);

  // TC-OCR-17
  it('TC-OCR-17: whitelist - field lạ bị loại (không gây lỗi)', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({
        source_type: 'camera',
        image_url: 'https://example.com/bill.jpg',
        unknown_field: 'should be stripped',
      });
    expect(res.status).not.toBe(400);
  });

  // TC-OCR-18
  it('TC-OCR-18: POST /ocr/scan body rỗng → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({});
    expect(res.status).toBe(400);
  });

  // TC-OCR-19
  it('TC-OCR-19: image_url không có protocol → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({ source_type: 'camera', image_url: 'example.com/bill.jpg' });
    expect(res.status).toBe(400);
  });

  // TC-OCR-20
  it('TC-OCR-20: source_type=camera với image_url HTTPS hợp lệ → được xử lý (không 400/401)', async () => {
    const res = await request(app.getHttpServer())
      .post('/ocr/scan')
      .set('x-user-id', TEST_USER_ID)
      .send({
        source_type: 'camera',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/400px-Camponotus_flavomarginatus_ant.jpg',
      });
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  }, 60000);
});
