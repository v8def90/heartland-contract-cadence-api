# LINEアカウント連携エンドポイント テストコマンド

**作成日**: 2025-01-09  
**APIエンドポイント**: `https://dev-api.heart-land.io`  
**対象**: LINEアカウント連携機能

---

## 📋 実装済みエンドポイント一覧

### 1. POST /line/link
nonce生成とリダイレクトURL返却

### 2. POST /line/complete-link
アカウント連携完了処理（Botサーバーから呼び出し）

### 3. GET /line/link-status
連携ステータス取得

### 4. DELETE /line/unlink
アカウント連携解除

---

## 🧪 テストコマンド

### ベースURL

```bash
BASE_URL="https://dev-api.heart-land.io"
```

### テスト用ユーザー情報

```bash
# 既存のテストユーザー
EMAIL="v8def90@gmail.com"
PASSWORD="test1234!"
```

---

## 1. ログインしてJWTトークンを取得

### リクエスト

```bash
curl -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq .
```

### レスポンスからJWTトークンを取得

```bash
JWT_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq -r '.data.token')

echo "JWT Token: ${JWT_TOKEN}"
```

---

## 2. POST /line/link - nonce生成とリダイレクトURL返却

### 方法A: JWT認証（推奨）

```bash
# JWTトークンを取得（上記のコマンドを実行）
JWT_TOKEN="your-jwt-token-here"
LINK_TOKEN="test-link-token-123"  # Botサーバーから提供される連携トークン（テスト用）

curl -X POST "${BASE_URL}/line/link?linkToken=${LINK_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{}' | jq .
```

### 方法B: email/password認証

```bash
LINK_TOKEN="test-link-token-123"

curl -X POST "${BASE_URL}/line/link?linkToken=${LINK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq .
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "success": true,
    "redirectUrl": "https://access.line.me/dialog/bot/accountLink?linkToken=test-link-token-123&nonce=base64EncodedNonce",
    "nonce": "base64EncodedNonce",
    "expiresAt": "2024-01-01T00:10:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### エラーケース: 既に連携済みの場合

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_LINKED",
    "message": "Account is already linked",
    "details": "This account is already linked to a LINE account"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 3. POST /line/complete-link - アカウント連携完了処理

**注意**: このエンドポイントは通常Botサーバーから呼び出されますが、テスト目的で手動実行可能です。

### リクエスト

```bash
# 上記のPOST /line/linkから取得したnonceを使用
NONCE="base64EncodedNonce"  # POST /line/linkのレスポンスから取得
LINE_USER_ID="U1234567890abcdef"  # テスト用のLINEユーザーID

curl -X POST "${BASE_URL}/line/complete-link" \
  -H "Content-Type: application/json" \
  -d "{
    \"lineUserId\": \"${LINE_USER_ID}\",
    \"nonce\": \"${NONCE}\"
  }" | jq .
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "success": true,
    "lineUserId": "U1234567890abcdef",
    "primaryDid": "did:plc:lld5wgybmddzz32guiotcpce",
    "linkedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### エラーケース: 無効なnonce

```json
{
  "success": false,
  "error": {
    "code": "INVALID_NONCE",
    "message": "Invalid or expired nonce",
    "details": "The nonce is invalid, expired, or already used"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 4. GET /line/link-status - 連携ステータス取得

### 方法A: LINEユーザーIDで検索

```bash
LINE_USER_ID="U1234567890abcdef"

curl -X GET "${BASE_URL}/line/link-status?lineUserId=${LINE_USER_ID}" \
  -H "Content-Type: application/json" | jq .
```

### 方法B: primaryDidで検索

```bash
PRIMARY_DID="did:plc:lld5wgybmddzz32guiotcpce"

curl -X GET "${BASE_URL}/line/link-status?primaryDid=${PRIMARY_DID}" \
  -H "Content-Type: application/json" | jq .
