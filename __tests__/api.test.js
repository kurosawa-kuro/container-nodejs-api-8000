const request = require('supertest');
const app = require('../index');

describe('API Tests', () => {
  // ヘルスチェックのテスト
  describe('GET /', () => {
    it('should return ok', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });
  });

  // 投稿関連のテスト
  describe('GET /posts', () => {
    it('should return posts array', async () => {
      const response = await request(app).get('/posts');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('title');
      expect(response.body.data[0]).toHaveProperty('content');
    });
  });

  describe('POST /posts', () => {
    it('should create a new post', async () => {
      const newPost = {
        title: 'テスト投稿',
        content: 'テスト内容'
      };

      const response = await request(app)
        .post('/posts')
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(newPost.title);
      expect(response.body.data.content).toBe(newPost.content);
    });
  });

  // 環境変数のテスト
  describe('GET /env', () => {
    it('should return environment variables', async () => {
      const response = await request(app).get('/env');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('port');
      expect(response.body.data).toHaveProperty('currentEnv');
    });
  });

  // ConfigMapのテスト
  describe('GET /config', () => {
    it('should return 500 when CONFIG_MESSAGE is not set', async () => {
      const response = await request(app).get('/config');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.error).toContain('ConfigMap未反映');
    });
  });

  // Secretのテスト
  describe('GET /secret', () => {
    it('should return masked secret', async () => {
      const response = await request(app).get('/secret');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('secretKey');
      expect(response.body.data.secretKey).toBe('****MASKED****');
    });
  });

  // エラーテスト
  describe('GET /error-test', () => {
    it('should return 500 error', async () => {
      const response = await request(app).get('/error-test');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('detail');
    });
  });
}); 