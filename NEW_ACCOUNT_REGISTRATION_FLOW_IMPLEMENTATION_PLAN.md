# 新しいアカウント作成フローの実装計画

## 提案されたフローの概要

### フロー概要

1. **アカウント作成時**: 仮パスワードを発行 → PDSアカウント作成 → 検証メール送信
2. **メール検証後**: パスワード設定（リセット）を要求
3. **ログイン制御**: パスワードが設定されていない場合はログイン不可
4. **アカウント削除時**: 仮パスワードを使用してPDSアカウントを削除

## 確認事項と回答

### ✅ 1. 仮パスワードの生成方法

**回答**: `crypto.randomBytes`を使用して安全に生成（32文字の英数字記号）

### ✅ 2. 仮パスワードの保存方法

**回答**: `DynamoDBIdentityLinkItem`に暗号化して保存

- 暗号化方式: AES-256-GCM（Node.jsの`crypto`モジュールを使用）
- 暗号化キー: 環境変数`TEMPORARY_PASSWORD_ENCRYPTION_KEY`で管理

### ✅ 3. メール検証後のパスワード設定

**回答**: 新しいエンドポイント`POST /auth/set-initial-password`を作成

- 既存の`/auth/reset-password`とは別のエンドポイント
- メール検証完了後にパスワード設定を要求

### ✅ 4. ログイン制御

**回答**: `passwordChangedFromTemporary`が`false`の場合はログイン拒否

- エラーコード: `PASSWORD_NOT_SET`
- エラーメッセージ: 「メール検証後にパスワードを設定してください」

### ✅ 5. パスワード変更時のPDS同期

**回答**: 解決策1（ハイブリッドアプローチ）を実装

- パスワード変更時にPDS側も更新を試行
- 失敗した場合は警告を記録してAPI側の更新は続行

### ✅ 6. アカウント削除時の仮パスワード使用

**回答**: 仮パスワードを復号化して使用

- 仮パスワードが存在しない場合は`deactivateAccount`にフォールバック
- 仮パスワードを使用した削除が失敗した場合も`deactivateAccount`にフォールバック

### ✅ 7. 既存ユーザーへの影響

**回答**: 既存ユーザーは影響を受けない

- `temporaryPasswordEncrypted`が存在しない場合は既存ユーザーと判断
- `passwordChangedFromTemporary`が`undefined`の場合は`true`として扱う

### ✅ 8. 再登録時の仮パスワード

**回答**: 再登録時も新しい仮パスワードを発行

- 古い仮パスワードは削除（または上書き）

## 実装計画

### Phase 1: データモデルの拡張

#### 1.1 DynamoDBIdentityLinkItemの拡張

**ファイル**: `src/services/SnsService.ts`

```typescript
export interface DynamoDBIdentityLinkItem {
  // ... 既存のフィールド ...

  // 仮パスワード関連（新規追加）
  temporaryPasswordEncrypted?: string; // 暗号化された仮パスワード
  temporaryPasswordCreatedAt?: string; // 仮パスワード作成日時
  passwordChangedFromTemporary?: boolean; // パスワードが仮パスワードから変更されたか
}
```

#### 1.2 既存ユーザーのマイグレーション

- `temporaryPasswordEncrypted`が存在しない場合は既存ユーザーと判断
- `passwordChangedFromTemporary`が`undefined`の場合は`true`として扱う（後方互換性）

### Phase 2: 仮パスワード生成・暗号化機能の実装

#### 2.1 PasswordServiceの拡張

**ファイル**: `src/services/PasswordService.ts`

**追加するメソッド**:

1. `generateTemporaryPassword(length: number): string`
   - ランダムな仮パスワードを生成（32文字の英数字記号）
   - `crypto.randomBytes`を使用

2. `encryptTemporaryPassword(password: string): string`
   - 仮パスワードをAES-256-GCMで暗号化
   - 環境変数`TEMPORARY_PASSWORD_ENCRYPTION_KEY`を使用

