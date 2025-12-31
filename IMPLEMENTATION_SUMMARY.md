# メール/パスワード認証機能 実装完了サマリー

**作成日**: 2025-12-30  
**状態**: Phase 1-3 実装完了  
**ビルド**: ✅ 成功

---

## ✅ 実装完了項目

### Phase 1: 基盤実装（完了）

#### 1. ✅ PasswordService (`src/services/PasswordService.ts`)

- パスワードハッシュ化（bcrypt、salt rounds: 12）
- パスワード検証
- パスワード強度チェック（最小8文字、3種類以上の文字種）
- パスワードリセットトークン生成

#### 2. ✅ EmailVerificationService (`src/services/EmailVerificationService.ts`)

- メール認証トークン生成（32バイト、Base64 URL-safe）
- トークンハッシュ化（SHA-256）
- トークン検証（タイミング攻撃対策）
- レート制限チェック（24時間あたり3回、最小5分間隔）

#### 3. ✅ EmailService (`src/services/EmailService.ts`)

- AWS SES統合
- メール送信機能
- メールテンプレート（HTML + プレーンテキスト）
  - 認証メール
  - パスワードリセットメール
  - ウェルカムメール

#### 4. ✅ PdsService (`src/services/PdsService.ts`)

- PDS API連携（`https://bsky.social`）
- DID生成（`com.atproto.server.createAccount`）
- リトライロジック（3回、指数バックオフ）
- タイムアウト設定（30秒）

#### 5. ✅ UserAuthService (`src/services/UserAuthService.ts`)

- メール/パスワード登録
- メール/パスワードログイン
- メール認証チェック（未認証ユーザーのログイン禁止）
- アカウントロック機能（5回失敗で15分ロック）
- 既存アカウントへのメールリンク

#### 6. ✅ AT URIユーティリティ (`src/utils/atUri.ts`)

- AT URI生成
- AT URI解析
- AT URI検証
- プロファイルURI生成

---

### Phase 2: API実装（完了）

#### 7. ✅ AuthController拡張 (`src/controllers/auth/AuthController.ts`)

- **POST /auth/register** - メール/パスワード登録
- **POST /auth/email-login** - メール/パスワードログイン
- **POST /auth/verify-email** - メール認証
- **POST /auth/resend-verification-email** - 認証メール再送信

#### 8. ✅ JWT Payload拡張 (`src/middleware/passport.ts`)

- `authMethod`フィールド追加（'flow' | 'email' | 'did'）
- `email`フィールド追加（メール認証の場合）
- `address`フィールドをオプショナル化（メール認証では不要）

#### 9. ✅ リクエスト/レスポンスモデル拡張

- `EmailPasswordRegisterRequest`
- `EmailPasswordLoginRequest`
- `VerifyEmailRequest`
- `ResendVerificationEmailRequest`
- `AuthData`に`email`フィールド追加

---

### Phase 3: データモデル統合（完了）

#### 10. ✅ SnsService拡張 (`src/services/SnsService.ts`)

- **AT Protocolデータモデルインターフェース追加**:
  - `DynamoDBUserProfileItem`
  - `DynamoDBIdentityLinkItem`
  - `DynamoDBIdentityLookupItem`
- **新規メソッド追加**:
  - `createUserProfileItem()` - AT Protocolユーザープロフィール作成
  - `getUserProfileItem()` - AT Protocolユーザープロフィール取得
  - `createIdentityLink()` - アイデンティティリンク作成
  - `getIdentityLink()` - アイデンティティリンク取得
  - `updateIdentityLink()` - アイデンティティリンク更新
  - `createIdentityLookup()` - アイデンティティルックアップ作成（メール重複防止）
  - `getIdentityLookup()` - アイデンティティルックアップ取得
  - `queryIdentityLinks()` - アイデンティティリンク一覧取得

---

### Phase 4: インフラストラクチャ（完了）

#### 11. ✅ 依存関係追加

- `bcryptjs` - パスワードハッシュ化
- `@aws-sdk/client-ses` - AWS SES統合
- `@atproto/api` - AT Protocol API
- `ulid` - rkey生成（TIDの代替）

#### 12. ✅ serverless.yml更新

- SES IAM権限追加（`ses:SendEmail`, `ses:SendRawEmail`）

#### 13. ✅ 既存コード更新

- `BloctoAuthService`: `generateJwtToken`呼び出しを更新（`authMethod: 'flow'`）
- `authHelpers`: `generateJwtToken`呼び出しを更新（`authMethod: 'flow'`）
- `AuthController`: 既存の`generateJwtToken`呼び出しを更新

---

## 📋 実装されたエンドポイント

### 認証エンドポイント

1. **POST /auth/register**
   - メール/パスワードでの新規ユーザー登録
   - PDS経由でDID生成
   - 認証メール自動送信
   - JWT生成（オプション）

2. **POST /auth/email-login**
   - メール/パスワードでのログイン
   - メール認証済みチェック（未認証はログイン禁止）
   - アカウントロックチェック
   - JWT生成

3. **POST /auth/verify-email**
   - メール認証トークンの検証
   - メール認証ステータスの更新

4. **POST /auth/resend-verification-email**
   - 認証メールの再送信
   - レート制限チェック

---

## 🔧 実装された機能

### セキュリティ機能

