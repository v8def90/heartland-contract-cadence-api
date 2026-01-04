# 新しいアカウント作成フローの分析

## 提案されたフロー

### ① アカウント作成時に仮パスワードを発行

- `/auth/register`でアカウント作成時に仮パスワードを発行
- そのパスワードでPDSアカウントを作成
- **アカウント作成時APIを叩く際にパスワードを要求しない**
- **仮パスワードはDynamoDBに保存しておく**

### ② 検証メールを送信

- アカウントおよびPDSアカウントの作成が完了したら検証メールを送信

### ③ メール検証後のパスワードリセット（登録）

- メールリンクからメール検証を行い、次にパスワードのリセット(登録)を求める
- **DynamoDB上に「パスワードが仮パスワードから変更されたか」フィールドを準備**
- **このフィールドが変更されていないとログインできない制御**

### ④ アカウント削除時のPDS削除

- ユーザアカウント削除時には、PDSアカウントも削除する
- **その際のパスワードは①の仮パスワードを使う**

## 確認事項

### 1. 仮パスワードの生成方法

**質問**: 仮パスワードはどのように生成しますか？

**推奨**:

- ランダムな文字列を生成（例: 32文字の英数字記号）
- `crypto.randomBytes`を使用して安全に生成
- パスワード強度要件を満たす（大文字、小文字、数字、記号を含む）

**実装例**:

```typescript
// PasswordService.generateTemporaryPassword
public generateTemporaryPassword(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}
```

### 2. 仮パスワードの保存場所と方法

**質問**: 仮パスワードをどこに保存しますか？暗号化は必要ですか？

**推奨**:

- `DynamoDBIdentityLinkItem`に`temporaryPassword`フィールドを追加
- **暗号化して保存**（AES-256-GCMなど）
- または、ハッシュ化して保存（ただし、削除時に元のパスワードが必要なので、暗号化が推奨）

**実装例**:

```typescript
// DynamoDBIdentityLinkItemに追加
export interface DynamoDBIdentityLinkItem {
  // ... 既存のフィールド ...
  temporaryPasswordEncrypted?: string; // 暗号化された仮パスワード
  temporaryPasswordCreatedAt?: string; // 仮パスワード作成日時
  passwordChangedFromTemporary?: boolean; // パスワードが仮パスワードから変更されたか
}
```

**セキュリティ上の考慮**:

- 仮パスワードは暗号化して保存（AES-256-GCM推奨）
- 暗号化キーはAWS KMSまたは環境変数で管理
- 仮パスワードは一度使用されたら削除（または無効化）

### 3. メール検証後のパスワードリセットフロー

**質問**: メール検証完了後、どのエンドポイントでパスワードをリセット（登録）しますか？

**推奨**:

- 既存の`POST /auth/reset-password`エンドポイントを拡張
- または、新しいエンドポイント`POST /auth/set-initial-password`を作成
- メール検証完了後、自動的にパスワード設定画面にリダイレクト

**フロー**:

```
1. メール検証完了 (POST /auth/verify-email)
   ↓
2. レスポンスに「パスワード設定が必要」フラグを含める
   ↓
3. フロントエンドがパスワード設定画面を表示
   ↓
4. ユーザーがパスワードを設定 (POST /auth/set-initial-password)
   ↓
5. 仮パスワードを削除（または無効化）
   ↓
6. passwordChangedFromTemporary = true に設定
```

### 4. ログイン制御

**質問**: `passwordChangedFromTemporary`が`false`の場合、どのようにログインを制御しますか？

**推奨**:

- `loginWithEmailPassword`で`passwordChangedFromTemporary`をチェック
- `false`の場合は、エラーを返す（例: `PASSWORD_NOT_SET`）
- エラーメッセージに「パスワード設定が必要」というメッセージを含める

**実装例**:

```typescript
// UserAuthService.loginWithEmailPassword
if (!identityLink.passwordChangedFromTemporary) {
  return {
    success: false,
    error: 'PASSWORD_NOT_SET',
    message: 'Please set your password after email verification',
  };
}
```

### 5. パスワード変更時のPDS同期

**質問**: ユーザーがパスワードを変更した場合、PDS側も更新しますか？

**推奨**:

- 解決策1（ハイブリッドアプローチ）を実装
- パスワード変更時にPDS側も更新を試行
- 失敗した場合は警告を記録してAPI側の更新は続行

### 6. アカウント削除時の仮パスワード使用

