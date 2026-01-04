# メール認証による初回登録フロー

**作成日**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`  
**対象**: メール/パスワード認証による新規ユーザー登録

---

## 📋 概要

メール/パスワード認証による初回登録は、以下の4つのステップで構成されます：

1. **ユーザー登録** (`POST /auth/register`)
2. **メール認証** (`POST /auth/verify-email`)
3. **ログイン** (`POST /auth/email-login`)
4. **（オプション）検証メール再送信** (`POST /auth/resend-verification-email`)

---

## 🔄 詳細フロー

### Step 1: ユーザー登録 (`POST /auth/register`)

**目的**: 新規ユーザーアカウントを作成し、検証メールを送信

**エンドポイント**: `POST https://dev-api.heart-land.io/auth/register`

**リクエストボディ**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "handle": "johndoe.bsky.social"
}
```

**必須フィールド**:

- `email`: メールアドレス（検証済みメールアドレスを使用）
- `password`: パスワード（最小8文字、大文字・小文字・数字・特殊文字の3種類以上）
- `displayName`: 表示名
- `handle`: AT Protocolハンドル（例: `username.bsky.social`）

**処理内容**:

1. パスワード強度検証
2. メールアドレスの重複チェック
3. パスワードのハッシュ化（bcrypt）
4. PDS経由でDID（Decentralized Identifier）を生成
5. ユーザープロファイルの作成（DynamoDB）
6. アイデンティティリンクの作成（DynamoDB）
7. メール検証トークンの生成
8. **検証メールの送信**
9. ウェルカムメールの送信
10. JWTトークンの生成（メール未認証状態でも発行）

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "email": "user@example.com",
    "role": "user",
    "issuedAt": "2026-01-03T00:00:00.000Z"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**注意事項**:

- この時点ではメール認証が完了していないため、一部の機能は制限されます
- 検証メールは自動的に送信されます
- JWTトークンは発行されますが、メール認証完了までログインできない場合があります

---

### Step 2: メール認証 (`POST /auth/verify-email`)

**目的**: メールアドレスの所有権を確認

**エンドポイント**: `POST https://dev-api.heart-land.io/auth/verify-email`

**フロー**:

1. ユーザーがメール内のリンクをクリック
2. フロントエンドページに遷移（例: `https://dev-app.heart-land.io/auth/verify-email?token=xxx&did=did:plc:xxx`）
3. フロントエンドがURLパラメータから`token`と`did`を取得
4. フロントエンドがAPIエンドポイントを呼び出し

**リクエストボディ**:

```json
{
  "token": "verification-token-from-email",
  "primaryDid": "did:plc:xxxxxxxxxxxxxxxxxxxx"
}
```

**必須フィールド**:

- `token`: メール内のリンクから取得した検証トークン
- `primaryDid`: メール内のリンクから取得したDID（または登録時のレスポンスから取得）

**処理内容**:

1. トークンの有効性チェック（期限切れチェック含む）
2. トークンのハッシュ検証
3. アイデンティティリンクの更新（`emailVerified: true`）
4. ユーザープロファイルの更新

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "verified": true
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid or expired token",
    "details": "The verification token is invalid or has expired"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**注意事項**:

- トークンには有効期限があります（デフォルト: 24時間）
- トークンは1回のみ使用可能です
- メール認証が完了すると、ログインが可能になります

---

### Step 3: ログイン (`POST /auth/email-login`)

**目的**: メール認証済みユーザーのログイン

**エンドポイント**: `POST https://dev-api.heart-land.io/auth/email-login`

**リクエストボディ**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**必須フィールド**:

- `email`: 登録時に使用したメールアドレス
- `password`: 登録時に設定したパスワード

**処理内容**:

1. メールアドレスからユーザーを検索
2. パスワードの検証（bcrypt）
3. **メール認証状態のチェック**（重要）
4. JWTトークンの生成
5. ログイン試行回数のリセット

**レスポンス（成功）**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "email": "user@example.com",
    "role": "user",
    "issuedAt": "2026-01-03T00:00:00.000Z"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**エラーレスポンス（メール未認証）**:

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "メールアドレスの認証が必要です",
    "details": "メールアドレスの認証を完了してください。認証メールを確認してください。"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**エラーレスポンス（認証失敗）**:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid email or password",
    "details": "Invalid email or password"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**注意事項**:

- **メール認証が完了していない場合、ログインできません**
- パスワードはハッシュ化されて保存されているため、平文での比較は行われません
- ログイン失敗回数が一定回数を超えると、アカウントが一時的にロックされる可能性があります

---

### Step 4: （オプション）検証メール再送信 (`POST /auth/resend-verification-email`)

**目的**: 検証メールが届かない場合や期限切れの場合に再送信

**エンドポイント**: `POST https://dev-api.heart-land.io/auth/resend-verification-email`

**リクエストボディ**:

