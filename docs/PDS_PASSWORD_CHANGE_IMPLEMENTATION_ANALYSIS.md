# PDSパスワード変更実装の分析

## 問題の再確認

ユーザーから指摘された問題：

> `com.atproto.server.changePassword`を使用するには、`oldPassword`（現在のパスワード）が必要だが、DynamoDBにはパスワードのハッシュしか保存されていないので、元のパスワードは分からない。

## 現在のパスワード変更フロー

### API側のパスワード変更 (`UserAuthService.changePassword`)

```typescript
public async changePassword(
  primaryDid: string,
  currentPassword: string,  // ユーザーが提供する現在のパスワード
  newPassword: string        // ユーザーが提供する新しいパスワード
): Promise<{ success: boolean; error?: string }> {
  // 1. ユーザーから currentPassword を受け取る
  // 2. DynamoDBの passwordHash と照合
  // 3. 新しいパスワードをハッシュ化して保存
}
```

### 重要なポイント

**ユーザーは`currentPassword`を提供している**ので、その時点では元のパスワードが分かります。

## 解決策の検討

### 解決策1A: ユーザーが提供する`currentPassword`をPDS側の`oldPassword`として使用

#### 前提条件
- API側とPDS側のパスワードが同期している（アカウント作成時から変更されていない）
- ユーザーが提供する`currentPassword`がPDS側のパスワードと一致する

#### 実装方法

```typescript
// UserAuthService.changePassword
public async changePassword(
  primaryDid: string,
  currentPassword: string,  // ユーザーが提供する現在のパスワード
  newPassword: string        // ユーザーが提供する新しいパスワード
): Promise<{ success: boolean; error?: string }> {
  // 1. API側のパスワード検証と更新（既存の処理）
  const isValidPassword = await this.passwordService.verifyPassword(
    currentPassword,
    identityLink.passwordHash
  );
  
  if (!isValidPassword) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // 2. 新しいパスワードをハッシュ化してAPI側に保存
  const passwordHash = await this.passwordService.hashPassword(newPassword);
  await this.snsService.updateIdentityLink(/* ... */);

  // 3. PDS側のパスワードも更新
  const identityLinks = await this.snsService.queryIdentityLinks(primaryDid);
  const pdsLink = identityLinks.find(link => link.pdsAccessJwt);
  
  if (pdsLink?.pdsAccessJwt) {
    const pdsService = PdsService.getInstance();
    const updateResult = await pdsService.changePassword(
      primaryDid,
      currentPassword,  // PDS側の oldPassword として使用
      newPassword,      // PDS側の newPassword
      pdsLink.pdsAccessJwt
    );
    
    if (!updateResult.success) {
      // PDS更新に失敗した場合の処理
      // オプション1: エラーを返す（API側の更新もロールバック）
      // オプション2: 警告を記録して続行（API側の更新は成功とする）
      console.error('Failed to update PDS password:', updateResult.error);
    }
  }

  return { success: true };
}
```

#### 問題点

1. **パスワード同期が取れていない場合**
   - ユーザーがAPI経由でパスワードを変更したが、PDS側の更新に失敗した場合
   - 次回のパスワード変更時に、ユーザーが提供する`currentPassword`がPDS側のパスワードと一致しない
   - PDS側のパスワード更新が失敗する

2. **初回のパスワード変更**
   - アカウント作成時からパスワードが変更されていない場合、`currentPassword`はPDS側のパスワードと一致する
   - しかし、一度でもPDS側の更新に失敗すると、以降の同期が取れなくなる

### 解決策1B: パスワード変更時にPDS側の更新を試行し、失敗した場合は警告のみ

#### 実装方法

```typescript
// UserAuthService.changePassword
public async changePassword(
  primaryDid: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; pdsUpdateWarning?: string }> {
  // 1. API側のパスワード検証と更新（既存の処理）
  // ...

  // 2. PDS側のパスワード更新を試行
  const pdsUpdateResult = await this.updatePdsPassword(
    primaryDid,
    currentPassword,
    newPassword
  );

  // 3. PDS更新に失敗した場合でも、API側の更新は成功とする
  // ただし、警告を返す
  if (!pdsUpdateResult.success) {
    return {
      success: true,
      pdsUpdateWarning: 'Password updated in API, but PDS update failed. Please contact support if you encounter issues.',
    };
  }

  return { success: true };
}
```