```

### 期待されるレスポンス（連携済みの場合）

```json
{
  "success": true,
  "data": {
    "isLinked": true,
    "lineUserId": "U1234567890abcdef",
    "linkedAt": "2024-01-01T00:00:00.000Z",
    "primaryDid": "did:plc:lld5wgybmddzz32guiotcpce"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 期待されるレスポンス（未連携の場合）

```json
{
  "success": true,
  "data": {
    "isLinked": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 5. DELETE /line/unlink - アカウント連携解除

**注意**: JWT認証が必要です。

### 方法A: LINEユーザーIDで解除

```bash
JWT_TOKEN="your-jwt-token-here"
LINE_USER_ID="U1234567890abcdef"

curl -X DELETE "${BASE_URL}/line/unlink?lineUserId=${LINE_USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" | jq .
```

### 方法B: primaryDidで解除

```bash
JWT_TOKEN="your-jwt-token-here"
PRIMARY_DID="did:plc:lld5wgybmddzz32guiotcpce"

curl -X DELETE "${BASE_URL}/line/unlink?primaryDid=${PRIMARY_DID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" | jq .
```

### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "success": true,
    "unlinkedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔄 完全なテストフロー

### ステップ1: ログインしてJWT取得

```bash
BASE_URL="https://dev-api.heart-land.io"
EMAIL="v8def90@gmail.com"
PASSWORD="test1234!"

JWT_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq -r '.data.token')

echo "JWT Token: ${JWT_TOKEN}"
```

### ステップ2: nonce生成とリダイレクトURL取得

```bash
LINK_TOKEN="test-link-token-123"

RESPONSE=$(curl -s -X POST "${BASE_URL}/line/link?linkToken=${LINK_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{}')

echo "${RESPONSE}" | jq .

# nonceを取得
NONCE=$(echo "${RESPONSE}" | jq -r '.data.nonce')
echo "Nonce: ${NONCE}"
```

### ステップ3: 連携ステータス確認（未連携であることを確認）

```bash
PRIMARY_DID=$(curl -s -X POST "${BASE_URL}/auth/email-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }" | jq -r '.data.did')

curl -X GET "${BASE_URL}/line/link-status?primaryDid=${PRIMARY_DID}" \
  -H "Content-Type: application/json" | jq .
```

### ステップ4: アカウント連携完了（テスト用）

```bash
LINE_USER_ID="U1234567890abcdef"

curl -X POST "${BASE_URL}/line/complete-link" \
  -H "Content-Type: application/json" \
  -d "{
    \"lineUserId\": \"${LINE_USER_ID}\",
    \"nonce\": \"${NONCE}\"
  }" | jq .
```

### ステップ5: 連携ステータス確認（連携済みであることを確認）

```bash
curl -X GET "${BASE_URL}/line/link-status?lineUserId=${LINE_USER_ID}" \
  -H "Content-Type: application/json" | jq .
```

### ステップ6: アカウント連携解除

```bash
curl -X DELETE "${BASE_URL}/line/unlink?lineUserId=${LINE_USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" | jq .
```

### ステップ7: 連携ステータス確認（解除済みであることを確認）

```bash
curl -X GET "${BASE_URL}/line/link-status?lineUserId=${LINE_USER_ID}" \
  -H "Content-Type: application/json" | jq .
```

---

## 📝 注意事項

1. **linkToken**: 実際の運用では、Botサーバーから提供される有効な連携トークンが必要です。テスト時は任意の文字列を使用できます（検証は行われません）。

2. **LINEユーザーID**: テスト時は任意の文字列（例: `U1234567890abcdef`）を使用できます。

3. **nonce有効期限**: nonceは10分間有効です。期限切れのnonceを使用するとエラーが返されます。

4. **既存連携の確認**: 既に連携済みのアカウントで再度連携を試みると、`ALREADY_LINKED`エラーが返されます。

5. **JWT認証**: `DELETE /line/unlink`エンドポイントはJWT認証が必要です。他のエンドポイントは認証不要またはオプションです。

---

## 🌐 Swagger UIでのテスト

Swagger UIを使用してインタラクティブにテストすることも可能です:

```bash
# Swagger UIを開く
open "https://dev-api.heart-land.io/docs"
```

Swagger UIでは、各エンドポイントの詳細な仕様と、リクエスト/レスポンスの例を確認できます。

---

## 🐛 トラブルシューティング

### エラー: "Authentication required"

- JWTトークンが正しく設定されているか確認
- トークンの有効期限が切れていないか確認
- `Authorization: Bearer {token}`ヘッダーが正しく設定されているか確認

### エラー: "Invalid or expired nonce"

- nonceが10分以内に使用されているか確認
- 同じnonceを複数回使用していないか確認
- nonceが正しく取得されているか確認

### エラー: "Account is already linked"

- 既に連携済みのアカウントで再度連携を試みている可能性があります
- 先に`DELETE /line/unlink`で連携を解除してから再度試してください

---

**作成者**: AI Assistant  
**最終更新**: 2025-01-09
