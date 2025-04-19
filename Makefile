# デフォルトのシェルをbashに設定
SHELL := /bin/bash

# アプリケーション設定
APP_NAME := container-nodejs-api-8000
APP_PORT := 8000
APP_VERSION ?= v1.0.1

# AWS設定
AWS_REGION := ap-northeast-1
AWS_ACCOUNT_ID ?= 986154984217
ECR_REPOSITORY_NAME ?= $(APP_NAME)
ECR_REGISTRY := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
ECR_REPOSITORY := $(ECR_REGISTRY)/$(ECR_REPOSITORY_NAME)

# 環境変数設定
export NODE_ENV ?= production
export PORT ?= $(APP_PORT)
export CURRENT_ENV ?= production
export CONFIG_MESSAGE ?= "本番環境用ConfigMapメッセージ"
export SECRET_KEY ?= "本番環境用シークレット"

# Docker設定
DOCKER_IMAGE := $(ECR_REPOSITORY_NAME):$(APP_VERSION)
DOCKER_ECR_IMAGE := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(DOCKER_IMAGE)

# ターゲット定義
.PHONY: help \
	install clean \
	start test test-watch \
	docker-build docker-push \
	ecr-login check-aws-credentials check-tools \
	docker-local-build docker-local-run docker-local-stop

# デフォルトターゲット
.DEFAULT_GOAL := help

# ------------------------
# ヘルプ
# ------------------------
help:
	@echo "📚 $(APP_NAME) アプリケーション - 利用可能なコマンド:"
	@echo ""
	@echo "🔧 開発環境セットアップ:"
	@echo "  make install      - 依存パッケージをインストール"
	@echo "  make clean        - node_modulesを削除"
	@echo ""
	@echo "🚀 アプリケーション実行:"
	@echo "  make start        - アプリケーションを起動"
	@echo "  make dev          - アプリケーションをデバッグモードで起動"
	@echo "  make test         - テストを実行"
	@echo "  make test-watch   - テストを監視モードで実行"
	@echo ""
	@echo "🐳 Docker & ECR操作:"
	@echo "  make check-tools  - 必要なツールの確認"
	@echo "  make ecr-deploy   - ECRへの完全なデプロイプロセスを実行"
	@echo "  make docker-build - Dockerイメージをビルド"
	@echo "  make docker-tag   - ECR用にイメージにタグを付与"
	@echo "  make docker-push  - ECRにイメージをプッシュ"
	@echo ""
	@echo "🔐 AWS操作:"
	@echo "  make ecr-login    - ECRにログイン"
	@echo "  make check-aws-credentials - AWS認証情報を確認"

# ------------------------
# 開発環境セットアップ
# ------------------------
install:
	@echo "📦 依存パッケージをインストールしています..."
	@npm ci
	@echo "✅ インストール完了"

clean:
	@echo "🧹 node_modulesを削除します..."
	@rm -rf node_modules
	@echo "✅ クリーンアップ完了"

# ------------------------
# アプリケーション実行
# ------------------------
dev:
	@echo "🚀 アプリケーションをデバッグモードで起動します - ポート: $(PORT)"
	@npm run dev

start:
	@echo "🚀 アプリケーションを起動します - ポート: $(PORT)"
	@npm start

test:
	@echo "🧪 テストを実行します..."
	@npm test

test-watch:
	@echo "👀 テストを監視モードで実行します..."
	@npm run test:watch

# ------------------------
# ツールチェック
# ------------------------
check-tools:
	@echo "🔍 必要なツールを確認しています..."
	@which aws >/dev/null 2>&1 || (echo "❌ AWS CLIがインストールされていません" && exit 1)
	@which docker >/dev/null 2>&1 || (echo "❌ Dockerがインストールされていません" && exit 1)
	@aws --version
	@docker --version
	@echo "✅ 必要なツールが揃っています"

