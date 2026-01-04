# AWS Deployment Guide

## .envファイルでのAWS Profile設定

### 1. 環境変数ファイルの設定

#### `.env.sample` (サンプル設定)

```bash
# AWS Configuration
AWS_REGION=ap-northeast-1
AWS_PROFILE=heartland
STAGE=dev
```

#### `.env` (実際の設定)

```bash
# .env.sampleをコピーして作成
cp .env.sample .env
# 必要に応じて値を編集
```

### 2. AWS Profile設定

#### AWS CLIでプロファイルを設定

```bash
# 開発用プロファイル
aws configure --profile heartland
# Access Key ID: [入力]
# Secret Access Key: [入力]
# Default region: ap-northeast-1
# Default output format: json
```

### 3. デプロイコマンド

#### 標準デプロイ（serverless.ymlの設定を使用）

```bash
# 開発環境デプロイ
pnpm run deploy:dev

# 本番環境デプロイ
pnpm run deploy:prod
```

### 4. serverless.ymlでの環境変数参照

```yaml
provider:
  name: aws
  runtime: nodejs22.x
  region: ${env:AWS_REGION, 'ap-northeast-1'}
  stage: ${opt:stage, 'dev'}
  profile: ${env:AWS_PROFILE, 'default'}
```

### 5. 環境変数の優先順位

1. **コマンドライン引数**: `--aws-profile heartland`
2. **環境変数**: `AWS_PROFILE=heartland`
3. **serverless.yml**: `profile: heartland`
4. **デフォルト**: `default`

### 6. セキュリティ注意事項

- `.env`ファイルは`.gitignore`に追加
- 本番環境の認証情報は環境変数またはAWS Secrets Managerを使用
- 開発用と本番用で異なるプロファイルを使用

### 7. トラブルシューティング

#### プロファイルが見つからない場合

```bash
# プロファイル一覧確認
aws configure list-profiles

# 特定プロファイルの設定確認
aws configure list --profile heartland
```

#### 権限エラーの場合

```bash
# 現在の認証情報確認
aws sts get-caller-identity --profile heartland
```
