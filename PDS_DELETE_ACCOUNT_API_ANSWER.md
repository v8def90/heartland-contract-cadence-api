# PDSアカウント削除APIの確認結果

## 質問

削除時にPDSサーバーで削除処理が必要だとして、APIで削除はできますか？

## 回答

### ✅ はい、APIで削除可能です

AT Protocolには以下の2つのアカウント削除関連のAPIが存在します：

1. **`com.atproto.server.deactivateAccount`**: アカウントを非アクティブ化（一時的な無効化）
2. **`com.atproto.server.deleteAccount`**: アカウントを完全削除

## AT Protocol API仕様

### 1. deactivateAccount（非アクティブ化）

**エンドポイント**: `POST /xrpc/com.atproto.server.deactivateAccount`

**用途**: アカウントを一時的に無効化（復元可能）

**パラメータ**:

```typescript
{
  deleteAfter?: string; // ISO 8601形式の日時（この日時以降に自動削除）
}
```

### 2. deleteAccount（完全削除）

**エンドポイント**: `POST /xrpc/com.atproto.server.deleteAccount`

**用途**: アカウントを完全に削除（不可逆）

**パラメータ**:

```typescript
{
  did: string; // User's DID (did:plc:...)
  password: string; // User's password (for verification)
}
```

**認証**: `accessJwt`が必要

## @atproto/apiでの実装

### BskyAgentでの使用方法

```typescript
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({
  service: 'https://pds-dev.heart-land.io',
});

// セッションを設定（accessJwtが必要）
agent.session = {
  did: 'did:plc:...',
  accessJwt: 'eyJhbGci...',
};

// 方法1: アカウントを非アクティブ化
await agent.com.atproto.server.deactivateAccount({
  deleteAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
});

// 方法2: アカウントを即座に削除
await agent.com.atproto.server.deleteAccount({
  did: 'did:plc:...',
  password: 'user-password',
});
```

## 実装時の考慮事項

### 1. AccessJWTの保存

現在の実装では、`createAccount`時に`accessJwt`を取得していますが、これを`IdentityLink`に保存する必要があります。

### 2. パスワードの検証

`deleteAccount`にはパスワードが必要です。以下のいずれかの方法で対応：

- **方法A**: 削除エンドポイントでパスワードを要求
- **方法B**: 管理者権限で削除（パスワード不要、ただしPDSサーバーが対応している場合）

### 3. エラーハンドリング

PDS削除が失敗した場合の処理を考慮する必要があります。

## 推奨実装

### PdsServiceにdeleteAccountメソッドを追加

```typescript
/**
 * Delete account via PDS
 *
 * @param did - User's DID
 * @param password - User's password (for verification)
 * @param accessJwt - Access JWT token for authentication
 */
public async deleteAccount(
  did: string,
  password: string,
  accessJwt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const agent = new BskyAgent({
      service: this.pdsEndpoint,
    });

    agent.session = {
      did,
      accessJwt,
    };

    await agent.com.atproto.server.deleteAccount({
      did,
      password,
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}
```

## 結論

**✅ はい、APIで削除可能です**

`@atproto/api`パッケージの`BskyAgent`を使用して、`com.atproto.server.deleteAccount` APIを呼び出すことで、PDSサーバー上のアカウントを削除できます。
