# ビルドステージ
FROM node:18-slim AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール（開発依存パッケージも含む）
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# 本番ステージ
FROM node:18-slim

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 本番用の依存パッケージのみをインストール
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm

# ビルドステージからアプリケーションコードをコピー
COPY --from=builder /app/index.js ./

# 非rootユーザーを作成
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

# アプリケーションのポートを公開
EXPOSE 8000

# 本番環境変数を設定
ENV NODE_ENV=production \
    PORT=8000

# ヘルスチェックを設定
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/healthz || exit 1

# アプリケーションを起動
CMD ["node", "index.js"] 