**質問**: 仮パスワードが既に削除されている場合（パスワード変更後）、どうしますか？

**推奨**:

- パスワード変更後も仮パスワードを保持（暗号化されたまま）
- または、`deactivateAccount`を使用してパスワード不要で削除
- 仮パスワードが存在しない場合は、`deactivateAccount`にフォールバック

**実装例**:

```typescript
// PdsService.deleteAccount
public async deleteAccount(
  did: string,
  temporaryPassword: string | null, // 仮パスワード（暗号化解除済み）
  accessJwt: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 仮パスワードがある場合、deleteAccountを使用
  if (temporaryPassword) {
    try {
      await agent.com.atproto.server.deleteAccount({
        did,
        password: temporaryPassword,
        token: deletionToken,
      });
      return { success: true };
    } catch (error) {
      // 失敗した場合はdeactivateAccountにフォールバック
    }
  }

  // 2. 仮パスワードがない場合、またはdeleteAccountが失敗した場合
  // deactivateAccountを使用
  await agent.com.atproto.server.deactivateAccount({
    deleteAfter: new Date().toISOString(),
  });

  return { success: true };
}
```

### 7. 既存ユーザーへの影響

**質問**: 既存のユーザー（既にパスワードを設定している）への影響は？

**推奨**:

- 既存ユーザーには`passwordChangedFromTemporary = true`を設定
- または、`temporaryPasswordEncrypted`が存在しない場合は、既存ユーザーと判断
- 既存ユーザーは影響を受けない

### 8. 再登録時の仮パスワード

**質問**: 削除されたアカウントを再登録する場合、新しい仮パスワードを発行しますか？

**推奨**:

- 再登録時も新しい仮パスワードを発行
- 古い仮パスワードは削除（または無効化）

## メリット

1. **PDS削除時のパスワード同期問題を解決**
   - 仮パスワードを常に保存しているため、削除時に使用可能
   - ユーザーがパスワードを変更しても、削除時には仮パスワードを使える

2. **セキュリティの向上**
   - ユーザーが最初から安全なパスワードを設定できる
   - 仮パスワードは暗号化して保存

3. **ユーザー体験の向上**
   - メール検証後にパスワードを設定する流れが自然

## デメリット・課題

1. **仮パスワードの保存**
   - 暗号化が必要（セキュリティリスク）
   - ストレージコストの増加

2. **複雑性の増加**
   - フローが複雑になる
   - エラーハンドリングが複雑になる

3. **既存ユーザーへの影響**
   - 既存ユーザーのマイグレーションが必要

## 推奨される実装計画

### Phase 1: データモデルの拡張

1. `DynamoDBIdentityLinkItem`に以下を追加:
   - `temporaryPasswordEncrypted?: string`
   - `temporaryPasswordCreatedAt?: string`
   - `passwordChangedFromTemporary?: boolean`

### Phase 2: 仮パスワード生成機能の実装

1. `PasswordService.generateTemporaryPassword()`を実装
2. 仮パスワードの暗号化/復号化機能を実装

### Phase 3: アカウント作成フローの変更

1. `/auth/register`でパスワードを要求しない
2. 仮パスワードを生成してPDSアカウントを作成
3. 仮パスワードを暗号化してDynamoDBに保存

### Phase 4: メール検証後のパスワード設定

1. `POST /auth/set-initial-password`エンドポイントを実装
2. メール検証完了後にパスワード設定を要求

### Phase 5: ログイン制御の実装

1. `loginWithEmailPassword`で`passwordChangedFromTemporary`をチェック
2. `false`の場合はログインを拒否

### Phase 6: アカウント削除の実装

1. 仮パスワードを復号化
2. 仮パスワードを使用してPDSアカウントを削除
3. 失敗した場合は`deactivateAccount`にフォールバック

### Phase 7: 既存ユーザーのマイグレーション

1. 既存ユーザーに`passwordChangedFromTemporary = true`を設定
2. または、`temporaryPasswordEncrypted`が存在しない場合は既存ユーザーと判断

## 確認が必要な点

1. **仮パスワードの生成方法**: ランダム生成で問題ないか？
2. **仮パスワードの保存方法**: 暗号化して保存で問題ないか？
3. **メール検証後のフロー**: 既存の`/auth/reset-password`を拡張するか、新しいエンドポイントを作成するか？
4. **既存ユーザーへの影響**: 既存ユーザーは影響を受けないか？
5. **セキュリティ**: 仮パスワードの暗号化キーはどこで管理するか？
