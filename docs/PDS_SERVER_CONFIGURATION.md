# PDSサーバー設定確認結果

**確認日**: 2025-12-31  
**PDSサーバーURL**: `https://pds-dev.heart-land.io`

---

## 📋 確認結果

### `describeServer` API レスポンス

```json
{
  "did": "did:web:pds-dev.heart-land.io",
  "availableUserDomains": [".pds-dev.heart-land.io"],
  "inviteCodeRequired": true,
  "links": {},
  "contact": {}
}
```

### 重要な設定

1. **`inviteCodeRequired: true`** ⚠️
   - アカウント作成時に**招待コード（inviteCode）が必要**
   - `createAccount` APIを呼び出す際に`inviteCode`パラメータを送信する必要がある

2. **`phoneVerificationRequired`が未設定**
   - レスポンスに`phoneVerificationRequired`フィールドが含まれていない
   - 電話番号検証は**不要**と判断

3. **利用可能なドメイン**
   - `.pds-dev.heart-land.io`が利用可能
   - ハンドル形式: `username.pds-dev.heart-land.io`

---

## 🔧 必要な修正

### 1. `inviteCode`パラメータの追加

`createAccount` APIを呼び出す際に、`inviteCode`パラメータを追加する必要があります。

**選択肢**:

- **オプションA**: `inviteCode`を必須パラメータにする
- **オプションB**: `inviteCode`をオプションパラメータにして、環境変数から取得する
- **オプションC**: 開発環境用のデフォルト`inviteCode`を設定する

### 2. `handle`パラメータの必須化

AT Protocolの仕様では`handle`は必須です。現在の実装ではオプションになっているため、必須に変更する必要があります。

---

## ❓ 確認事項

### 1. 招待コード（inviteCode）の扱い

- **開発環境用の招待コードはありますか？**
- 招待コードを環境変数で管理しますか？
- それとも、ユーザー登録時にリクエストで受け取りますか？

### 2. ハンドル（handle）の扱い

- **`handle`は必須にしますか？**
- 自動生成する場合、どの形式にしますか？（例: `user-{timestamp}-{random}.pds-dev.heart-land.io`）

### 3. 環境変数の設定

- `.env`ファイルに`PDS_INVITE_CODE`を追加しますか？
- それとも、`serverless.yml`のデフォルト値で管理しますか？

---

## 📝 推奨される実装

### オプション1: 環境変数で招待コードを管理（推奨）

```typescript
// PdsService.ts
private readonly inviteCode: string | undefined;

private constructor() {
  this.pdsEndpoint = process.env.PDS_ENDPOINT || 'https://pds-dev.heart-land.io';
  this.inviteCode = process.env.PDS_INVITE_CODE; // 環境変数から取得
  // ...
}

public async createAccount(
  email: string,
  password: string,
  handle: string, // 必須に変更
  inviteCode?: string // オプション（環境変数から取得した値を使用）
): Promise<PdsAccountResult> {
  const createAccountParams: any = {
    email,
    password,
    handle, // 必須
    inviteCode: inviteCode || this.inviteCode, // 環境変数または引数から取得
  };
  // ...
}
```

### オプション2: リクエストで招待コードを受け取る

```typescript
// EmailPasswordRegisterRequest
export interface EmailPasswordRegisterRequest {
  email: string;
  password: string;
  displayName: string;
  handle: string; // 必須に変更
  inviteCode?: string; // オプション
}
```

---

**最終更新**: 2025-12-31  
**状態**: 設定確認完了、修正待ち