- ✅ パスワードハッシュ化（bcrypt、salt rounds: 12）
- ✅ トークンハッシュ化（SHA-256）
- ✅ タイミング攻撃対策（`crypto.timingSafeEqual`）
- ✅ アカウントロック（5回失敗で15分ロック）
- ✅ レート制限（メール送信、ログイン試行）
- ✅ メール認証必須（未認証ユーザーのログイン禁止）

### AT Protocol統合

- ✅ PDS連携（`https://bsky.social`）
- ✅ DID生成（`com.atproto.server.createAccount`）
- ✅ AT Protocolデータモデル（UserProfile, IdentityLink, IdentityLookup）
- ✅ AT URI生成・解析ユーティリティ

### メール機能

- ✅ AWS SES統合
- ✅ HTML + プレーンテキストメール
- ✅ 認証メール、パスワードリセットメール、ウェルカムメール
- ✅ メールテンプレート（日本語対応）

---

## 📝 実装時の注意点

### 1. PDS API認証

- `com.atproto.server.createAccount`は認証不要
- リクエストパラメータ（`email`, `password`, `handle`）のみでアカウント作成可能

### 2. メール認証未完了ユーザー

- `emailVerified: true`のみログイン許可
- 未認証ユーザーは`EMAIL_NOT_VERIFIED`エラーを返却

### 3. 環境変数

- `.env`ファイルで管理
- 必要な環境変数:
  - `PDS_ENDPOINT`, `PDS_TIMEOUT`
  - `SES_REGION`, `SES_FROM_EMAIL`, `FRONTEND_URL`
  - `EMAIL_VERIFICATION_TOKEN_EXPIRY`, `EMAIL_VERIFICATION_MAX_RESENDS`
  - `PASSWORD_MIN_LENGTH`, `PASSWORD_BCRYPT_ROUNDS`

### 4. AWS SES設定

- ⚠️ **未設定**（実装時に設定が必要）
- IAM権限は`serverless.yml`に追加済み
- 送信元メールアドレスの検証が必要

---

## 🚧 実装時に必要な設定

### AWS SES設定

1. AWS SESコンソールで送信元メールアドレスを検証
2. 開発環境: SESサンドボックス（検証済みメールアドレスのみ送信可能）
3. 本番環境: SESサンドボックス解除申請
4. 環境変数を`.env`ファイルに追加

### 環境変数設定（`.env`ファイル）

```bash
# PDS Configuration
PDS_ENDPOINT=https://bsky.social
PDS_TIMEOUT=30000

# Email Service (SES)
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=noreply@example.com
FRONTEND_URL=https://app.example.com

# Email Verification
EMAIL_VERIFICATION_TOKEN_EXPIRY=86400000  # 24時間
EMAIL_VERIFICATION_MAX_RESENDS=3

# Password
PASSWORD_MIN_LENGTH=8
PASSWORD_BCRYPT_ROUNDS=12
```

---

## 📊 実装統計

### 新規作成ファイル

1. `src/services/PasswordService.ts` - パスワード管理
2. `src/services/EmailVerificationService.ts` - メール認証
3. `src/services/EmailService.ts` - メール送信
4. `src/services/PdsService.ts` - PDS連携
5. `src/services/UserAuthService.ts` - 統合認証
6. `src/utils/atUri.ts` - AT URIユーティリティ

### 更新ファイル

1. `src/controllers/auth/AuthController.ts` - 認証エンドポイント追加
2. `src/middleware/passport.ts` - JWT Payload拡張
3. `src/services/SnsService.ts` - AT Protocolデータモデル追加
4. `src/services/BloctoAuthService.ts` - JWT生成更新
5. `src/utils/authHelpers.ts` - JWT生成更新
6. `src/models/requests/index.ts` - リクエストモデル追加
7. `src/models/responses/index.ts` - レスポンスモデル更新
8. `serverless.yml` - SES IAM権限追加

### 追加依存関係

- `bcryptjs` (3.0.3)
- `@types/bcryptjs` (3.0.0)
- `@aws-sdk/client-ses` (3.958.0)
- `@atproto/api` (0.18.9)
- `ulid` (3.0.2)

---

## ✅ ビルド・型チェック

- ✅ TypeScriptコンパイル: 成功
- ✅ 型チェック: 成功
- ✅ ESLint: エラーなし

---

## 🎯 次のステップ

### 実装時に必要な作業

1. **AWS SES設定**
   - 送信元メールアドレスの検証
   - SESサンドボックス解除（本番環境）

2. **環境変数設定**
   - `.env`ファイルに必要な環境変数を追加

3. **テスト**
   - ユニットテストの追加
   - 統合テストの実装

4. **デプロイ**
   - `serverless deploy`でデプロイ
   - 環境変数の設定確認

---

## 📝 実装時の注意事項

### 1. PDS API

- 認証不要で利用可能
- リトライロジック実装済み（3回、指数バックオフ）
- タイムアウト: 30秒

### 2. メール認証

- 未認証ユーザーはログイン禁止
- レート制限: 24時間あたり3回、最小5分間隔
- トークン有効期限: 24時間

### 3. パスワード

- 最小長: 8文字
- 複雑さ: 3種類以上の文字種
- ハッシュ化: bcrypt（salt rounds: 12）

### 4. アカウントロック

- 5回失敗で15分ロック
- ロック解除は自動（時間経過）

---

**最終更新**: 2025-12-30  
**状態**: Phase 1-3 実装完了  
**次回**: AWS SES設定後、テスト・デプロイ