#### 問題点

- PDS側のパスワードが古いままになる
- 削除時に問題が発生する可能性がある

### 解決策1C: パスワード変更時にPDS側の更新を必須とする（失敗した場合はロールバック）

#### 実装方法

```typescript
// UserAuthService.changePassword
public async changePassword(
  primaryDid: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // 1. API側のパスワード検証
  // ...

  // 2. まずPDS側のパスワード更新を試行
  const pdsUpdateResult = await this.updatePdsPassword(
    primaryDid,
    currentPassword,
    newPassword
  );

  if (!pdsUpdateResult.success) {
    // PDS更新に失敗した場合、エラーを返す（API側の更新は行わない）
    return {
      success: false,
      error: `Failed to update password on PDS server: ${pdsUpdateResult.error}`,
    };
  }

  // 3. PDS更新が成功した場合のみ、API側のパスワードを更新
  const passwordHash = await this.passwordService.hashPassword(newPassword);
  await this.snsService.updateIdentityLink(/* ... */);

  return { success: true };
}
```

#### 問題点

- PDS側のパスワード更新に失敗した場合、API側のパスワードも更新されない
- ユーザー体験が悪い（PDSサーバーの問題でAPI側のパスワード変更も失敗する）

## 推奨される実装方法

### ハイブリッドアプローチ

1. **パスワード変更時にPDS側の更新を試行**
2. **PDS更新に失敗した場合**:
   - API側の更新は成功とする（ユーザー体験を優先）
   - 警告を記録（ログに記録、またはレスポンスに含める）
   - 管理者に通知（オプション）

3. **削除時の対応**:
   - パスワード同期の問題を回避するため、`deactivateAccount`を使用する
   - または、管理者権限での削除を使用する

### 実装例

```typescript
// UserAuthService.changePassword
public async changePassword(
  primaryDid: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  try {
    // 1. パスワード検証
    // ...

    // 2. 新しいパスワードをハッシュ化
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // 3. PDS側のパスワード更新を試行（先に実行）
    const warnings: string[] = [];
    const identityLinks = await this.snsService.queryIdentityLinks(primaryDid);
    const pdsLink = identityLinks.find(link => link.pdsAccessJwt);
    
    if (pdsLink?.pdsAccessJwt) {
      const pdsService = PdsService.getInstance();
      const pdsUpdateResult = await pdsService.changePassword(
        primaryDid,
        currentPassword,
        newPassword,
        pdsLink.pdsAccessJwt
      );
      
      if (!pdsUpdateResult.success) {
        warnings.push(
          'Password updated in API, but PDS server update failed. ' +
          'If you encounter issues with account deletion, please contact support.'
        );
        // ログに記録
        console.error('PDS password update failed:', {
          primaryDid,
          error: pdsUpdateResult.error,
        });
      }
    }

    // 4. API側のパスワードを更新（PDS更新の成否に関わらず実行）
    await this.snsService.updateIdentityLink(
      primaryDid,
      identityLink.linkedId,
      {
        passwordHash,
        passwordUpdatedAt: new Date().toISOString(),
        failedLoginCount: 0,
      }
    );

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

## PdsService.changePasswordの実装

```typescript
// PdsService.changePassword
public async changePassword(
  did: string,
  oldPassword: string,
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

    await agent.com.atproto.server.changePassword({
      oldPassword,
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

## 結論

**解決策1は実装可能ですが、以下の課題があります：**

1. **パスワード同期の問題**: 一度でもPDS側の更新に失敗すると、以降の同期が取れなくなる可能性がある
2. **ユーザー体験**: PDS更新に失敗した場合の処理が複雑

**推奨される実装**:
- ハイブリッドアプローチ: PDS側の更新を試行し、失敗した場合は警告を記録してAPI側の更新は続行
- 削除時は`deactivateAccount`を使用してパスワード同期の問題を回避