```json
{
  "primaryDid": "did:plc:xxxxxxxxxxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**必須フィールド**:

- `primaryDid`: 登録時に取得したDID
- `email`: 登録時に使用したメールアドレス

**処理内容**:

1. アイデンティティリンクの存在確認
2. メール認証状態のチェック（既に認証済みの場合はエラー）
3. 再送信制限のチェック（短時間での連続送信を防止）
4. 新しい検証トークンの生成
5. 検証メールの再送信

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "sent": true
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**エラーレスポンス（既に認証済み）**:

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_VERIFIED",
    "message": "Email already verified",
    "details": "This email address has already been verified"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**エラーレスポンス（再送信制限）**:

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests",
    "details": "Please wait before requesting another verification email"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

**注意事項**:

- 再送信には制限があります（デフォルト: 5分間隔）
- 既にメール認証が完了している場合は再送信できません
- 新しいトークンが生成されるため、古いトークンは無効になります

---

## 📊 完全なフロー図

```
┌─────────────┐
│  ユーザー   │
└──────┬──────┘
       │
       │ 1. POST /auth/register
       │    {email, password, displayName, handle}
       ▼
┌─────────────────────┐
│   API Server        │
│  - DID生成 (PDS)    │
│  - プロファイル作成 │
│  - 検証メール送信   │
└──────┬──────────────┘
       │
       │ 2. 検証メール送信
       ▼
┌─────────────┐
│   メール    │
│  (SES)      │
└──────┬──────┘
       │
       │ 3. ユーザーがメール内のリンクをクリック
       ▼
┌─────────────┐
│ フロントエンド │
│ (dev-app.    │
│  heart-land.io)│
└──────┬──────┘
       │
       │ 4. POST /auth/verify-email
       │    {token, primaryDid}
       ▼
┌─────────────────────┐
│   API Server        │
│  - トークン検証     │
│  - メール認証完了   │
└──────┬──────────────┘
       │
       │ 5. POST /auth/email-login
       │    {email, password}
       ▼
┌─────────────────────┐
│   API Server        │
│  - パスワード検証   │
│  - メール認証確認   │
│  - JWTトークン発行  │
└──────┬──────────────┘
       │
       │ 6. JWTトークン取得
       ▼
┌─────────────┐
│  ユーザー   │
│ (認証完了)  │
└─────────────┘
```

---

## 🧪 テストコマンド例

### 完全なフローをテストする場合

```bash
#!/bin/bash

BASE_URL="https://dev-api.heart-land.io"
EMAIL="test@example.com"
PASSWORD="SecurePass123!"
DISPLAY_NAME="Test User"
HANDLE="testuser.bsky.social"

echo "=== Step 1: ユーザー登録 ==="
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"displayName\": \"${DISPLAY_NAME}\",
    \"handle\": \"${HANDLE}\"
  }")

echo "$REGISTER_RESPONSE" | jq .

# DIDを取得（実際のレスポンスから取得する必要があります）
# PRIMARY_DID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.primaryDid // empty')

echo ""
echo "=== Step 2: メール認証（メール内のリンクをクリック後） ==="
echo "メール内のリンクをクリックして、フロントエンドページから認証を完了してください。"

echo ""
echo "=== Step 3: ログイン ==="
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" | jq .

if [ "$(echo "$LOGIN_RESPONSE" | jq -r '.success')" = "true" ]; then
  echo "✅ ログイン成功"
  JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
  echo "JWT Token: ${JWT_TOKEN:0:50}..."
else
  echo "❌ ログイン失敗"
  ERROR_CODE=$(echo "$LOGIN_RESPONSE" | jq -r '.error.code')
  if [ "$ERROR_CODE" = "EMAIL_NOT_VERIFIED" ]; then
    echo "⚠️  メール認証が完了していません。メール内のリンクをクリックして認証を完了してください。"
  fi
fi
```

---

## ⚠️ 重要な注意事項

### 1. メール認証の必須性

- **メール認証が完了していない場合、ログインできません**
- 登録直後に発行されるJWTトークンは、メール認証完了まで制限付きで使用可能な場合があります

### 2. パスワード要件

- 最小8文字
- 大文字、小文字、数字、特殊文字のうち3種類以上を含む
- 例: `SecurePass123!`, `Password1@`, `Test1234!`

### 3. メールアドレスの検証

- AWS SESで検証済みのメールアドレスを使用する必要があります
- サンドボックス環境では、送信元と受信先の両方のメールアドレスを検証する必要があります

### 4. トークンの有効期限

- 検証トークンには有効期限があります（デフォルト: 24時間）
- 期限切れの場合は、再送信エンドポイントを使用して新しいトークンを取得してください

### 5. エラーハンドリング

- すべてのエラーレスポンスには`code`、`message`、`details`が含まれます
- エラーコードに基づいて適切な処理を行ってください

---

## 📚 関連エンドポイント

- `POST /auth/register` - ユーザー登録
- `POST /auth/verify-email` - メール認証
- `POST /auth/email-login` - ログイン
- `POST /auth/resend-verification-email` - 検証メール再送信

---

**最終更新**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`
