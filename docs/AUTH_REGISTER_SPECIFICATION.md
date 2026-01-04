# `/auth/register` エンドポイント仕様

**作成日**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`  
**対象**: メール/パスワード認証による新規ユーザー登録

---

## 📋 エンドポイント概要

### 基本情報

- **エンドポイント**: `POST /auth/register`
- **認証**: 不要（公開エンドポイント）
- **Content-Type**: `application/json`
- **説明**: メール/パスワード認証による新規ユーザー登録。PDS経由でDIDを生成し、検証メールを送信します。

---

## 📥 リクエスト仕様

### リクエストボディ

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "handle": "username"
}
```

**注意**: `handle`フィールドには**ユーザー名部分のみ**を指定してください。ドメイン部分（`pds-dev.heart-land.io`）はAPIサーバー側で自動的に付与されます。

### 必須フィールド

| フィールド    | 型     | 必須 | 説明                     |
| ------------- | ------ | ---- | ------------------------ |
| `email`       | string | ✅   | ユーザーのメールアドレス |
| `password`    | string | ✅   | ユーザーのパスワード     |
| `displayName` | string | ✅   | ユーザーの表示名         |
| `handle`      | string | ✅   | AT Protocolハンドル      |

---

## 🔑 `handle` フィールドの詳細仕様

### 概要

`handle`は**AT Protocol**で使用されるユーザー識別子のユーザー名部分です。PDSサーバー経由でアカウントを作成する際に必須です。

**重要**: `handle`フィールドには**ユーザー名部分のみ**を指定してください。ドメイン部分はAPIサーバー側で自動的に付与されます。

### 形式

```
{username}
```

APIサーバー側で自動的に以下の形式に変換されます：

```
{username}.{domain}
```

### 入力例

#### ✅ 正しい形式の例

```json
{
  "handle": "johndoe"
}
```

```json
{
  "handle": "alice"
}
```

```json
{
  "handle": "testuser123"
}
```

#### ⚠️ 既存の形式（後方互換性）

既にドメイン部分を含む形式でも動作しますが、推奨されません：

```json
{
  "handle": "johndoe.pds-dev.heart-land.io" // 動作するが、推奨されない
}
```

#### ❌ 間違った形式の例

```json
{
  "handle": "@johndoe" // @記号は不要
}
```

```json
{
  "handle": "john doe" // スペースは使用不可
}
```

```json
{
  "handle": "john@doe" // @記号は使用不可
}
```

### 形式要件

1. **ユーザー名部分**:
   - 英数字とハイフン（`-`）が使用可能
   - スペースや特殊文字（`@`など）は使用不可
   - 大文字・小文字は区別される（通常は小文字を使用）
2. **ドメイン部分**: APIサーバー側で自動付与（`PDS_ENDPOINT`環境変数から取得）

### 現在のPDSサーバー設定

- **開発環境**: `https://pds-dev.heart-land.io`
- **自動付与されるドメイン**: `pds-dev.heart-land.io`
- **最終的なハンドル形式**: `{username}.pds-dev.heart-land.io`

### ハンドルの制約

1. **一意性**: 同じPDSサーバー内で一意である必要があります
2. **長さ**: AT Protocolの仕様に準拠（通常、ユーザー名部分は3-63文字）
3. **文字種**: ユーザー名部分は英数字とハイフンのみ

---

## 📝 各フィールドの詳細仕様

### `email` フィールド

- **型**: `string`
- **必須**: ✅
- **形式**: 有効なメールアドレス形式
- **検証**:
  - メールアドレスの重複チェック
  - 正規化（小文字化、トリム）
- **例**: `"user@example.com"`

### `password` フィールド

- **型**: `string`
- **必須**: ✅
- **要件**:
  - 最小8文字
  - 大文字・小文字・数字・特殊文字のうち3種類以上を含む
  - 一般的なパスワード（`password`, `12345678`など）は拒否
- **例**: `"SecurePass123!"`

### `displayName` フィールド

- **型**: `string`
- **必須**: ✅
- **説明**: ユーザーの表示名（プロフィールに表示される名前）
- **例**: `"John Doe"`, `"Alice"`

### `handle` フィールド

- **型**: `string`
- **必須**: ✅
- **形式**: `{username}`（ドメイン部分はAPIサーバー側で自動付与）
- **説明**: AT Protocolハンドルのユーザー名部分（ドメイン部分は自動付与）
- **例**: `"johndoe"`（APIサーバー側で`"johndoe.pds-dev.heart-land.io"`に変換）

---

## 📤 レスポンス仕様

### 成功レスポンス（200 OK）

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

### エラーレスポンス（400 Bad Request）

#### バリデーションエラー

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email, password, displayName, and handle are required",
    "details": "All fields including handle are mandatory for registration"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

#### パスワード強度不足

```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Password validation failed: Password must be at least 8 characters long",
    "details": "Password validation failed: Password must be at least 8 characters long"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

#### メールアドレス重複

```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Email already registered",
    "details": "Email already registered"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

#### PDSアカウント作成失敗

```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Failed to create account via PDS",
    "details": "Provided invite code not available"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

---

## 🔄 処理フロー

```
1. リクエスト受信
   ↓
2. 必須フィールド検証
   - email, password, displayName, handle の存在確認
   ↓
3. メールアドレス正規化
   - 小文字化、トリム
   ↓
