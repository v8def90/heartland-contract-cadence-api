# PDSアカウント削除APIの確認

## 質問

削除時にPDSサーバーで削除処理が必要だとして、APIで削除はできますか？

## 確認結果

### ✅ はい、APIで削除可能です

AT Protocolには`com.atproto.server.deleteAccount`というAPIエンドポイントが存在し、`@atproto/api`パッケージの`BskyAgent`から利用可能です。

## AT Protocol API仕様

### エンドポイント

- **Method**: `POST`
- **Path**: `/xrpc/com.atproto.server.deleteAccount`
- **Authentication**: Required (accessJwt)

### リクエストパラメータ

```typescript
{
  did: string; // User's DID (did:plc:...)
  password: string; // User's password (for verification)
}
```

### レスポンス

- **Success**: 204 No Content
- **Error**: 400 Bad Request, 401 Unauthorized, etc.

## @atproto/apiでの実装

### BskyAgentのメソッド

`BskyAgent`には`deleteAccount`メソッドが存在します：

```typescript
agent.com.atproto.server.deleteAccount({
  did: string,
  password: string,
});
```

### 実装例

```typescript
import { BskyAgent } from '@atproto/api';

// 1. BskyAgentインスタンスを作成
const agent = new BskyAgent({
  service: 'https://pds-dev.heart-land.io',
});

// 2. セッションを設定（accessJwtが必要）
agent.session = {
  did: 'did:plc:...',
  accessJwt: 'eyJhbGci...',
};

// 3. アカウントを削除
await agent.com.atproto.server.deleteAccount({
  did: 'did:plc:...',
  password: 'user-password',
});
```

## 注意点

### 1. 認証が必要

- `accessJwt`が必要です
- セッションを設定する必要があります

### 2. パスワード検証

- 削除時にパスワードの確認が必要です
- セキュリティ上の理由から、パスワードを提供する必要があります

### 3. 不可逆的操作

- アカウント削除は不可逆です
- 削除後は同じDIDで再登録できません（新しいDIDが生成されます）

## 実装時の考慮事項

### AccessJWTの保存

現在の実装では、`createAccount`時に`accessJwt`と`refreshJwt`を取得していますが、これらを`IdentityLink`に保存していない可能性があります。

```typescript
// PdsService.createAccount()の戻り値
{
  success: true,
  did: 'did:plc:...',
  accessJwt: 'eyJhbGci...', // これを保存する必要がある
  refreshJwt: 'eyJhbGci...',
  handle: 'username.pds-dev.heart-land.io',
}
```

### パスワードの取得

削除時にパスワードが必要ですが、現在の実装ではパスワードをハッシュ化して保存しているため、元のパスワードは取得できません。

**解決策**:

1. 削除エンドポイントでパスワードを要求する
2. または、管理者権限で削除する（パスワード不要）

## 推奨実装

### PdsServiceにdeleteAccountメソッドを追加

```typescript
/**
 * Delete account via PDS
 *
 * @description Deletes an account on the PDS server.
 * Requires authentication (accessJwt) and password verification.
 *
 * @param did - User's DID
 * @param password - User's password (for verification)
 * @param accessJwt - Access JWT token for authentication
 * @returns Promise with deletion result
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

    // Set session with accessJwt
    agent.session = {
      did,
      accessJwt,
    };

    // Delete account via PDS
    await agent.com.atproto.server.deleteAccount({
      did,
      password,
    });

    return { success: true };
  } catch (error: any) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error?.data?.error) {
      errorMessage = error.data.error;
    } else if (error?.data?.message) {
      errorMessage = error.data.message;
    }

    console.error('PDS deleteAccount error:', {
      message: errorMessage,
      error: error,
      data: error?.data,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

### SnsService.deleteUserProfile()から呼び出す

```typescript
async deleteUserProfile(userId: string, password?: string): Promise<void> {
  // 1. プロフィールを論理削除
  await this.softDeleteProfile(userId);

  // 2. PDSアカウントを削除
  const identityLinks = await this.queryIdentityLinks(userId);
  const emailLink = identityLinks.find(
    link => link.linkedId.startsWith('email:')
  );

  if (emailLink && emailLink.accessJwt && password) {
    // PDSアカウントを削除
    const pdsService = PdsService.getInstance();
    const deleteResult = await pdsService.deleteAccount(
      userId,
      password,
      emailLink.accessJwt
    );

    if (!deleteResult.success) {
      console.error('Failed to delete PDS account:', deleteResult.error);
      // エラーをログに記録（DynamoDBの削除は既に完了しているため）
    }
  } else {
    console.warn('Cannot delete PDS account: missing accessJwt or password');
  }

  // 3. その他の関連データの削除/匿名化
  // ...
}
```

## 結論

**✅ はい、APIで削除可能です**

`@atproto/api`パッケージの`BskyAgent`を使用して、`com.atproto.server.deleteAccount` APIを呼び出すことで、PDSサーバー上のアカウントを削除できます。

ただし、実装時には以下を考慮する必要があります：

1. `accessJwt`の保存と取得
2. パスワードの検証（削除エンドポイントで要求するか、管理者権限で削除するか）
3. エラーハンドリング（PDS削除が失敗した場合の処理）
