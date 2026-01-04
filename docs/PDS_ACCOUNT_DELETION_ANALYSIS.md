# PDSアカウント削除の必要性分析

## 質問

アカウント削除時には、PDSサーバーへもアカウントの削除処理が必要なのでしょうか？

## 現在の実装状況

### ✅ 実装済み

- `SnsService.deleteUserProfile()`: DynamoDBでの論理削除（soft delete）
  - `accountStatus: 'deleted'` を設定
  - メールアドレスなどの個人情報を削除

### ❌ 未実装

- `PdsService.deleteAccount()`: PDSサーバーへのアカウント削除処理
- `SnsService.deleteUserProfile()`からPDS削除処理の呼び出し

## AT Protocolの観点

### DID（Decentralized Identifier）の特性

- **永続性**: DIDは一度生成されると、永続的な識別子として機能
- **不変性**: DID自体は変更されない（`did:plc:...`）
- **再利用**: 同じDIDで再登録することは技術的に可能

### Handle（ユーザー名）の特性

- **一意性**: HandleはPDSサーバー内で一意である必要がある
- **再利用**: Handleは削除後に再利用可能にすべきかどうかは設計方針による
- **制約**: 同じhandleで再登録するには、既存のアカウントを削除する必要がある

## 問題点

### 現在の問題

1. **Handleの再利用不可**: PDSアカウントを削除しないと、同じhandleで再登録できない
2. **データ不整合**: DynamoDBでは削除済みだが、PDSではアクティブな状態
3. **再登録の失敗**: 削除されたアカウントで再登録しようとすると、PDSで「handle already exists」エラーが発生する可能性

### 実際の動作

```typescript
// 現在の再登録処理（UserAuthService.ts）
if (isDeletedAccount && existingPrimaryDid) {
  // For deleted accounts, reuse existing DID
  // Skip PDS account creation (handle might already exist in PDS)
  primaryDid = existingPrimaryDid;
  finalHandle = fullHandle;
}
```

この実装では、PDSアカウントが存在する場合、新しいhandleで再登録しようとすると失敗する可能性があります。

## 推奨される実装方針

### オプション1: PDSアカウントを削除する（推奨）

**メリット**:

- Handleの再利用が可能
- データ整合性の向上
- 再登録時のエラー回避

**デメリット**:

- DIDが失われる（ただし、再登録時に新しいDIDが生成される）
- PDSサーバーへの追加API呼び出しが必要

**実装**:

```typescript
// PdsService.ts
public async deleteAccount(
  did: string,
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
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### オプション2: PDSアカウントを保持する

**メリット**:

- DIDの永続性を保持
- 再登録時に同じDIDを再利用可能

**デメリット**:

- Handleの再利用が困難（PDSでhandleを変更する必要がある）
- データ整合性の問題（DynamoDBでは削除済みだが、PDSではアクティブ）

## 推奨実装

### 完全な削除フロー

```typescript
// SnsService.ts
async deleteUserProfile(userId: string): Promise<void> {
  // 1. プロフィールを論理削除
  await this.softDeleteProfile(userId);

  // 2. PDSアカウントを削除（handleを再利用可能にする）
  const identityLinks = await this.queryIdentityLinks(userId);
  const emailLink = identityLinks.find(
    link => link.linkedId.startsWith('email:')
  );

  if (emailLink && emailLink.accessJwt) {
    // PDSアカウントを削除
    await this.pdsService.deleteAccount(userId, emailLink.accessJwt);
  }

  // 3. その他の関連データの削除/匿名化
  // ...
}
```

### 注意点

1. **AccessJWTの保存**: PDSアカウント削除には`accessJwt`が必要
   - 現在の実装では`accessJwt`を`IdentityLink`に保存していない可能性がある
   - 削除時に`accessJwt`を取得する必要がある

2. **エラーハンドリング**: PDS削除が失敗した場合の処理
   - DynamoDBの削除は成功したが、PDS削除が失敗した場合のロールバック
   - または、PDS削除の失敗をログに記録して後で再試行

3. **再登録時の処理**: PDSアカウントを削除した場合、再登録時に新しいDIDが生成される
   - 既存のDIDを再利用するのではなく、新しいDIDを生成する必要がある

## 結論

**推奨**: **PDSアカウントも削除する**

理由:

1. Handleの再利用が可能になる
2. データ整合性が向上する
3. 再登録時のエラーを回避できる
4. AT Protocolのベストプラクティスに従う

ただし、実装時には以下を考慮する必要があります:

- `accessJwt`の保存と取得
- エラーハンドリング
- 再登録時の新しいDID生成
