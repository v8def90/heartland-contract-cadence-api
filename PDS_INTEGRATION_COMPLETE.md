# PDSサーバー統合完了

**完了日**: 2025-12-31  
**PDSサーバーURL**: `https://pds-dev.heart-land.io`

---

## ✅ 実施した修正

### 1. PDSエンドポイントの設定

- `serverless.yml`に`PDS_ENDPOINT`環境変数を追加
- デフォルト値: `https://pds-dev.heart-land.io`
- `PdsService.ts`のデフォルトエンドポイントを更新

### 2. 招待コード（inviteCode）の対応

- `PdsService.ts`に`defaultInviteCode`プロパティを追加
- 環境変数`PDS_INVITE_CODE`から招待コードを取得
- `createAccount`メソッドで`inviteCode`を自動的に送信
- 招待コードが未設定の場合はエラーを返す

### 3. ハンドル（handle）の必須化

- `EmailPasswordRegisterRequest`の`handle`を必須に変更
- `PdsService.createAccount`の`handle`パラメータを必須に変更
- `UserAuthService.registerWithEmailPassword`で`handle`のバリデーションを追加
- `AuthController.register`で`handle`のバリデーションを追加

### 4. 環境変数の追加

- `serverless.yml`に`PDS_INVITE_CODE`環境変数を追加

---

## 📋 環境変数の設定

### `.env`ファイルに追加

```bash
# PDS Configuration
PDS_ENDPOINT=https://pds-dev.heart-land.io
PDS_TIMEOUT=30000
PDS_INVITE_CODE=pds-dev-heart-land-io-j7itf-uabze
```

**注意**: 最初の招待コードを設定してください。使用済みになったら、次の招待コードに変更してください。

### 利用可能な招待コード

以下の招待コードが利用可能です：

1. `pds-dev-heart-land-io-j7itf-uabze`
2. `pds-dev-heart-land-io-l56nn-t65m2`
3. `pds-dev-heart-land-io-3t6gg-kkvi2`
4. `pds-dev-heart-land-io-svtti-fuwpx`
5. `pds-dev-heart-land-io-2h6sl-zj7nt`
6. `pds-dev-heart-land-io-dvt4c-dvkbn`
7. `pds-dev-heart-land-io-dhc7u-anxgi`
8. `pds-dev-heart-land-io-nvtf4-2edrx`
9. `pds-dev-heart-land-io-xmr3o-wnqrw`
10. `pds-dev-heart-land-io-clh54-pgoi3`

**招待コードが足りなくなったら、追加の招待コードを生成してください。**

---

## 🔧 実装詳細

### PdsService.ts

```typescript
// 環境変数から招待コードを取得
private readonly defaultInviteCode: string | undefined;

private constructor() {
  this.pdsEndpoint = process.env.PDS_ENDPOINT || 'https://pds-dev.heart-land.io';
  this.defaultInviteCode = process.env.PDS_INVITE_CODE;
  // ...
}

// createAccountメソッドで招待コードを使用
public async createAccount(
  email: string,
  password: string,
  handle: string, // 必須
  inviteCode?: string // オプション（環境変数から取得した値を使用）
): Promise<PdsAccountResult> {
  const finalInviteCode = inviteCode || this.defaultInviteCode;
  if (!finalInviteCode) {
    return {
      success: false,
      error: 'Invite code is required for account creation.',
    };
  }
  // ...
}
```

### EmailPasswordRegisterRequest

```typescript
export interface EmailPasswordRegisterRequest {
  email: string;
  password: string;
  displayName: string;
  handle: string; // 必須に変更
}
```

---

## 🧪 テスト方法

### 1. ユーザー登録のテスト

```bash
curl -X POST https://your-api-endpoint/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "displayName": "Test User",
    "handle": "testuser.pds-dev.heart-land.io"
  }'
```

### 2. ハンドルの形式

- 形式: `username.pds-dev.heart-land.io`
- 例: `alice.pds-dev.heart-land.io`
- 利用可能なドメイン: `.pds-dev.heart-land.io`

---

## ⚠️ 注意事項

### 1. 招待コードの管理

- 招待コードは1回の使用で消費されます
- 10個の招待コードが利用可能です
- 足りなくなったら、追加の招待コードを生成してください

### 2. ハンドルの形式

- ハンドルは`.pds-dev.heart-land.io`ドメインを使用する必要があります
- ハンドルは必須パラメータです
- ユーザー登録時に適切なハンドルを指定してください

### 3. 環境変数の設定

- `.env`ファイルに`PDS_INVITE_CODE`を設定してください
- Lambda関数にも環境変数が渡されるように`serverless.yml`を設定済みです

---

## 📝 次のステップ

1. `.env`ファイルに`PDS_INVITE_CODE`を追加
2. ビルドとデプロイ
3. ユーザー登録エンドポイントのテスト
4. 招待コードの使用状況を監視

---

**最終更新**: 2025-12-31  
**状態**: 統合完了、テスト待ち
