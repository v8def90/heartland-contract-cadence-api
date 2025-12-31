# AWS SES 設定ガイド

**作成日**: 2025-12-30  
**目的**: メール/パスワード認証機能のデプロイ前に必要なAWS SES設定手順  
**対象**: 開発環境・本番環境

---

## 📋 目次

1. [AWS SES概要](#aws-ses概要)
2. [SESサンドボックス環境](#sesサンドボックス環境)
3. [設定手順（開発環境）](#設定手順開発環境)
4. [設定手順（本番環境）](#設定手順本番環境)
5. [環境変数設定](#環境変数設定)
6. [IAM権限確認](#iam権限確認)
7. [動作確認](#動作確認)
8. [トラブルシューティング](#トラブルシューティング)

---

## AWS SES概要

### SESとは

**Amazon Simple Email Service (SES)** は、アプリケーションからメールを送信するためのマネージドサービスです。

### 本実装での用途

- ✅ メール認証メール送信
- ✅ パスワードリセットメール送信
- ✅ ウェルカムメール送信

### 使用リージョン

- **デフォルト**: `ap-northeast-1` (東京)
- **環境変数**: `SES_REGION`

---

## SESサンドボックス環境

### サンドボックスとは

AWS SESは、新規アカウントでは**サンドボックス環境**で動作します。

### サンドボックスの制限

1. **送信元メールアドレス**: 検証済みメールアドレスのみ送信可能
2. **受信メールアドレス**: 検証済みメールアドレスのみ送信可能
3. **送信量**: 24時間あたり200通、1秒あたり1通

### サンドボックス解除

本番環境では、サンドボックス解除申請が必要です（後述）。

---

## 設定手順（開発環境）

### Step 1: AWSコンソールでSESにアクセス

1. AWSマネジメントコンソールにログイン
2. サービス検索で「SES」を検索
3. **Amazon SES** を選択
4. リージョンを **アジアパシフィック（東京）** (`ap-northeast-1`) に設定

### Step 2: 送信元メールアドレスの検証

#### 2-1. メールアドレス検証

1. 左メニューから **「Verified identities」** を選択
2. **「Create identity」** をクリック
3. **Identity type** で **「Email address」** を選択
4. **Email address** に送信元メールアドレスを入力（例: `noreply@example.com`）
5. **「Create identity」** をクリック

#### 2-2. メールアドレス確認

1. 指定したメールアドレスに検証メールが届きます
2. メール内のリンクをクリックして検証を完了
3. AWSコンソールで **「Verified」** ステータスを確認

#### 2-3. ドメイン検証（推奨）

**メールアドレス検証の代わりに、ドメイン全体を検証することも可能です。**

1. **「Create identity」** をクリック
2. **Identity type** で **「Domain」** を選択
3. **Domain** にドメイン名を入力（例: `example.com`）
4. DNSレコードを追加（TXTレコード、CNAMEレコード）
5. 検証完了を待つ（数分〜数時間）

**メリット**:

- ドメイン内のすべてのメールアドレスが使用可能
- 本番環境で推奨

### Step 3: 受信メールアドレスの検証（サンドボックス環境）

**開発環境では、テスト用のメールアドレスも検証が必要です。**

1. テスト用メールアドレスを検証（Step 2と同様）
2. 検証済みメールアドレスにのみメール送信可能

**注意**: サンドボックス解除後は不要

### Step 4: 送信統計の確認

1. 左メニューから **「Sending statistics」** を選択
2. 送信量、バウンス率、苦情率を確認

---

## 設定手順（本番環境）

### Step 1: サンドボックス解除申請

#### 1-1. 申請方法

1. AWSコンソールで **「Account dashboard」** を選択
2. **「Request production access」** をクリック
3. 申請フォームに記入:
   - **Mail Type**: Transactional（トランザクションメール）
   - **Website URL**: アプリケーションのURL
   - **Use case description**: メール認証、パスワードリセットの用途を説明
   - **Expected sending volume**: 予想送信量（例: 1000通/日）
   - **Compliance**: SPF/DKIM設定の確認

#### 1-2. 審査期間

- **通常**: 24時間以内
- **最長**: 数日

#### 1-3. 審査通過後

- サンドボックス制限が解除されます
- 検証済みメールアドレス以外にも送信可能
- 送信量制限が緩和されます

### Step 2: SPF/DKIM設定（推奨）

#### 2-1. SPFレコード設定

ドメインのDNSにSPFレコードを追加:

```
TXT レコード
名前: @ (またはドメイン名)
値: v=spf1 include:amazonses.com ~all
```

#### 2-2. DKIM設定

1. AWSコンソールで **「Verified identities」** を選択
2. ドメインを選択
3. **「DKIM」** タブを選択
4. **「Easy DKIM」** を有効化
5. 表示されたCNAMEレコードをDNSに追加
6. 検証完了を待つ

**メリット**:

- メールの信頼性向上
- スパム判定の回避

### Step 3: 送信量制限の確認

1. **「Account dashboard」** で送信量制限を確認
2. 必要に応じて制限緩和を申請

---

## 環境変数設定

### 必要な環境変数

以下の環境変数を設定してください:

```bash
# AWS SES設定
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=noreply@example.com

# フロントエンドURL（メール内リンク用）
FRONTEND_URL=https://app.example.com
```

### 設定方法

#### 方法1: `.env`ファイル（ローカル開発）

プロジェクトルートに`.env`ファイルを作成:

```bash
# .env
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=noreply@example.com
FRONTEND_URL=http://localhost:3000
```

#### 方法2: Serverless Framework環境変数

`serverless.yml`の`provider.environment`に追加:

```yaml
provider:
  environment:
    SES_REGION: ${env:SES_REGION, 'ap-northeast-1'}
    SES_FROM_EMAIL: ${env:SES_FROM_EMAIL, 'noreply@example.com'}
    FRONTEND_URL: ${env:FRONTEND_URL, 'https://app.example.com'}
```

#### 方法3: AWS Systems Manager Parameter Store（推奨）

本番環境では、AWS Systems Manager Parameter Storeを使用:

```bash
# パラメータを作成
aws ssm put-parameter \
  --name "/heartland/ses/region" \
  --value "ap-northeast-1" \
  --type "String"

aws ssm put-parameter \
  --name "/heartland/ses/from-email" \
  --value "noreply@example.com" \
  --type "String"

aws ssm put-parameter \
  --name "/heartland/frontend/url" \
  --value "https://app.example.com" \
  --type "String"
```

`serverless.yml`で参照:

```yaml
provider:
  environment:
    SES_REGION: ${ssm:/heartland/ses/region}
    SES_FROM_EMAIL: ${ssm:/heartland/ses/from-email}
    FRONTEND_URL: ${ssm:/heartland/frontend/url}
```

**IAM権限追加**:

```yaml
iamRoleStatements:
  - Effect: Allow
    Action:
      - ssm:GetParameter
      - ssm:GetParameters
    Resource:
      - arn:aws:ssm:ap-northeast-1:*:parameter/heartland/*
```

---

## IAM権限確認

### 必要なIAM権限

`serverless.yml`に以下のIAM権限が追加されていることを確認:

```yaml
iamRoleStatements:
  - Effect: Allow
    Action:
      - ses:SendEmail
      - ses:SendRawEmail
    Resource: '*'
```

### 権限の確認

1. AWSコンソールで **IAM** を選択
2. **「Roles」** を選択
3. Serverless Frameworkが作成したロールを検索（例: `heartland-contract-cadence-api-dev-ap-northeast-1-lambdaRole`）
4. ポリシーに `ses:SendEmail` と `ses:SendRawEmail` が含まれていることを確認

---

## 動作確認

### Step 1: ローカルテスト

```bash
# 環境変数を設定
export SES_REGION=ap-northeast-1
export SES_FROM_EMAIL=noreply@example.com
export FRONTEND_URL=http://localhost:3000

# テスト実行
pnpm run test
```

### Step 2: デプロイ後のテスト

#### 2-1. メール認証メール送信テスト

```bash
# APIエンドポイントを呼び出し
curl -X POST https://your-api-endpoint.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User"
  }'
```

#### 2-2. メール受信確認

1. 検証済みメールアドレスにメールが届くことを確認
2. メール内のリンクが正しく生成されていることを確認

#### 2-3. CloudWatch Logs確認

1. AWSコンソールで **CloudWatch** を選択
2. **「Log groups」** を選択
3. Lambda関数のロググループを確認
4. エラーがないことを確認

---

## トラブルシューティング

### エラー1: `Email address is not verified`

**原因**: 送信元メールアドレスが検証されていない

**解決方法**:

1. AWSコンソールでメールアドレスを検証
2. 検証ステータスが **「Verified」** であることを確認

### エラー2: `MessageRejected: Email address is not verified`

**原因**: 受信メールアドレスが検証されていない（サンドボックス環境）

**解決方法**:

1. 開発環境: 受信メールアドレスも検証
2. 本番環境: サンドボックス解除申請

### エラー3: `AccessDenied: User is not authorized to perform: ses:SendEmail`

**原因**: IAM権限が不足している

**解決方法**:

1. `serverless.yml`のIAM権限を確認
2. Lambda関数のロールにSES権限が追加されていることを確認
3. `serverless deploy`で再デプロイ

### エラー4: `InvalidParameterValue: Source email address is not verified`

**原因**: 環境変数`SES_FROM_EMAIL`が検証済みメールアドレスと一致していない

**解決方法**:

1. 環境変数`SES_FROM_EMAIL`を確認
2. AWSコンソールで検証済みメールアドレスと一致していることを確認

### エラー5: `Throttling: Maximum sending rate exceeded`

**原因**: 送信量制限を超えている（サンドボックス: 1秒あたり1通）

**解決方法**:

1. 送信間隔を調整
2. 本番環境: サンドボックス解除申請

### エラー6: メールが届かない

**確認項目**:

1. **送信元メールアドレス**: 検証済みか
2. **受信メールアドレス**: サンドボックス環境では検証済みか
3. **スパムフォルダ**: メールがスパムフォルダに入っていないか
4. **CloudWatch Logs**: エラーログを確認
5. **SES送信統計**: バウンス率、苦情率を確認

---

## セキュリティベストプラクティス

### 1. メールアドレス検証

- ✅ 送信元メールアドレスは必ず検証
- ✅ ドメイン検証を推奨（本番環境）

### 2. SPF/DKIM設定

- ✅ SPFレコードを設定
- ✅ DKIMを有効化
- ✅ メールの信頼性向上

### 3. バウンス・苦情処理

- ✅ バウンス率を監視
- ✅ 苦情率を監視
- ✅ 問題のあるメールアドレスをブラックリスト化

### 4. レート制限

- ✅ 送信量制限を確認
- ✅ 必要に応じて制限緩和を申請

### 5. 環境変数管理

- ✅ 本番環境ではAWS Systems Manager Parameter Storeを使用
- ✅ `.env`ファイルを`.gitignore`に追加

---

## チェックリスト

### デプロイ前

- [ ] 送信元メールアドレスを検証
- [ ] 開発環境: 受信メールアドレスを検証（サンドボックス）
- [ ] 本番環境: サンドボックス解除申請
- [ ] 環境変数を設定（`.env`またはParameter Store）
- [ ] IAM権限を確認
- [ ] `serverless.yml`のIAM権限を確認

### デプロイ後

- [ ] メール送信テスト
- [ ] CloudWatch Logsでエラー確認
- [ ] SES送信統計を確認
- [ ] メール受信確認

### 本番環境（追加）

- [ ] SPFレコード設定
- [ ] DKIM設定
- [ ] 送信量制限確認
- [ ] バウンス・苦情率監視設定

---

## 参考リンク

- [AWS SES ドキュメント](https://docs.aws.amazon.com/ses/)
- [SES サンドボックス解除](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [SPFレコード設定](https://docs.aws.amazon.com/ses/latest/dg/authentication-spf.html)
- [DKIM設定](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html)

---

**最終更新**: 2025-12-30  
**状態**: 設定ガイド完成
