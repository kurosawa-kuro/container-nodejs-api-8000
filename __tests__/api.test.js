const request = require('supertest');
const app = require('../index');

/**
 * APIテストスイート
 * ファイル分割を避けつつ、メンテナンス性を向上させるためのリファクタリング
 */

// ===== 共通テストヘルパー =====
/**
 * レスポンスの基本構造を検証するヘルパー関数
 * @param {Object} response - supertestのレスポンスオブジェクト
 * @param {number} expectedStatus - 期待するステータスコード
 * @param {string} expectedStatusType - 期待するステータスタイプ（'success'または'error'）
 */
const validateResponseStructure = (response, expectedStatus, expectedStatusType) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('status', expectedStatusType);
  
  if (expectedStatusType === 'success') {
    expect(response.body).toHaveProperty('data');
  }
  
  expect(response.body).toHaveProperty('timestamp');
};

/**
 * 環境変数関連のレスポンスを検証するヘルパー関数
 * @param {Object} response - supertestのレスポンスオブジェクト
 * @param {string[]} expectedProps - 期待するプロパティ名の配列
 */
const validateEnvResponse = (response, expectedProps) => {
  validateResponseStructure(response, 200, 'success');
  
  expectedProps.forEach(prop => {
    expect(response.body.data).toHaveProperty(prop);
  });
};

// ===== テストスイート =====
describe('API Tests', () => {
  // ===== ヘルスチェック関連 =====
  describe('ヘルスチェックエンドポイント', () => {
    // ルートパスのヘルスチェック
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

    // Kubernetesヘルスチェック
    describe('GET /healthz', () => {
      it('should return ok', async () => {
        const response = await request(app).get('/healthz');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: 'ok',
          timestamp: expect.any(String)
        });
      });
    });

    // Probe専用エンドポイント
    describe('GET /status', () => {
      it('should return 200 status code', async () => {
        const response = await request(app).get('/status');
        expect(response.status).toBe(200);
      });
    });

    // 遅延レスポンス
    describe('GET /delay', () => {
      it('should return success after delay', async () => {
        const startTime = Date.now();
        const response = await request(app).get('/delay');
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body).toHaveProperty('message', '遅延レスポンス完了');
        expect(response.body).toHaveProperty('timestamp');
        
        // 遅延時間が約3秒であることを確認（許容範囲を設ける）
        const delayTime = endTime - startTime;
        expect(delayTime).toBeGreaterThanOrEqual(2900);
        expect(delayTime).toBeLessThanOrEqual(3100);
      });
    });
  });

  // ===== 投稿関連 =====
  describe('投稿エンドポイント', () => {
    // 投稿一覧取得
    describe('GET /posts', () => {
      it('should return posts array', async () => {
        const response = await request(app).get('/posts');
        validateResponseStructure(response, 200, 'success');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // 投稿オブジェクトの構造を検証
        const post = response.body.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
      });
    });

    // 新規投稿作成
    describe('POST /posts', () => {
      it('should create a new post', async () => {
        const newPost = {
          title: 'テスト投稿',
          content: 'テスト内容'
        };

        const response = await request(app)
          .post('/posts')
          .send(newPost);

        validateResponseStructure(response, 201, 'success');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.title).toBe(newPost.title);
        expect(response.body.data.content).toBe(newPost.content);
      });

      it('should return 400 when title or content is missing', async () => {
        const invalidPost = {
          title: 'テスト投稿'
          // contentが欠落
        };

        const response = await request(app)
          .post('/posts')
          .send(invalidPost);

        validateResponseStructure(response, 400, 'error');
        expect(response.body.error).toContain('必須');
      });
    });
  });

  // ===== 環境設定関連 =====
  describe('環境設定エンドポイント', () => {
    // 環境変数表示
    describe('GET /env', () => {
      it('should return environment variables', async () => {
        const response = await request(app).get('/env');
        validateEnvResponse(response, ['port', 'currentEnv']);
      });
    });

    // // ConfigMap確認
    // describe('GET /config', () => {
    //   it('should return 500 when CONFIG_MESSAGE is not set', async () => {
    //     const response = await request(app).get('/config');
    //     validateResponseStructure(response, 500, 'error');
    //     expect(response.body.error).toContain('ConfigMap未反映');
    //   });
    // });

    // Secret確認
    describe('GET /secret', () => {
      it('should return masked secret', async () => {
        const response = await request(app).get('/secret');
        validateEnvResponse(response, ['secretKey']);
        expect(response.body.data.secretKey).toBe('****MASKED****');
      });
    });

    // 環境変数・ConfigMap・Secret確認
    describe('GET /env-check', () => {
      it('should return environment variables, ConfigMap and Secret status', async () => {
        const response = await request(app).get('/env-check');
        validateEnvResponse(response, ['port', 'currentEnv', 'configMessage', 'secretKey']);
      });
    });
  });

  // ===== エラーハンドリング =====
  describe('エラーハンドリング', () => {
    // エラーテスト
    describe('GET /error-test', () => {
      it('should return 500 error', async () => {
        const response = await request(app).get('/error-test');
        validateResponseStructure(response, 500, 'error');
        expect(response.body).toHaveProperty('detail');
      });
    });
  });
}); 