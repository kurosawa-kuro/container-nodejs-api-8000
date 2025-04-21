/**
 * k8s-nodejs-api-8000
 * Kubernetes環境で動作するサンプルAPIサーバー
 */

const express = require('express');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const client = require('prom-client');
dotenv.config();

// ===== アプリケーション初期化 =====
const app = express();
const port = process.env.PORT || 8000;
app.use(express.json());

// ===== Prometheus Metrics =====
// ① 既定メトリクス (CPU, メモリ, イベントループ遅延など)
client.collectDefaultMetrics();

// ② ルートごとのリクエスト数とレイテンシを計測
const httpRequestCounter = new client.Counter({
  name: 'api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10],
});

// ③ すべてのリクエストでカウンター／ヒストグラムを更新
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, code: res.statusCode });
    end({ method: req.method, route: req.path, code: res.statusCode });
  });
  next();
});

// ④ /metrics エンドポイント
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ===== 初期データ =====
let posts = [
  { id: 1, title: '初期投稿 from v1.0.0', content: 'ようこそ' },
  { id: 2, title: '2件目の投稿 from v1.0.0', content: 'こんにちは' },
  { id: 3, title: '3件目の投稿 from v1.0.0', content: 'こんばんは' }
];

// ===== Swagger設定 =====
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'k8s-nodejs-api-8000',
    version: '1.0.0',
    description: 'Kubernetes環境で動作するサンプルAPIサーバー',
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'ローカル開発サーバー',
    },
  ],
  tags: [
    { name: 'ヘルスチェック', description: 'システムの状態確認' },
    { name: '投稿', description: '投稿の管理' },
    { name: '設定', description: '環境設定の確認' },
    { name: 'テスト', description: 'テスト用エンドポイント' },
    { name: 'メトリクス', description: 'Prometheus メトリクス' },
  ],
  paths: {
    '/healthz': {
      get: {
        tags: ['ヘルスチェック'],
        summary: 'Kubernetesヘルスチェック',
        description: 'Kubernetesのヘルスチェックエンドポイント',
        responses: {
          '200': {
            description: '正常稼働中',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/': {
      get: {
        tags: ['ヘルスチェック'],
        summary: 'ヘルスチェック',
        description: 'APIサーバーの状態を確認します',
        responses: {
          '200': {
            description: '正常稼働中',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/posts': {
      get: {
        tags: ['投稿'],
        summary: '投稿一覧の取得',
        description: '全ての投稿を取得します',
        responses: {
          '200': {
            description: '投稿一覧',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          title: { type: 'string' },
                          content: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['投稿'],
        summary: '新規投稿の作成',
        description: '新しい投稿を作成します',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content'],
                properties: {
                  title: { type: 'string', example: '投稿タイトル' },
                  content: { type: 'string', example: '投稿内容' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '投稿作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'バリデーションエラー',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/env': {
      get: {
        tags: ['設定'],
        summary: '環境変数の確認',
        description: '現在の環境変数設定を確認します',
        responses: {
          '200': {
            description: '環境変数情報',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        port: { type: 'string' },
                        currentEnv: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/config': {
      get: {
        tags: ['設定'],
        summary: 'ConfigMapの確認',
        description: 'Kubernetes ConfigMapの設定を確認します',
        responses: {
          '200': {
            description: 'ConfigMap設定情報',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'ConfigMap未設定エラー',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/secret': {
      get: {
        tags: ['設定'],
        summary: 'Secretの確認',
        description: 'Kubernetes Secretの設定を確認します（マスク化された値）',
        responses: {
          '200': {
            description: 'Secret設定情報',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        secretKey: { type: 'string', example: '****MASKED****' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/env-check': {
      get: {
        tags: ['設定'],
        summary: '環境変数の確認',
        description: '現在の環境変数設定を確認します',
        responses: {
          '200': {
            description: '環境変数情報',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        port: { type: 'string' },
                        currentEnv: { type: 'string' },
                        configMessage: { type: 'string' },
                        secretKey: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/status': {
      get: {
        tags: ['設定'],
        summary: 'Probe専用エンドポイント',
        description: '常に200を返すエンドポイント',
        responses: {
          '200': {
            description: '常に200を返す',
          },
        },
      },
    },
    '/delay': {
      get: {
        tags: ['設定'],
        summary: 'ReadinessProbe確認用エンドポイント',
        description: '遅延ありのレスポンスを返すエンドポイント',
        responses: {
          '200': {
            description: '遅延レスポンス完了',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/load-test': {
      get: {
        tags: ['テスト'],
        summary: 'CPU負荷テスト',
        description: 'CPU負荷をかけるテストを実行します',
        parameters: [
          {
            name: 'duration',
            in: 'query',
            description: '負荷をかける時間（ミリ秒）',
            schema: { type: 'integer', default: 8000 },
          },
        ],
        responses: {
          '200': {
            description: 'テスト実行結果',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string' },
                    duration: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '403': {
            description: '本番環境での実行エラー',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/load-test/memory': {
      get: {
        tags: ['テスト'],
        summary: 'メモリ負荷テスト',
        description: 'メモリ負荷をかけるテストを実行します',
        parameters: [
          {
            name: 'size',
            in: 'query',
            description: '確保するメモリサイズ（MB）',
            schema: { type: 'integer', default: 100 },
          },
          {
            name: 'duration',
            in: 'query',
            description: '負荷をかける時間（ミリ秒）',
            schema: { type: 'integer', default: 8000 },
          },
        ],
        responses: {
          '200': {
            description: 'テスト実行結果',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string' },
                    size: { type: 'string' },
                    duration: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '403': {
            description: '本番環境での実行エラー',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/error-test': {
      get: {
        tags: ['テスト'],
        summary: 'エラーハンドリングテスト',
        description: '意図的に500エラーを発生させます',
        responses: {
          '500': {
            description: 'テスト用エラー',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                    detail: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['メトリクス'],
        summary: 'Prometheus メトリクス',
        description: 'Prometheus 形式のメトリクスデータを返します',
        responses: {
          '200': {
            description: 'メトリクスデータ',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP api_http_requests_total Total number of HTTP requests\n# TYPE api_http_requests_total counter\napi_http_requests_total{method="GET",route="/",code="200"} 10\n',
                },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'k8s-nodejs-api-8000 API Documentation',
};

// SwaggerUIのセットアップ
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ===== ルーティング =====

// ヘルスチェック
app.get('/healthz', (req, res) => {
  console.log('[GET /healthz] ヘルスチェック受信');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  console.log('[GET /] ヘルスチェック受信');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 投稿関連
app.get('/posts', (req, res) => {
  console.log('[GET /posts] 投稿一覧取得');
  res.status(200).json({
    status: 'success',
    data: posts
  });
});

app.post('/posts', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      status: 'error',
      error: 'タイトルと内容は必須です'
    });
  }

  console.log('[POST /posts] 新規投稿受信:', { title, content });

  const newPost = {
    id: posts.length + 1,
    title,
    content
  };
  posts.push(newPost);

  console.log('[POST /posts] 投稿追加完了:', newPost);
  res.status(201).json({
    status: 'success',
    data: newPost
  });
});

// 設定関連
app.get('/env', (req, res) => {
  console.log('[GET /env] 環境変数の表示要求');
  res.status(200).json({
    status: 'success',
    data: {
    port: process.env.PORT,
    currentEnv: process.env.CURRENT_ENV
    }
  });
});

app.get('/config', (req, res) => {
  const timestamp = new Date().toISOString();
  const configMessage = process.env.CONFIG_MESSAGE;

  if (!configMessage) {
    console.error('[GET /config] エラー: CONFIG_MESSAGE が未設定 (ConfigMapが反映されていない)');
    return res.status(500).json({
      status: 'error',
      error: 'ConfigMap未反映: CONFIG_MESSAGE が見つかりません',
      timestamp
    });
  }

  console.log('[GET /config] ConfigMap確認 - 設定内容:', configMessage, ' - 時刻:', timestamp);
  res.status(200).json({
    status: 'success',
    data: {
    message: configMessage,
    timestamp
    }
  });
});

app.get('/secret', (req, res) => {
  const masked = process.env.SECRET_KEY ? '****MASKED****' : '未設定';
  console.log('[GET /secret] シークレット確認 - 設定状態:', masked);
  res.status(200).json({
    status: 'success',
    data: {
    secretKey: masked
    }
  });
});

// ConfigMapやSecretが反映されているか確認
app.get('/env-check', (req, res) => {
  console.log('[GET /env-check] ConfigMap/Secret 確認要求');

  res.status(200).json({
    status: 'success',
    data: {
      port: process.env.PORT || '未設定',
      currentEnv: process.env.CURRENT_ENV || '未設定',
      configMessage: process.env.CONFIG_MESSAGE || '未設定',
      secretKey: process.env.SECRET_KEY ? '****MASKED****' : '未設定'
    },
    timestamp: new Date().toISOString()
  });
});

// Probe専用エンドポイント（常に200）
app.get('/status', (req, res) => {
  res.sendStatus(200);
});

// ReadinessProbe確認用エンドポイント（遅延あり）
app.get('/delay', (req, res) => {
  console.log('[GET /delay] 遅延レスポンスを開始（3000ms）');
  setTimeout(() => {
    res.status(200).json({
      status: 'success',
      message: '遅延レスポンス完了',
      timestamp: new Date().toISOString()
    });
  }, 3000);
});

// テスト関連
app.get('/load-test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      status: 'error',
      error: '負荷試験エンドポイントは本番環境では利用できません'
    });
  }

  console.log('[GET /load-test] 負荷試験開始');

  const durationMs = parseInt(req.query.duration) || 8000;
  const end = Date.now() + durationMs;

  while (Date.now() < end) {
    Math.sqrt(Math.random());
  }

  console.log(`[GET /load-test] 負荷試験完了（${durationMs}ms）`);
  res.status(200).json({
    status: 'success',
    message: 'CPU負荷を発生させました',
    duration: `${durationMs}ms`,
    timestamp: new Date().toISOString()
  });
});

app.get('/load-test/memory', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      status: 'error',
      error: '負荷試験エンドポイントは本番環境では利用できません'
    });
  }

  console.log('[GET /load-test/memory] メモリ負荷試験開始');

  const size = parseInt(req.query.size) || 100;
  const durationMs = parseInt(req.query.duration) || 8000;

  const array = new Array(size * 1024 * 1024).fill('x');
  const end = Date.now() + durationMs;

  while (Date.now() < end) {
    array.sort();
  }

  console.log(`[GET /load-test/memory] メモリ負荷試験完了（${size}MB, ${durationMs}ms）`);
  res.status(200).json({
    status: 'success',
    message: 'メモリ負荷を発生させました',
    size: `${size}MB`,
    duration: `${durationMs}ms`,
    timestamp: new Date().toISOString()
  });
});

app.get('/error-test', (req, res) => {
  console.error('[GET /error-test] 意図的に500エラーを発生させます');
  throw new Error('これはテスト用の強制サーバーエラーです');
});

// ===== エラーハンドリング =====
app.use((err, req, res, next) => {
  console.error('[ERROR] ハンドルされていない例外:', err.message);
  res.status(500).json({
    status: 'error',
    error: 'サーバー内部エラーが発生しました',
    detail: err.message
  });
});

// ===== サーバー起動 =====
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    const currentEnv = process.env.CURRENT_ENV || 'development';
    console.log(`[k8s-api-sample-8000] サーバ起動`);
    console.log(`http://0.0.0.0:${port}`);
    console.log(`http://0.0.0.0:${port}/api-docs`);
    console.log(`環境: ${currentEnv}`);
    console.log(`ポート: ${port}`);
  });
}

module.exports = app;