# ------------------------
# AWS操作
# ------------------------
check-aws-credentials:
	@echo "🔍 AWS認証情報を確認します..."
	@if [ -z "$$AWS_REGION" ]; then \
		echo "⚠️ AWS_REGIONが設定されていません。ap-northeast-1を使用します。"; \
		AWS_REGION=ap-northeast-1 aws sts get-caller-identity || (echo "❌ AWS認証情報が無効です。aws configureを実行してください。" && exit 1); \
	else \
		aws sts get-caller-identity || (echo "❌ AWS認証情報が無効です。aws configureを実行してください。" && exit 1); \
	fi
	@echo "✅ AWS認証情報が有効です"
	@echo "📝 現在の設定:"
	@echo "   - リージョン: $(AWS_REGION)"
	@echo "   - アカウントID: $(AWS_ACCOUNT_ID)"
	@echo "   - リポジトリ: $(ECR_REPOSITORY_NAME)"
	@echo "   - ECRリポジトリ: $(ECR_REPOSITORY)"

ecr-login: check-aws-credentials
	@echo "🔐 ECRにログインします..."
	@aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REGISTRY) || (echo "❌ ECRログインに失敗しました" && exit 1)
	@echo "✅ ECRログイン完了"

# ------------------------
# Docker & ECR操作
# ------------------------
docker-build:
	@echo "🏗️  Dockerイメージをビルドします..."
	@docker build -t $(ECR_REPOSITORY_NAME):$(APP_VERSION) .
	@echo "✅ Dockerイメージのビルド完了"

docker-tag: docker-build
	@echo "🏷️  ECR用にイメージにタグを付与します..."
	@echo "リポジトリ: $(ECR_REPOSITORY)"
	@if [ -z "$(AWS_REGION)" ]; then \
		echo "⚠️ AWS_REGIONが設定されていません。ap-northeast-1を使用します。"; \
		AWS_REGION=ap-northeast-1 docker tag $(ECR_REPOSITORY_NAME):$(APP_VERSION) $(AWS_ACCOUNT_ID).dkr.ecr.ap-northeast-1.amazonaws.com/$(ECR_REPOSITORY_NAME):$(APP_VERSION); \
	else \
		docker tag $(ECR_REPOSITORY_NAME):$(APP_VERSION) $(ECR_REPOSITORY):$(APP_VERSION); \
	fi
	@echo "✅ タグ付け完了"

docker-push: ecr-login docker-tag
	@echo "⬆️  ECRにイメージをプッシュします..."
	@if [ -z "$(AWS_REGION)" ]; then \
		echo "⚠️ AWS_REGIONが設定されていません。ap-northeast-1を使用します。"; \
		AWS_REGION=ap-northeast-1 docker push $(AWS_ACCOUNT_ID).dkr.ecr.ap-northeast-1.amazonaws.com/$(ECR_REPOSITORY_NAME):$(APP_VERSION); \
	else \
		docker push $(ECR_REPOSITORY):$(APP_VERSION); \
	fi
	@echo "✅ ECRプッシュ完了"

# 完全なECRデプロイプロセス
ecr-deploy: check-tools check-aws-credentials docker-build docker-tag docker-push
	@echo "🎉 ECRデプロイが完了しました"
	@echo "📝 デプロイ情報:"
	@echo "   - イメージ: $(ECR_REPOSITORY):$(APP_VERSION)"
	@echo "   - リージョン: $(AWS_REGION)"
	@echo "   - リポジトリ: $(ECR_REPOSITORY_NAME)"

# ------------------------
# Docker操作
# ------------------------
docker-local-build:
	@echo "🏗️  ローカル用Dockerイメージをビルドします..."
	@docker build -t $(APP_NAME)-local:$(APP_VERSION) .
	@echo "✅ ローカル用Dockerイメージのビルド完了"

docker-local-run:
	@echo "🚀 ローカルでDockerコンテナを実行します（Ctrl+Cで停止）..."
	@docker run \
		--name $(APP_NAME)-local \
		-p $(APP_PORT):$(APP_PORT) \
		-e NODE_ENV=development \
		-e PORT=$(APP_PORT) \
		-e CURRENT_ENV=development \
		-e CONFIG_MESSAGE="ローカル開発用ConfigMapメッセージ" \
		-e SECRET_KEY="ローカル開発用シークレット" \
		$(APP_NAME)-local:$(APP_VERSION)
	@echo "✅ コンテナを停止しました"

docker-local-stop:
	@echo "🛑 ローカルで実行中のDockerコンテナを停止します..."
	@docker stop $(APP_NAME)-local || true
	@docker rm $(APP_NAME)-local || true
	@echo "✅ コンテナを停止しました"
