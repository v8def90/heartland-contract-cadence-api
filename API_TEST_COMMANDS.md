# メール/パスワード認証エンドポイント テストコマンド

**作成日**: 2025-12-30  
**APIエンドポイント**: `https://dev-api.heart-land.io`  
**対象**: メール/パスワード認証機能

---

## 📋 実装済みエンドポイント一覧

### 1. POST /auth/register

メール/パスワードでの新規ユーザー登録

### 2. POST /auth/email-login

メール/パスワードでのログイン

### 3. POST /auth/verify-email

メール認証トークンの検証

### 4. POST /auth/resend-verification-email

認証メールの再送信

---

## 🧪 テストコマンド

### ベースURL

```bash
BASE_URL="https://dev-api.heart-land.io"
```

---

## 1. ユーザー登録 (POST /auth/register)

### リクエスト

```bash
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User",
    "handle": "testuser.bsky.social"
  }'
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "email": "test@example.com",
    "role": "user",
    "issuedAt": "2025-12-30T12:00:00.000Z"
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### テスト用コマンド（変数使用）

```bash
BASE_URL="https://dev-api.heart-land.io"
EMAIL="test@example.com"
PASSWORD="Test1234!"
DISPLAY_NAME="Test User"

curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"displayName\": \"${DISPLAY_NAME}\"
  }" | jq .
```

---

## 2. メール/パスワードログイン (POST /auth/email-login)

### リクエスト

```bash
curl -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "email": "test@example.com",
    "role": "user",
    "issuedAt": "2025-12-30T12:00:00.000Z"
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### エラーレスポンス（メール未認証の場合）

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "メールアドレスの認証が必要です",
    "details": "メールアドレスの認証を完了してください。認証メールを確認してください。"
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### テスト用コマンド

```bash
BASE_URL="https://dev-api.heart-land.io"
EMAIL="test@example.com"
PASSWORD="Test1234!"

curl -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq .
```

---

## 3. メール認証 (POST /auth/verify-email)

### リクエスト

```bash
curl -X POST "${BASE_URL}/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verification-token-from-email",
    "primaryDid": "did:plc:xxx"
  }'
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "email": "test@example.com",
    "verified": true
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### テスト用コマンド

```bash
BASE_URL="https://dev-api.heart-land.io"
TOKEN="verification-token-from-email"
PRIMARY_DID="did:plc:xxx"

curl -X POST "${BASE_URL}/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"${TOKEN}\",
    \"primaryDid\": \"${PRIMARY_DID}\"
  }" | jq .
```

---

## 4. 認証メール再送信 (POST /auth/resend-verification-email)

### リクエスト

```bash
curl -X POST "${BASE_URL}/auth/resend-verification-email" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryDid": "did:plc:xxx",
    "email": "test@example.com"
  }'
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "sent": true
  },
  "timestamp": "2025-12-30T12:00:00.000Z"
}
```

### テスト用コマンド

```bash
BASE_URL="https://dev-api.heart-land.io"
PRIMARY_DID="did:plc:xxx"
EMAIL="test@example.com"

curl -X POST "${BASE_URL}/auth/resend-verification-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"primaryDid\": \"${PRIMARY_DID}\",
    \"email\": \"${EMAIL}\"
  }" | jq .
```

---

## 🔄 完全なテストフロー

### Step 1: ユーザー登録

```bash
BASE_URL="https://dev-api.heart-land.io"
EMAIL="test@example.com"
PASSWORD="Test1234!"
DISPLAY_NAME="Test User"

# 登録
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"displayName\": \"${DISPLAY_NAME}\"
  }")

echo "=== 登録レスポンス ==="
echo "$REGISTER_RESPONSE" | jq .

# DIDを取得（レスポンスから）
PRIMARY_DID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.email // empty')
echo "Primary DID: $PRIMARY_DID"
```

### Step 2: メール認証（メール内のリンクをクリック後）

メール内のリンクをクリックして認証を完了してください。

### Step 3: ログイン

```bash
# ログイン
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "=== ログインレスポンス ==="
echo "$LOGIN_RESPONSE" | jq .

# JWTトークンを取得
JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
echo "JWT Token: $JWT_TOKEN"
```

### Step 4: 保護されたエンドポイントへのアクセス

```bash
# JWTトークンを使用して保護されたエンドポイントにアクセス
curl -X GET "${BASE_URL}/sns/users/${USER_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" | jq .
```

---

## 📝 テスト用データ

### テスト用メールアドレス

**注意**: サンドボックス環境では、受信メールアドレスも検証が必要です。

```bash
# 検証済みメールアドレスを使用
TEST_EMAIL="test@example.com"  # 検証済みメールアドレスに変更

# または、検証済みメールアドレスを確認
aws ses list-verified-email-addresses \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1
```

### パスワード要件

- 最小8文字
- 大文字、小文字、数字、特殊文字を含む（3種類以上）

**テスト用パスワード例**:

- `Test1234!`
- `Password1@`
- `SecurePass123!`

---

## 🐛 エラーハンドリング

### よくあるエラー

#### 1. メール未認証エラー

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "メールアドレスの認証が必要です"
  }
}
```

**対処**: メール内のリンクをクリックして認証を完了

#### 2. パスワード強度不足

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password validation failed"
  }
}
```

**対処**: より強力なパスワードを使用

#### 3. メールアドレス重複

```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Email already registered"
  }
}
```

**対処**: 別のメールアドレスを使用

---

## 🔍 デバッグ用コマンド

### レスポンスの詳細表示

```bash
curl -v -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User"
  }'
```

### HTTPステータスコードのみ表示

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User"
  }'
```

### CloudWatch Logs確認

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --follow
```

---

## 📊 テスト結果の確認

### 成功時の確認項目

1. ✅ HTTPステータスコード: `200`
2. ✅ `success: true`
3. ✅ `data.token` が存在
4. ✅ `data.email` が正しい
5. ✅ `data.role` が `"user"`

### エラー時の確認項目

1. ⚠️ HTTPステータスコード: `400`, `401`, `403`, `500`
2. ⚠️ `success: false`
3. ⚠️ `error.code` と `error.message` を確認
4. ⚠️ CloudWatch Logsで詳細を確認

---

## 🚀 クイックテストスクリプト

```bash
#!/bin/bash

BASE_URL="https://dev-api.heart-land.io"
EMAIL="test@example.com"
PASSWORD="Test1234!"
DISPLAY_NAME="Test User"

echo "=== 1. ユーザー登録 ==="
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"displayName\": \"${DISPLAY_NAME}\"
  }")

echo "$REGISTER_RESPONSE" | jq .

if [ "$(echo "$REGISTER_RESPONSE" | jq -r '.success')" = "true" ]; then
  echo "✅ 登録成功"
  JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
  echo "JWT Token: ${JWT_TOKEN:0:50}..."
else
  echo "❌ 登録失敗"
  exit 1
fi

echo ""
echo "=== 2. ログイン（メール認証後） ==="
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" | jq .

if [ "$(echo "$LOGIN_RESPONSE" | jq -r '.success')" = "true" ]; then
  echo "✅ ログイン成功"
else
  echo "❌ ログイン失敗（メール認証が必要な可能性があります）"
fi
```

---

**最終更新**: 2025-12-30  
**APIエンドポイント**: `https://dev-api.heart-land.io`