3. `decryptTemporaryPassword(encrypted: string): string`
   - 暗号化された仮パスワードを復号化

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

// PasswordService.encryptTemporaryPassword
public encryptTemporaryPassword(password: string): string {
  const key = Buffer.from(process.env.TEMPORARY_PASSWORD_ENCRYPTION_KEY || '', 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // IV + AuthTag + EncryptedData を結合
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// PasswordService.decryptTemporaryPassword
public decryptTemporaryPassword(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  const key = Buffer.from(process.env.TEMPORARY_PASSWORD_ENCRYPTION_KEY || '', 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### 2.2 環境変数の追加

**ファイル**: `serverless.yml`

```yaml
environment:
  # ... 既存の環境変数 ...
  TEMPORARY_PASSWORD_ENCRYPTION_KEY: ${env:TEMPORARY_PASSWORD_ENCRYPTION_KEY}
```

### Phase 3: アカウント作成フローの変更

#### 3.1 EmailPasswordRegisterRequestの変更

**ファイル**: `src/models/requests/index.ts`

```typescript
export interface EmailPasswordRegisterRequest {
  email: string;
  displayName: string;
  handle: string;
  // password フィールドを削除（オプショナルにするか、完全に削除）
}
```

#### 3.2 UserAuthService.registerWithEmailPasswordの変更

**ファイル**: `src/services/UserAuthService.ts`

**変更内容**:

1. `password`パラメータを削除（またはオプショナルにする）
2. 仮パスワードを生成
3. 仮パスワードでPDSアカウントを作成
4. 仮パスワードを暗号化してDynamoDBに保存
5. `passwordChangedFromTemporary = false`を設定

**実装例**:

```typescript
public async registerWithEmailPassword(
  email: string,
  displayName: string,
  handle?: string
  // password パラメータを削除
): Promise<RegistrationResult> {
  // 1. 仮パスワードを生成
  const temporaryPassword = this.passwordService.generateTemporaryPassword(32);

  // 2. 仮パスワードでPDSアカウントを作成
  const pdsResult = await this.pdsService.createAccount(
    normalizedEmail,
    temporaryPassword, // 仮パスワードを使用
    fullHandle
  );

  // 3. 仮パスワードを暗号化
  const encryptedTemporaryPassword = this.passwordService.encryptTemporaryPassword(temporaryPassword);

  // 4. IdentityLinkに保存
  const identityLinkData: any = {
    // ... 既存のフィールド ...
    temporaryPasswordEncrypted: encryptedTemporaryPassword,
    temporaryPasswordCreatedAt: new Date().toISOString(),
    passwordChangedFromTemporary: false, // 初期値はfalse
  };

  // ... 残りの処理 ...
}
```

#### 3.3 AuthController.registerの変更

**ファイル**: `src/controllers/auth/AuthController.ts`

**変更内容**:

1. `EmailPasswordRegisterRequest`から`password`フィールドを削除
2. `registerWithEmailPassword`の呼び出しを更新

### Phase 4: メール検証後のパスワード設定エンドポイント

#### 4.1 SetInitialPasswordRequestの追加

**ファイル**: `src/models/requests/index.ts`

```typescript
export interface SetInitialPasswordRequest {
  primaryDid: string;
  token: string; // メール検証トークン
  newPassword: string; // 新しいパスワード
}
```

#### 4.2 UserAuthService.setInitialPasswordの実装

**ファイル**: `src/services/UserAuthService.ts`

**実装内容**:

1. メール検証トークンを検証
2. メール検証が完了していることを確認
3. 新しいパスワードの強度を検証
4. パスワードをハッシュ化して保存
5. 仮パスワードを削除（または無効化）
6. `passwordChangedFromTemporary = true`に設定
7. PDS側のパスワードも更新（`com.atproto.server.changePassword`を使用）

**実装例**:

```typescript
public async setInitialPassword(
  primaryDid: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // 1. メール検証トークンを検証
  // 2. メール検証が完了していることを確認
  // 3. 新しいパスワードの強度を検証
  // 4. 仮パスワードを復号化
  // 5. PDS側のパスワードを更新（仮パスワード → 新しいパスワード）
  // 6. API側のパスワードを更新
  // 7. 仮パスワードを削除
  // 8. passwordChangedFromTemporary = true に設定
}
```

#### 4.3 AuthController.setInitialPasswordの実装

**ファイル**: `src/controllers/auth/AuthController.ts`

**実装内容**:

1. `POST /auth/set-initial-password`エンドポイントを追加
2. `SetInitialPasswordRequest`を受け取る
3. `UserAuthService.setInitialPassword`を呼び出す

### Phase 5: ログイン制御の実装

#### 5.1 UserAuthService.loginWithEmailPasswordの変更

**ファイル**: `src/services/UserAuthService.ts`

**変更内容**:

1. `passwordChangedFromTemporary`をチェック
2. `false`の場合はログインを拒否

**実装例**:

```typescript
// loginWithEmailPassword内
// メール検証チェックの後、パスワード設定チェックを追加
if (!identityLink.passwordChangedFromTemporary) {
  return {
    success: false,
    error: 'PASSWORD_NOT_SET',
    message: 'Please set your password after email verification',
  };
}
```

### Phase 6: アカウント削除の実装

#### 6.1 SnsService.deleteUserProfileの変更

**ファイル**: `src/services/SnsService.ts`

**変更内容**:

1. 仮パスワードを復号化
2. 仮パスワードを使用してPDSアカウントを削除
3. 失敗した場合は`deactivateAccount`にフォールバック

**実装例**:

```typescript
// deleteUserProfile内
// 1. 仮パスワードを取得
const identityLink = await this.getIdentityLink(primaryDid, `email:${email}`);
let temporaryPassword: string | null = null;

if (identityLink?.temporaryPasswordEncrypted) {
  temporaryPassword = this.passwordService.decryptTemporaryPassword(
    identityLink.temporaryPasswordEncrypted
  );
}

// 2. PDSアカウントを削除
if (identityLink?.pdsAccessJwt) {
  const pdsService = PdsService.getInstance();
  const deleteResult = await pdsService.deleteAccount(
    primaryDid,
    temporaryPassword, // 仮パスワードを使用
    identityLink.pdsAccessJwt
  );

  if (!deleteResult.success) {
    // エラーハンドリング
  }
}
```

#### 6.2 PdsService.deleteAccountの変更

**ファイル**: `src/services/PdsService.ts`

**変更内容**:

1. `temporaryPassword`パラメータを追加
2. 仮パスワードがある場合は`deleteAccount`を使用
3. 失敗した場合は`deactivateAccount`にフォールバック

**実装例**:

```typescript
public async deleteAccount(
  did: string,
  temporaryPassword: string | null,
  accessJwt: string
): Promise<{ success: boolean; error?: string }> {
  const agent = new BskyAgent({
    service: this.pdsEndpoint,
  });

  agent.session = {
    did,
    accessJwt,
  };

  // 1. 仮パスワードがある場合、deleteAccountを使用
  if (temporaryPassword) {
    try {
      // requestAccountDeleteで削除トークンを取得
      const tokenResult = await this.requestAccountDelete(accessJwt);

      if (tokenResult.success && tokenResult.token) {
        await agent.com.atproto.server.deleteAccount({
          did,
          password: temporaryPassword,
          token: tokenResult.token,
        });
        return { success: true };
      }
    } catch (error) {
      // 失敗した場合はdeactivateAccountにフォールバック
      console.warn('deleteAccount failed, trying deactivateAccount:', error);
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

### Phase 7: メール検証フローの変更

#### 7.1 AuthController.verifyEmailの変更

**ファイル**: `src/controllers/auth/AuthController.ts`

**変更内容**:

1. メール検証完了後のレスポンスに`passwordNotSet`フラグを追加
2. フロントエンドがパスワード設定画面にリダイレクトできるようにする

**実装例**:

```typescript
// verifyEmail内
// メール検証完了後
const identityLink = await this.snsService.getIdentityLink(
  request.primaryDid,
  `email:${email}`
);

// パスワードが設定されているかチェック
const passwordNotSet = !identityLink?.passwordChangedFromTemporary;

return {
  success: true,
  data: {
    email: identityLink.email || '',
    verified: true,
    passwordNotSet, // パスワード設定が必要かどうか
  },
};
```

### Phase 8: パスワード変更時のPDS同期（既存機能の拡張）

#### 8.1 UserAuthService.changePasswordの変更

**ファイル**: `src/services/UserAuthService.ts`

**変更内容**:

1. PDS側のパスワードも更新を試行
2. 失敗した場合は警告を記録してAPI側の更新は続行

**実装例**:

```typescript
// changePassword内
// 1. API側のパスワード検証と更新（既存の処理）
// ...

// 2. PDS側のパスワード更新を試行
const identityLinks = await this.snsService.queryIdentityLinks(primaryDid);
const pdsLink = identityLinks.find(link => link.pdsAccessJwt);

if (pdsLink?.pdsAccessJwt) {
  const pdsService = PdsService.getInstance();
  const pdsUpdateResult = await pdsService.changePassword(
    primaryDid,
    currentPassword, // 現在のパスワード（PDS側のoldPassword）
    newPassword, // 新しいパスワード
    pdsLink.pdsAccessJwt
  );

  if (!pdsUpdateResult.success) {
    // 警告を記録（ログに記録、またはレスポンスに含める）
    console.warn('PDS password update failed:', pdsUpdateResult.error);
  }
}

// 3. API側のパスワードを更新（PDS更新の成否に関わらず実行）
await this.snsService.updateIdentityLink(/* ... */);
```

#### 8.2 PdsService.changePasswordの実装

**ファイル**: `src/services/PdsService.ts`

**実装内容**:

1. `com.atproto.server.changePassword`を使用
2. `oldPassword`と`newPassword`を受け取る

**実装例**:

```typescript
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

## 実装順序

1. **Phase 1**: データモデルの拡張
2. **Phase 2**: 仮パスワード生成・暗号化機能の実装
3. **Phase 3**: アカウント作成フローの変更
4. **Phase 4**: メール検証後のパスワード設定エンドポイント
5. **Phase 5**: ログイン制御の実装
6. **Phase 6**: アカウント削除の実装
7. **Phase 7**: メール検証フローの変更
8. **Phase 8**: パスワード変更時のPDS同期（既存機能の拡張）

## テスト計画

### 1. アカウント作成フローのテスト

- 仮パスワードが生成されることを確認
- PDSアカウントが仮パスワードで作成されることを確認
- 仮パスワードが暗号化して保存されることを確認

### 2. メール検証後のパスワード設定のテスト

- メール検証後にパスワード設定が要求されることを確認
- パスワード設定後に`passwordChangedFromTemporary = true`になることを確認
- 仮パスワードが削除されることを確認

### 3. ログイン制御のテスト

- パスワードが設定されていない場合はログインできないことを確認
- パスワードが設定されている場合はログインできることを確認

### 4. アカウント削除のテスト

- 仮パスワードを使用してPDSアカウントが削除されることを確認
- 仮パスワードがない場合は`deactivateAccount`にフォールバックすることを確認

### 5. 既存ユーザーのテスト

- 既存ユーザーが影響を受けないことを確認
- 既存ユーザーがログインできることを確認

## 注意事項

1. **環境変数の設定**: `TEMPORARY_PASSWORD_ENCRYPTION_KEY`を設定する必要がある
2. **既存ユーザーのマイグレーション**: 既存ユーザーは影響を受けないが、データマイグレーションスクリプトを準備する
3. **セキュリティ**: 仮パスワードの暗号化キーは安全に管理する必要がある
4. **エラーハンドリング**: PDS側の更新に失敗した場合の処理を適切に実装する
