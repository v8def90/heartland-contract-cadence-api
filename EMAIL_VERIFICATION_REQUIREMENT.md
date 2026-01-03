# メール検証の必須性とログイン制限

**作成日**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`  
**対象**: メール/パスワード認証におけるメール検証の必須性

---

## ❓ 質問

**アカウントが存在していて、メール検証が`false`だった場合は、ログインできますか？**

## ✅ 回答

**いいえ、ログインできません。**

メール検証が完了していない（`emailVerified: false`）アカウントでは、ログインが拒否されます。

---

## 🔍 実装詳細

### ログイン処理の流れ

`POST /auth/email-login`エンドポイントでは、以下の順序でチェックが行われます：

1. **リクエスト検証** - メールアドレスとパスワードが提供されているか
2. **ユーザー存在確認** - メールアドレスに対応するアカウントが存在するか
3. **アカウントロック確認** - アカウントが一時的にロックされていないか
4. **パスワード検証** - パスワードが正しいか
5. **メール検証状態チェック** ⚠️ **（ここで拒否される）**
6. **JWTトークン生成** - すべてのチェックを通過した場合のみ

### コード実装

```typescript:395:401:src/services/UserAuthService.ts
// Check email verification (required)
if (!identityLink.emailVerified) {
  return {
    success: false,
    error: 'EMAIL_NOT_VERIFIED',
  };
}
```

**重要なポイント**:

- パスワード検証は**メール検証チェックの前**に行われます
- パスワードが正しくても、メール検証が完了していない場合はログインできません
- エラーコードは`EMAIL_NOT_VERIFIED`として返されます

---

## 📋 エラーレスポンス

### HTTPステータスコード

**403 Forbidden** - メール未検証によるログイン拒否

### レスポンスボディ

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

### エラーハンドリング実装

```typescript:1003:1014:src/controllers/auth/AuthController.ts
if (!result.success) {
  if (result.error === 'EMAIL_NOT_VERIFIED') {
    this.setStatus(403);
    return {
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'メールアドレスの認証が必要です',
        details:
          'メールアドレスの認証を完了してください。認証メールを確認してください。',
      },
      timestamp: new Date().toISOString(),
    };
  }
  // ... その他のエラー処理
}
```

---

## 🔄 ログイン処理の完全なフロー

```
┌─────────────────────┐
│ POST /auth/email-login │
│ {email, password}      │
└──────────┬────────────┘
           │
           ▼
┌─────────────────────┐
│ 1. リクエスト検証    │
│    - email存在？     │
│    - password存在？  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. ユーザー存在確認  │
│    - メールで検索     │
│    - アカウント存在？│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. アカウントロック  │
│    - lockUntil確認   │
│    - ロック中？      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. パスワード検証    │
│    - bcrypt検証      │
│    - 正しい？        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. メール検証チェック│ ⚠️
│    - emailVerified？ │
│    - false → 拒否    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. JWTトークン生成   │
│    - トークン発行    │
│    - ログイン成功    │
└─────────────────────┘
```

---

## 🧪 テストシナリオ

### シナリオ1: メール未検証アカウントでのログイン試行

**前提条件**:

- アカウントが存在する（`POST /auth/register`で登録済み）
- メール検証が完了していない（`emailVerified: false`）
- パスワードは正しい

**リクエスト**:

```bash
curl -X POST "https://dev-api.heart-land.io/auth/email-login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**レスポンス**:

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

**HTTPステータスコード**: `403 Forbidden`

### シナリオ2: メール検証完了後のログイン

**前提条件**:

- アカウントが存在する
- メール検証が完了している（`emailVerified: true`）
- パスワードは正しい

**リクエスト**:

```bash
curl -X POST "https://dev-api.heart-land.io/auth/email-login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

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

**HTTPステータスコード**: `200 OK`

---

## ⚠️ 重要な注意事項

### 1. パスワード検証とメール検証の順序

- パスワード検証は**メール検証チェックの前**に行われます
- これは、セキュリティ上の理由（ブルートフォース攻撃の防止）と、ユーザー体験の両方を考慮した設計です
- パスワードが間違っている場合は、メール検証状態に関係なく`401 Unauthorized`が返されます

### 2. エラーコードの違い

| エラーコード           | HTTPステータス   | 意味                                                 |
| ---------------------- | ---------------- | ---------------------------------------------------- |
| `EMAIL_NOT_VERIFIED`   | 403 Forbidden    | メール検証が完了していない                           |
| `AUTHENTICATION_ERROR` | 401 Unauthorized | パスワードが間違っている、またはユーザーが存在しない |
| `VALIDATION_ERROR`     | 400 Bad Request  | リクエストが不正（メールまたはパスワードが未提供）   |

### 3. メール検証の完了方法

メール検証を完了するには：

1. 登録時に送信された検証メールを確認
2. メール内のリンクをクリック
3. フロントエンドページから`POST /auth/verify-email`を呼び出し
4. 検証完了後、再度ログインを試行

### 4. 検証メールの再送信

検証メールが届かない場合や期限切れの場合は：

```bash
curl -X POST "https://dev-api.heart-land.io/auth/resend-verification-email" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryDid": "did:plc:xxxxxxxxxxxxxxxxxxxx",
    "email": "user@example.com"
  }'
```

---

## 📊 状態遷移図

```
┌─────────────┐
│  未登録      │
└──────┬──────┘
       │
       │ POST /auth/register
       ▼
┌─────────────┐
│ 登録済み     │
│ emailVerified│
│ = false      │
└──────┬──────┘
       │
       │ POST /auth/email-login
       │ → 403 EMAIL_NOT_VERIFIED
       │
       │ POST /auth/verify-email
       ▼
┌─────────────┐
│ メール検証済み│
│ emailVerified│
│ = true       │
└──────┬──────┘
       │
       │ POST /auth/email-login
       │ → 200 OK (JWT発行)
       ▼
┌─────────────┐
│ ログイン成功 │
└─────────────┘
```

---

## 🔐 セキュリティ上の考慮事項

### 1. メール検証の必須性

メール検証を必須にすることで：

- ✅ メールアドレスの所有権を確認
- ✅ 不正なアカウント作成を防止
- ✅ スパムアカウントの作成を抑制
- ✅ パスワードリセット機能の安全性を確保

### 2. エラーメッセージの設計

メール未検証の場合、エラーメッセージには：

- ✅ 明確なエラーコード（`EMAIL_NOT_VERIFIED`）
- ✅ ユーザー向けの日本語メッセージ
- ✅ 次のアクション（メール確認）の指示
- ✅ 適切なHTTPステータスコード（403）

これにより、ユーザーは何をすべきか明確に理解できます。

---

## 📚 関連エンドポイント

- `POST /auth/register` - ユーザー登録（検証メール自動送信）
- `POST /auth/verify-email` - メール認証
- `POST /auth/email-login` - ログイン（メール検証必須）
- `POST /auth/resend-verification-email` - 検証メール再送信

---

**最終更新**: 2026-01-03  
**APIエンドポイント**: `https://dev-api.heart-land.io`
