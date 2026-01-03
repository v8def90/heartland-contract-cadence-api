# メール検証URLの設定オプション

**作成日**: 2026-01-02  
**目的**: メール検証URLをフロントエンドサーバーとAPIサーバーのどちらに設定するか

---

## 📋 現在の実装

### 検証メールのURL形式

現在、`EmailService.sendVerificationEmail`では以下の形式でURLを生成しています：

```
${FRONTEND_URL}/auth/verify-email?token=${token}&did=${primaryDid}
```

現在の`FRONTEND_URL`: `https://app.example.com`（デフォルト値）

### APIエンドポイント

`POST /auth/verify-email`エンドポイントが実装済みです。

---

## 🔄 選択肢

### オプション1: フロントエンドサーバーを使用（現在の実装）

**URL形式**:

```
https://your-frontend.com/auth/verify-email?token=xxx&did=xxx
```

**メリット**:

- ✅ ユーザー体験が良い（検証成功/失敗ページを表示可能）
- ✅ ブランディングやデザインを統一できる
- ✅ 検証後のリダイレクト先を柔軟に設定可能

**デメリット**:

- ⚠️ フロントエンドサーバーが必要
- ⚠️ フロントエンドでAPIを呼び出す実装が必要

**実装例（フロントエンド側）**:

```typescript
// フロントエンドで検証処理
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const did = params.get('did');

const response = await fetch('https://api.example.com/auth/verify-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, primaryDid: did }),
});

if (response.ok) {
  // 検証成功ページを表示
} else {
  // 検証失敗ページを表示
}
```

---

### オプション2: APIサーバーのURLを使用（推奨：シンプル）

**URL形式**:

```
https://dev-api.heart-land.io/auth/verify-email?token=xxx&did=xxx
```

**メリット**:

- ✅ フロントエンドサーバー不要
- ✅ シンプルな実装
- ✅ 直接APIエンドポイントにアクセス可能

**デメリット**:

- ⚠️ ユーザー体験が劣る（JSONレスポンスのみ）
- ⚠️ 検証成功/失敗の表示が難しい

**実装変更**:

```typescript
// EmailService.ts
public async sendVerificationEmail(
  email: string,
  token: string,
  primaryDid: string
): Promise<void> {
  // APIサーバーのURLを使用
  const apiUrl = process.env.API_BASE_URL || 'https://dev-api.heart-land.io';
  const verificationUrl = `${apiUrl}/auth/verify-email?token=${token}&did=${primaryDid}`;
  // ...
}
```

---

### オプション3: ハイブリッド方式（推奨：バランス型）

**URL形式**:

```
https://your-frontend.com/auth/verify-email?token=xxx&did=xxx
```

**フロー**:

1. ユーザーがフロントエンドのURLにアクセス
2. フロントエンドがAPIを呼び出して検証
3. 検証成功後、フロントエンドで成功ページを表示
4. 検証失敗時、エラーページを表示

**メリット**:

- ✅ ユーザー体験が良い
- ✅ APIサーバーとフロントエンドの役割が明確
- ✅ 検証後のリダイレクト先を柔軟に設定可能

**デメリット**:

- ⚠️ フロントエンドサーバーが必要

---

## 💡 推奨される実装

### 開発環境: APIサーバーのURLを使用

開発環境では、フロントエンドサーバーがまだない可能性があるため、APIサーバーのURLを使用することを推奨します。

**環境変数の設定**:

```bash
# .env
FRONTEND_URL=https://dev-api.heart-land.io
# または
API_BASE_URL=https://dev-api.heart-land.io
```

### 本番環境: フロントエンドサーバーのURLを使用

本番環境では、フロントエンドサーバーを使用して、より良いユーザー体験を提供することを推奨します。

**環境変数の設定**:

```bash
# .env (production)
FRONTEND_URL=https://app.heart-land.io
```

---

## 🔧 実装変更方法

### 方法1: FRONTEND_URLをAPIサーバーのURLに変更

```bash
# AWS CLIで環境変数を更新
aws lambda update-function-configuration \
  --function-name heartland-api-v3-dev-app \
  --profile AWSAdministratorAccess-925271162067 \
  --region ap-northeast-1 \
  --environment "Variables={
    $(aws lambda get-function-configuration \
      --function-name heartland-api-v3-dev-app \
      --profile AWSAdministratorAccess-925271162067 \
      --region ap-northeast-1 \
      --query 'Environment.Variables' \
      --output json | \
      python3 -c "import sys, json; env = json.load(sys.stdin); env['FRONTEND_URL'] = 'https://dev-api.heart-land.io'; print(','.join([f'{k}={v}' for k, v in env.items()]))")
  }"
```

### 方法2: EmailServiceを修正してAPI_BASE_URLを使用

`EmailService.ts`を修正して、`API_BASE_URL`環境変数を使用するように変更：

```typescript
private constructor() {
  // ...
  const apiUrl = process.env.API_BASE_URL || process.env.FRONTEND_URL || 'https://app.example.com';
  this.frontendUrl = apiUrl;
}
```

---

## 📝 現在のAPIエンドポイント

**検証エンドポイント**:

- URL: `POST https://dev-api.heart-land.io/auth/verify-email`
- リクエストボディ:
  ```json
  {
    "token": "verification-token",
    "primaryDid": "did:plc:xxx"
  }
  ```
- レスポンス:
  ```json
  {
    "success": true,
    "data": {
      "email": "user@example.com",
      "verified": true
    }
  }
  ```

---

## ❓ 確認事項

1. **フロントエンドサーバーはありますか？**
   - ある場合: フロントエンドのURLを使用
   - ない場合: APIサーバーのURLを使用

2. **開発環境と本番環境で異なる設定にしますか？**
   - 開発環境: APIサーバーのURL
   - 本番環境: フロントエンドのURL

3. **検証後のリダイレクト先は必要ですか？**
   - 必要: フロントエンドサーバーを使用
   - 不要: APIサーバーのURLで十分

---

**最終更新**: 2026-01-02  
**状態**: 選択待ち
