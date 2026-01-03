# PDSアカウント削除時のpasswordとtokenの仕様

## 概要

`com.atproto.server.deleteAccount`を使用してアカウントを削除する際、以下のパラメータが必要です：

```typescript
{
  did: string;      // 削除対象のDID
  password: string; // ユーザーのアカウントパスワード
  token: string;    // 削除トークン（requestAccountDeleteで取得）
}
```

## passwordパラメータ

### 意味
- **ユーザーが登録時に設定したアカウントのパスワード**
- セキュリティ上の理由から、削除時にパスワードの確認が必要
- PDSサーバーがアカウント削除のリクエストを認証するために使用

### 取得方法
- ユーザーが削除エンドポイント（`DELETE /sns/users/{did}`）を呼び出す際に、リクエストボディでパスワードを提供する必要がある
- 現在の実装では、パスワードはハッシュ化して保存されているため、元のパスワードは取得できない
- **解決策**: 削除エンドポイントでパスワードを要求する

### 実装例
```typescript
// UsersController.deleteUserProfile
@Delete('users/{did}')
public async deleteUserProfile(
  @Path() did: string,
  @Body() request: { password: string } // パスワードを要求
): Promise<ApiResponse<void>> {
  // ...
  await this.pdsService.deleteAccount(did, request.password, accessJwt, token);
}
```

## tokenパラメータ

### 意味
- **削除トークン（Deletion Token）**
- `com.atproto.server.requestAccountDelete`エンドポイントで取得
- アカウント削除を認証するための一時的なトークン

### 取得方法

#### 1. requestAccountDeleteエンドポイントを呼び出す
```typescript
// PdsService.requestAccountDelete
public async requestAccountDelete(
  accessJwt: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  // セッションを設定
  agent.session = {
    did: userDid,
    accessJwt: accessJwt,
  };

  // 削除トークンをリクエスト
  const response = await agent.com.atproto.server.requestAccountDelete();
  
  return {
    success: true,
    token: response.data.token, // 削除トークン
  };
}
```

#### 2. 削除トークンの取得フロー
1. ユーザーがアカウント削除をリクエスト
2. `requestAccountDelete`を呼び出して削除トークンを取得
3. 削除トークンをユーザーに通知（メールなど）
4. ユーザーが削除トークンとパスワードを提供して`deleteAccount`を実行

### 実装例
```typescript
// PdsService.deleteAccount
public async deleteAccount(
  did: string,
  password: string,
  token: string,
  accessJwt: string
): Promise<{ success: boolean; error?: string }> {
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
    token,
  });

  return { success: true };
}
```

## 管理者権限での削除（代替案）

### com.atproto.admin.deleteAccount

管理者権限で削除する場合、`password`と`token`は不要です：

```typescript
// com.atproto.admin.deleteAccountのInputSchema
{
  did: string; // didのみ必要
}
```

### 使用方法
```typescript
// PdsService.deleteAccount (管理者権限版)
public async deleteAccount(
  did: string,
  accessJwt: string // 管理者のaccessJwt
): Promise<{ success: boolean; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  agent.session = {
    did: adminDid,
    accessJwt: adminAccessJwt, // 管理者のJWT
  };

  await agent.com.atproto.admin.deleteAccount({
    did,
  });

  return { success: true };
}
```

### 注意点
- 管理者権限が必要
- PDSサーバーが管理者権限での削除をサポートしている必要がある
- 現在の実装では、ユーザーの`accessJwt`を使用しているため、管理者権限ではない可能性がある

## 現在の実装での課題

### 1. passwordの取得
- 現在の実装では、パスワードはハッシュ化して保存されている
- 元のパスワードは取得できない
- **解決策**: 削除エンドポイントでパスワードを要求する

### 2. tokenの取得
- 現在の実装では、`requestAccountDelete`を呼び出していない
- 削除トークンを取得していない
- **解決策**: 削除前に`requestAccountDelete`を呼び出してトークンを取得する

### 3. 管理者権限の確認
- 現在の実装では、ユーザーの`accessJwt`を使用している
- 管理者権限があるかどうか不明
- **解決策**: `com.atproto.admin.deleteAccount`を使用するか、管理者権限を確認する

## 推奨される実装方法

### 方法1: ユーザー認証による削除（推奨）

```typescript
// 1. 削除エンドポイントでパスワードを要求
@Delete('users/{did}')
public async deleteUserProfile(
  @Path() did: string,
  @Body() request: { password: string }
): Promise<ApiResponse<void>> {
  // 2. 削除トークンをリクエスト
  const tokenResult = await this.pdsService.requestAccountDelete(
    accessJwt
  );
  
  if (!tokenResult.success || !tokenResult.token) {
    return {
      success: false,
      error: {
        code: 'PDS_DELETION_TOKEN_ERROR',
        message: 'Failed to get deletion token',
      },
    };
  }

  // 3. アカウントを削除
  const deleteResult = await this.pdsService.deleteAccount(
    did,
    request.password,
    tokenResult.token,
    accessJwt
  );
  
  // ...
}
```

### 方法2: 管理者権限による削除

```typescript
// PdsService.deleteAccount (管理者権限版)
public async deleteAccount(
  did: string,
  adminAccessJwt: string // 管理者のJWT
): Promise<{ success: boolean; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  agent.session = {
    did: adminDid,
    accessJwt: adminAccessJwt,
  };

  try {
    await agent.com.atproto.admin.deleteAccount({
      did,
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

## まとめ

### password
- **意味**: ユーザーが登録時に設定したアカウントのパスワード
- **取得方法**: 削除エンドポイントでユーザーに要求する

### token
- **意味**: 削除トークン（`com.atproto.server.requestAccountDelete`で取得）
- **取得方法**: 削除前に`requestAccountDelete`を呼び出してトークンを取得

### 代替案
- **管理者権限での削除**: `com.atproto.admin.deleteAccount`を使用すると、`password`と`token`は不要（`did`のみ必要）

