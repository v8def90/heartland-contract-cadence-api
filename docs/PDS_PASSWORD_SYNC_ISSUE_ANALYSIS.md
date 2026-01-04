# PDSパスワード同期の問題分析

## 問題の指摘

ユーザーから指摘された重要な問題：

> 方法1において、要求されるパスワードはアカウント作成時のパスワードですよね？
> それだと削除時にユーザのパスワードを要求したとしても、ユーザがAPIでパスワード変更した場合などは、PDSアカウントのパスワードと一致しないのではないでしょうか？

## 問題の詳細

### 現在の実装状況

1. **アカウント作成時**:
   - API側: パスワードをハッシュ化してDynamoDBの`IdentityLink`に保存
   - PDS側: パスワードをそのままPDSサーバーに送信（`PdsService.createAccount`）

2. **パスワード変更時** (`UserAuthService.changePassword`):
   - API側: DynamoDBの`IdentityLink`の`passwordHash`を更新 ✅
   - PDS側: **パスワードを更新していない** ❌

3. **パスワードリセット時** (`UserAuthService.resetPassword`):
   - API側: DynamoDBの`IdentityLink`の`passwordHash`を更新 ✅
   - PDS側: **パスワードを更新していない** ❌

### 問題の影響

- ユーザーがAPI経由でパスワードを変更した場合、PDSサーバー側のパスワードは古いまま
- 削除時にユーザーが提供するパスワード（新しいパスワード）とPDSサーバー側のパスワード（古いパスワード）が一致しない
- `com.atproto.server.deleteAccount`が失敗する可能性が高い

## 解決策

### 解決策1: パスワード変更時にPDSサーバー側も更新（推奨）

パスワード変更時に、PDSサーバー側のパスワードも同期して更新する。

#### AT Protocol APIの確認

`com.atproto.server.resetPassword`が利用可能か確認：

```typescript
// com.atproto.server.resetPasswordのInputSchema（推測）
{
  token: string;      // リセットトークン
  password: string;   // 新しいパスワード
}
```

ただし、これはパスワードリセット用で、パスワード変更用ではない可能性があります。

#### 実装方法

```typescript
// UserAuthService.changePassword
public async changePassword(
  primaryDid: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // ... 既存のパスワード検証とハッシュ化 ...

  // 1. API側のパスワードを更新
  await this.snsService.updateIdentityLink(
    primaryDid,
    identityLink.linkedId,
    {
      passwordHash,
      passwordUpdatedAt: new Date().toISOString(),
      failedLoginCount: 0,
    }
  );

  // 2. PDSサーバー側のパスワードも更新
  const identityLinks = await this.snsService.queryIdentityLinks(primaryDid);
  const pdsLink = identityLinks.find(link => link.pdsAccessJwt);
  
  if (pdsLink?.pdsAccessJwt) {
    const pdsService = PdsService.getInstance();
    const updateResult = await pdsService.updatePassword(
      primaryDid,
      currentPassword, // 現在のパスワード（PDSサーバー側の検証用）
      newPassword,     // 新しいパスワード
      pdsLink.pdsAccessJwt
    );
    
    if (!updateResult.success) {
      // PDS更新に失敗した場合の処理
      console.error('Failed to update PDS password:', updateResult.error);
      // ロールバックするか、警告を記録するか
    }
  }

  return { success: true };
}
```

#### PdsService.updatePasswordの実装

```typescript
// PdsService.updatePassword
public async updatePassword(
  did: string,
  currentPassword: string,
  newPassword: string,
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

    // AT Protocolのパスワード更新APIを呼び出す
    // 注意: 実際のAPI名を確認する必要がある
    await agent.com.atproto.server.updatePassword({
      currentPassword,
      newPassword,
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

**課題**: AT Protocolにパスワード変更用のAPIが存在するか確認が必要

### 解決策2: 管理者権限での削除を使用（推奨）

`com.atproto.admin.deleteAccount`を使用すると、`password`と`token`は不要です。

#### 利点
- パスワード同期の問題を回避できる
- 実装が簡単
- ユーザーにパスワードを要求する必要がない

#### 課題
- 管理者権限が必要
- PDSサーバーが管理者権限での削除をサポートしている必要がある
- 現在の実装では、ユーザーの`accessJwt`を使用しているため、管理者権限ではない可能性がある

#### 実装方法

```typescript
// PdsService.deleteAccount (管理者権限版)
public async deleteAccount(
  did: string,
  adminAccessJwt: string // 管理者のaccessJwt
): Promise<{ success: boolean; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  agent.session = {
    did: adminDid,
    accessJwt: adminAccessJwt,
  };

  await agent.com.atproto.admin.deleteAccount({
    did,
  });

  return { success: true };
}
```

### 解決策3: deactivateAccountを使用

`com.atproto.server.deactivateAccount`を使用すると、パスワードは不要です。

#### 利点
- パスワード同期の問題を回避できる
- 実装が簡単
- ユーザーにパスワードを要求する必要がない

#### 課題
- アカウントは完全削除ではなく、非アクティブ化される
- `deleteAfter`を指定して自動削除を設定できるが、即座の削除ではない可能性がある

#### 実装方法

```typescript
// PdsService.deleteAccount (deactivateAccount版)
public async deleteAccount(
  did: string,
  accessJwt: string
): Promise<{ success: boolean; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  agent.session = {
    did,
    accessJwt,
  };

  // 即座に削除するために、現在時刻を指定
  await agent.com.atproto.server.deactivateAccount({
    deleteAfter: new Date().toISOString(),
  });

  return { success: true };
}
```

## 推奨される解決策

### 短期的な解決策（即座に実装可能）

**解決策3: `deactivateAccount`を使用**

- パスワード同期の問題を回避
- 実装が簡単
- 既にフォールバックとして実装されている

### 長期的な解決策（理想的な実装）

**解決策1: パスワード変更時にPDSサーバー側も更新**

- パスワードの同期を維持
- ただし、AT Protocolにパスワード変更用のAPIが存在するか確認が必要

**解決策2: 管理者権限での削除**

- パスワード同期の問題を回避
- ただし、管理者権限の設定が必要

## 結論

ユーザーの指摘は正しく、現在の実装では以下の問題があります：

1. **パスワード変更時にPDSサーバー側のパスワードが更新されていない**
2. **削除時にユーザーが提供するパスワードとPDSサーバー側のパスワードが一致しない可能性が高い**

**推奨される対応**:
- 短期的には、`deactivateAccount`を使用してパスワード不要で削除する
- 長期的には、パスワード変更時にPDSサーバー側も更新するか、管理者権限での削除を検討する

