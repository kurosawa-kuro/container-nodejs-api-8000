# container-nodejs-api-8000

Kubernetes環境で動作するNode.js APIサーバー

## 概要

このプロジェクトは、Kubernetes環境で動作するNode.js APIサーバーのサンプルアプリケーションです。以下の機能を提供します：

- RESTful APIエンドポイント
- Swagger UIによるAPIドキュメント
- Prometheusメトリクス
- Dockerコンテナ化
- AWS ECRへのデプロイ

## 技術スタック

- **ランタイム**: Node.js 18
- **フレームワーク**: Express.js
- **ドキュメント**: Swagger UI
- **モニタリング**: Prometheus
- **コンテナ化**: Docker
- **デプロイ**: AWS ECR

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Docker
- AWS CLI（ECRデプロイ用）

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd container-nodejs-api-8000

# 依存パッケージのインストール
npm install
```

## 使用方法

### ローカル開発

```bash
# アプリケーションの起動
npm start

# または
make start
```

### 利用可能なエンドポイント

- **メインAPI**: http://localhost:8000
- **投稿API**: http://localhost:8000/posts
- **Swagger UI**: http://localhost:8000/api-docs
- **Prometheusメトリクス**: http://localhost:8000/metrics

## Docker

### ローカルでのDocker実行

```bash
# Dockerイメージのビルド
make docker-local-build

# Dockerコンテナの実行
make docker-local-run

# Dockerコンテナの停止
make docker-local-stop
```

## AWS ECRへのデプロイ

### 前提条件

- AWS CLIがインストールされていること
- AWS認証情報が設定されていること
- ECRリポジトリが作成されていること

### デプロイ手順

1. AWS認証情報の設定

```bash
aws configure
```

2. ECRへのデプロイ

```bash
# 完全なデプロイプロセスを実行
make ecr-deploy
```

または、個別のステップを実行：

```bash
# Dockerイメージのビルド
make docker-build

# ECR用にイメージにタグを付与
make docker-tag

# ECRにイメージをプッシュ
make docker-push
```

## メトリクス

アプリケーションは以下のPrometheusメトリクスを提供します：

- **api_http_requests_total**: HTTPリクエストの総数（メソッド、ルート、ステータスコード別）
- **api_http_request_duration_seconds**: HTTPリクエストの処理時間（メソッド、ルート、ステータスコード別）
- **nodejs_***: Node.jsランタイムのメトリクス（メモリ使用量、GC統計など）

## ライセンス

[MIT License](LICENSE)

## 作者

[Your Name/Organization]