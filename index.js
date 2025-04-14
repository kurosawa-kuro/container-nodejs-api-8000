const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// 3件の投稿データ
let posts = [
  { id: 1, title: '初期投稿', content: 'ようこそ' },
  { id: 2, title: '2件目の投稿', content: 'こんにちは' },
  { id: 3, title: '3件目の投稿', content: 'こんばんは' }
];

// ------------------------
// ヘルスチェック
// ------------------------
app.get('/', (req, res) => {
  console.log('[GET /] ヘルスチェック受信');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ------------------------
// 負荷試験エンドポイント
// ------------------------
app.get('/load-test', (req, res) => {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      status: 'error',
      error: '負荷試験エンドポイントは本番環境では利用できません'
    });
  }

  console.log('[GET /load-test] 負荷試験開始');

  const durationMs = parseInt(req.query.duration) || 8080;
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

// ------------------------
// メモリ負荷試験エンドポイント
// ------------------------
app.get('/load-test/memory', (req, res) => {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      status: 'error',
      error: '負荷試験エンドポイントは本番環境では利用できません'
    });
  }

  console.log('[GET /load-test/memory] メモリ負荷試験開始');

  const size = parseInt(req.query.size) || 100;
  const durationMs = parseInt(req.query.duration) || 8080;

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

// ------------------------
// 投稿関連
// ------------------------
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

// ------------------------
// 環境変数表示
// ------------------------
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

// ------------------------
// ConfigMapの検証
// ------------------------
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

// ------------------------
// Secretの確認
// ------------------------
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

// ------------------------
// 強制エラー発生テスト
// ------------------------
app.get('/error-test', (req, res) => {
  console.error('[GET /error-test] 意図的に500エラーを発生させます');
  throw new Error('これはテスト用の強制サーバーエラーです');
});

// ------------------------
// エラーハンドリング
// ------------------------
app.use((err, req, res, next) => {
  console.error('[ERROR] ハンドルされていない例外:', err.message);
  res.status(500).json({
    status: 'error',
    error: 'サーバー内部エラーが発生しました',
    detail: err.message
  });
});

// ------------------------
// サーバ起動
// ------------------------
if (require.main === module) {
  app.listen(port, () => {
    const currentEnv = process.env.CURRENT_ENV || 'development';
    console.log(`[k8s-api-sample-8080] サーバ起動`);
    console.log(`環境: ${currentEnv}`);
    console.log(`ポート: ${port}`);
  });
}

module.exports = app;
