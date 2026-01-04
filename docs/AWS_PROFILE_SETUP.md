# AWS プロファイル設定ガイド

**作成日**: 2025-12-30  
**目的**: Serverless FrameworkでAWSプロファイルを使用する設定方法

---

## ✅ 確認結果

### プロファイル情報

- **プロファイル名**: `AWSAdministratorAccess-925271162067`
- **アカウントID**: `925271162067`
- **リージョン**: `ap-northeast-1`
- **認証方式**: AWS SSO (Single Sign-On)
- **権限**: AdministratorAccess（管理者権限）

### SES設定状況

- ✅ **メール送信**: 有効 (`Enabled: true`)
- ⚠️ **サンドボックス環境**: 有効
  - 24時間あたり最大送信数: 200通
  - 1秒あたり最大送信数: 1通
- ⚠️ **検証済みメールアドレス**: 0件（設定が必要）

---

## 🔧 Serverless Frameworkでのプロファイル設定

### 方法1: 環境変数で設定（推奨）

```bash
# 一時的に設定（現在のセッションのみ）
export AWS_PROFILE=AWSAdministratorAccess-925271162067

# デプロイ
serverless deploy --stage dev
```

### 方法2: コマンド実行時に指定

```bash
# 環境変数を指定してデプロイ
AWS_PROFILE=AWSAdministratorAccess-925271162067 serverless deploy --stage dev
```

### 方法3: serverless.ymlを更新

`serverless.yml`の`provider.profile`を更新:

```yaml
provider:
  profile: ${env:AWS_PROFILE, 'AWSAdministratorAccess-925271162067'}
```

または、直接指定:

```yaml
provider:
  profile: AWSAdministratorAccess-925271162067
```

### 方法4: .envファイルで設定

プロジェクトルートに`.env`ファイルを作成:

```bash
# .env
AWS_PROFILE=AWSAdministratorAccess-925271162067
AWS_REGION=ap-northeast-1
```

**注意**: `.env`ファイルは`.gitignore`に追加してください。

---

## 📋 次のステップ

### 1. 送信元メールアドレスの検証

```bash
# メールアドレスを検証
aws ses verify-email-identity \
  --email-address noreply@example.com \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1
```

または、AWSコンソールから:

1. AWSコンソール → SES → Verified identities
2. Create identity → Email address
3. メールアドレスを入力 → 検証メールを確認

### 2. 環境変数の設定

```bash
# .envファイルまたは環境変数に設定
export AWS_PROFILE=AWSAdministratorAccess-925271162067
export SES_REGION=ap-northeast-1
export SES_FROM_EMAIL=no-reply@heart-land.io  # 検証済みメールアドレス
export FRONTEND_URL=https://app.example.com
```

### 3. デプロイ前の確認

```bash
# プロファイルでアクセス確認
aws sts get-caller-identity --profile AWSAdministratorAccess-925271162067

# SES設定確認
aws ses get-account-sending-enabled \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1
```

---

## 🔍 現在のSES設定状況

### 送信制限（サンドボックス環境）

- **24時間あたり**: 200通
- **1秒あたり**: 1通
- **過去24時間の送信数**: 0通

### 検証済みメールアドレス

- **現在**: 0件
- **必要**: 送信元メールアドレスを検証

### サンドボックス解除

本番環境では、サンドボックス解除申請が必要です:

1. AWSコンソール → SES → Account dashboard
2. Request production access
3. 申請フォームに記入

---

## 📝 チェックリスト

### デプロイ前

- [x] AWSプロファイルでアクセス確認
- [x] SESメール送信が有効
- [ ] 送信元メールアドレスを検証
- [ ] 環境変数`AWS_PROFILE`を設定
- [ ] 環境変数`SES_FROM_EMAIL`を設定
- [ ] 環境変数`FRONTEND_URL`を設定

### デプロイ後

- [ ] メール送信テスト
- [ ] CloudWatch Logsでエラー確認
- [ ] SES送信統計を確認

---

## 🚨 注意事項

### SSOプロファイルの場合

- SSOセッションの有効期限に注意
- 期限切れの場合は再ログインが必要:

```bash
aws sso login --profile AWSAdministratorAccess-925271162067
```

### プロファイルの切り替え

複数のプロファイルを使用する場合:

```bash
# プロファイルを切り替え
export AWS_PROFILE=AWSAdministratorAccess-925271162067

# 確認
aws sts get-caller-identity
```

---

**最終更新**: 2025-12-30  
**状態**: プロファイル確認完了、SES設定待ち