4. メールアドレス重複チェック
   - DynamoDBIdentityLookupItem で確認
   ↓
5. パスワード強度検証
   - 最小8文字、3種類以上の文字種
   ↓
6. パスワードハッシュ化
   - bcrypt（12ラウンド）
   ↓
7. PDS API呼び出し
   - com.atproto.server.createAccount
   - handle を使用してアカウント作成
   - DID生成（did:plc:...）
   ↓
8. DynamoDBUserProfileItem作成
   - PK: USER#{primaryDid}
   ↓
9. DynamoDBIdentityLinkItem作成
   - PK: USER#{primaryDid}
   - SK: LINK#email:{email}
   ↓
10. DynamoDBIdentityLookupItem作成
    - PK: LOOKUP#email:{email}
    ↓
11. 検証トークン生成
    - 24時間有効
    ↓
12. 検証メール送信
    - AWS SES経由
    ↓
13. ウェルカムメール送信
    - AWS SES経由
    ↓
14. JWTトークン生成
    - メール未認証状態でも発行
    ↓
15. レスポンス返却
```

---

## 🧪 テスト例

### 基本的な登録リクエスト

```bash
curl -X POST "https://dev-api.heart-land.io/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User",
    "handle": "testuser"
  }'
```

**注意**: `handle`にはユーザー名部分のみを指定してください。ドメイン部分（`pds-dev.heart-land.io`）はAPIサーバー側で自動的に付与されます。

### 成功レスポンス例

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6cGxjOnh4eCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiYXV0aE1ldGhvZCI6ImVtYWlsIiwiaWF0IjoxNzA0MjQwMDAwLCJleHAiOjE3MDQzMjY0MDB9...",
    "expiresIn": 86400,
    "email": "test@example.com",
    "role": "user",
    "issuedAt": "2026-01-03T00:00:00.000Z"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

### エラーレスポンス例（handle未指定）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email, password, displayName, and handle are required",
    "details": "All fields including handle are mandatory for registration"
  },
  "timestamp": "2026-01-03T00:00:00.000Z"
}
```

---

## ⚠️ 重要な注意事項

### 1. `handle`の必須性

- `handle`は**必須フィールド**です
- AT Protocolの仕様により、アカウント作成時に`handle`が必要です
- `handle`が提供されない場合、`400 Bad Request`エラーが返されます

### 2. `handle`の一意性

- 同じPDSサーバー内で`handle`は一意である必要があります
- 既に使用されている`handle`を使用すると、PDS APIからエラーが返されます
- エラーメッセージ: `"Handle already taken"` または類似のメッセージ

### 3. `handle`の形式

- **推奨形式**: `{username}`（ユーザー名部分のみ）
- **ドメイン部分**: APIサーバー側で自動付与（`PDS_ENDPOINT`環境変数から取得）
- **ユーザー名部分**: 英数字とハイフンのみ（スペース不可）
- **後方互換性**: 既にドメイン部分を含む形式でも動作しますが、推奨されません

### 4. メール認証の必須性

- 登録後、検証メールが自動的に送信されます
- **メール認証が完了していない場合、ログインできません**
- 検証メール内のリンクをクリックして認証を完了してください

### 5. パスワード要件

- 最小8文字
- 大文字・小文字・数字・特殊文字のうち3種類以上を含む
- 一般的なパスワードは拒否されます

---

## 🔍 `handle`の生成推奨方法

### フロントエンドでの生成例

```typescript
// ユーザー名からhandleを生成（ユーザー名部分のみ）
function generateHandle(username: string): string {
  // 小文字化、スペースをハイフンに変換、特殊文字を削除
  const sanitized = username
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // ユーザー名部分のみを返す（ドメイン部分はAPIサーバー側で自動付与）
  return sanitized;
}

// 使用例
const handle = generateHandle('John Doe'); // "john-doe"（APIサーバー側で"john-doe.pds-dev.heart-land.io"に変換）
const handle2 = generateHandle('Alice123'); // "alice123"（APIサーバー側で"alice123.pds-dev.heart-land.io"に変換）
```

### バリデーション例

```typescript
function validateHandle(handle: string): { valid: boolean; error?: string } {
  // 形式チェック: {username}.pds-dev.heart-land.io
  const handlePattern = /^[a-z0-9-]+\.pds-dev\.heart-land\.io$/;

  if (!handlePattern.test(handle)) {
    return {
      valid: false,
      error: 'Handle must be in format: {username}.pds-dev.heart-land.io',
    };
  }

  // ユーザー名部分の長さチェック
  const username = handle.split('.')[0];
  if (username.length < 3 || username.length > 63) {
    return {
      valid: false,
      error: 'Username part must be between 3 and 63 characters',
    };
  }

  return { valid: true };
}
```

---

## 📚 関連ドキュメント

- `EMAIL_AUTH_REGISTRATION_FLOW.md` - メール認証による初回登録フロー
- `EMAIL_VERIFICATION_REQUIREMENT.md` - メール検証の必須性
- `API_TEST_COMMANDS.md` - APIテストコマンド

---

## 🔗 関連エンドポイント

- `POST /auth/email-login` - メール/パスワードログイン
- `POST /auth/verify-email` - メール認証
- `POST /auth/resend-verification-email` - 検証メール再送信

---

**最終更新**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`
