# メール/パスワード認証機能 実装計画（AT Protocol対応版）

**作成日**: 2025-12-30  
**目的**: AT Protocol対応を踏まえたメール/パスワード認証機能の包括的な実装計画  
**前提**: 既存のFlow wallet認証との並行運用、AT Protocol DID生成との統合

---

## 📋 概要

この実装計画では、AT Protocol対応を踏まえたメール/パスワード認証機能を追加します。既存のFlow wallet認証と並行運用し、AT ProtocolのDID生成（PDS連携）と統合します。

### 主要な特徴

- ✅ **メール/パスワード認証**: 従来型の認証方法を追加
- ✅ **Flow wallet認証との並行運用**: 両方の認証方法をサポート
- ✅ **AT Protocol DID統合**: ユーザー登録時にPDS経由でDID生成
- ✅ **メール認証**: メールアドレス検証機能を実装
- ✅ **パスワード管理**: セキュアなパスワードハッシュ化・リセット機能
- ✅ **統一認証基盤**: JWT認証で複数認証方法を統合

---

## 🏗️ アーキテクチャ設計

### 認証フロー概要

```
┌─────────────────────────────────────────────────────────────┐
│                   認証方法の選択                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Flow Wallet認証 (既存)                                    │
│    └─> FlowAuthService → JWT生成                              │
│                                                               │
│ 2. メール/パスワード認証 (新規)                               │
│    └─> EmailPasswordAuthService → JWT生成                     │
│                                                               │
│ 3. DID署名認証 (将来実装)                                     │
│    └─> DidAuthService → JWT生成                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   UnifiedAuthService  │
              │   (認証方法の統合)     │
              └───────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   JWT Token生成        │
              │   (authMethod含む)     │
              └───────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   AT Protocol DID     │
              │   (PDS連携)            │
              └───────────────────────┘
```

### データモデル統合

既存の`DynamoDBIdentityLinkItem`を活用してメール/パスワード認証情報を保存します。

```typescript
// DynamoDBIdentityLinkItem（既存データモデルを活用）
export interface DynamoDBIdentityLinkItem {
  PK: string; // USER#{primaryDid}
  SK: string; // LINK#email:{email}
  
  // 基本情報
  primaryDid: string; // did:plc:...（PDS経由で生成）
  linkedId: string; // "email:alice@example.com"
  kind: "email"; // メール認証の場合
  role: "login"; // ログイン用途
  status: "pending" | "verified" | "revoked";
  
  // メール/パスワード認証関連（既に定義済み）
  email?: string; // "alice@example.com"
  emailNormalized?: string; // 検索・比較用
  emailVerified?: boolean; // メール認証済みか
  emailVerifiedAt?: string; // 認証日時
  
  passwordHash?: string; // bcrypt/argon2id ハッシュ
  passwordKdf?: "bcrypt" | "argon2id" | "scrypt";
  passwordUpdatedAt?: string;
  
  // セキュリティ関連
  failedLoginCount?: number; // ログイン失敗回数
  lastFailedLoginAt?: string;
  lockUntil?: string; // ロック解除時刻
  
  // メール認証トークン
  emailVerifyTokenHash?: string; // トークンのハッシュ
  emailVerifyTokenExpiresAt?: string;
  emailVerifySentAt?: string;
  
  // パスワードリセット
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
  resetRequestedAt?: string;
  
  // 監査ログ
  lastLoginAt?: string;
  lastLoginIpHash?: string;
  
  createdAt: string;
  verifiedAt?: string;
  revokedAt?: string;
}
```

---

## 📝 実装タスク詳細

### Phase 1: 基盤実装（必須）🔴 最高優先度

#### 1.1 パスワード管理サービス

**ファイル**: `src/services/PasswordService.ts`

**機能**:
- パスワードハッシュ化（bcrypt、salt rounds: 12）
- パスワード検証
- パスワード強度チェック
- パスワードリセットトークン生成

**実装内容**:
```typescript
export class PasswordService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string>;
  
  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean>;
  
  /**
   * Check password strength
   */
  validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
  };
  
  /**
   * Generate password reset token
   */
  generateResetToken(): string;
}
```

**依存関係**:
- `bcryptjs`: `pnpm add bcryptjs @types/bcryptjs`

**優先度**: **最高**

---

#### 1.2 メール認証サービス

**ファイル**: `src/services/EmailVerificationService.ts`

**機能**:
- メール認証トークン生成・検証
- 認証ステータス管理
- 認証メール再送信
- レート制限

**実装内容**:
```typescript
export class EmailVerificationService {
  /**
   * Generate email verification token
   */
  async generateVerificationToken(
    primaryDid: string,
    email: string
  ): Promise<{ token: string; expiresAt: string }>;
  
  /**
   * Verify email verification token
   */
  async verifyToken(
    token: string,
    primaryDid: string
  ): Promise<{ success: boolean; email?: string; error?: string }>;
  
  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    primaryDid: string
  ): Promise<void>;
  
  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    primaryDid: string,
    email: string
  ): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Check verification status
   */
  async getVerificationStatus(
    primaryDid: string,
    email: string
  ): Promise<{
    isVerified: boolean;
    canResend: boolean;
    nextResendAt?: string;
  }>;
}
```

**依存関係**:
- `@aws-sdk/client-ses`: `pnpm add @aws-sdk/client-ses`
- `crypto`: Node.js標準ライブラリ

**優先度**: **最高**

**詳細**: `EMAIL_VERIFICATION_IMPLEMENTATION.md`を参照

---

#### 1.3 メール送信サービス

**ファイル**: `src/services/EmailService.ts`

**機能**:
- AWS SES統合
- メールテンプレート管理
- 送信レート制限
- 送信ログ

**実装内容**:
```typescript
export class EmailService {
  /**
   * Send email via AWS SES
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<void>;
  
  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    primaryDid: string
  ): Promise<void>;
  
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    primaryDid: string
  ): Promise<void>;
  
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    displayName: string,
    primaryDid: string
  ): Promise<void>;
}
```

**依存関係**:
- `@aws-sdk/client-ses`: 既に追加済み

**優先度**: **最高**

---

#### 1.4 ユーザー認証サービス（統合）

**ファイル**: `src/services/UserAuthService.ts`

**機能**:
- メール/パスワード認証
- Flow wallet認証との統合
- 認証方法の管理
- DID生成（PDS連携）

**実装内容**:
```typescript
export class UserAuthService {
  /**
   * Register new user with email/password
   */
  async registerWithEmailPassword(
    email: string,
    password: string,
    displayName: string
  ): Promise<{
    success: boolean;
    primaryDid?: string;
    error?: string;
  }>;
  
  /**
   * Login with email/password
   */
  async loginWithEmailPassword(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    primaryDid?: string;
    authData?: AuthData;
    error?: string;
  }>;
  
  /**
   * Link email to existing account (Flow wallet認証済みユーザー)
   */
  async linkEmailToAccount(
    primaryDid: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Get user authentication methods
   */
  async getAuthMethods(
    primaryDid: string
  ): Promise<{
    emailPassword?: boolean;
    flow?: boolean;
    atproto?: boolean;
  }>;
}
```

**優先度**: **最高**

---

#### 1.5 PDS連携サービス（DID生成）

**ファイル**: `src/services/PdsService.ts`

**機能**:
- PDS API連携（`https://bsky.social`）
- DID生成（`com.atproto.server.createAccount`）
- DID解決
- エラーハンドリング

**実装内容**:
```typescript
export class PdsService {
  /**
   * Create account via PDS and generate DID
   * 
   * @description Calls com.atproto.server.createAccount API (no authentication required)
   * 
   * @param email - User email address
   * @param password - User password
   * @param handle - Optional handle (e.g., @username.bsky.social)
   * @returns Promise with DID and handle
   */
  async createAccount(
    email: string,
    password: string,
    handle?: string
  ): Promise<{
    success: boolean;
    did?: string; // did:plc:...
    handle?: string;
    accessJwt?: string;
    refreshJwt?: string;
    error?: string;
  }>;
  
  /**
   * Resolve DID to DID document
   */
  async resolveDid(did: string): Promise<{
    success: boolean;
    document?: any;
    error?: string;
  }>;
}
```

**依存関係**:
- `@atproto/api`: `pnpm add @atproto/api`（AT Protocol SDK）

**優先度**: **最高**

**詳細**:
- PDS APIエンドポイント: `https://bsky.social/xrpc/com.atproto.server.createAccount`
- **認証**: 認証不要（リクエストパラメータのみでアカウント作成可能）
- リクエストパラメータ: `email`, `password`, `handle`（オプション）, `inviteCode`（オプション）
- レスポンス: `did`, `handle`, `accessJwt`, `refreshJwt`
- エラーハンドリング: リトライ3回、指数バックオフ、タイムアウト30秒

**参考**: [AT Protocol API Documentation](https://docs.bsky.app/docs/api/com-atproto-server-create-account)

---

### Phase 2: API実装（必須）🔴 最高優先度

#### 2.1 認証エンドポイント追加

**ファイル**: `src/controllers/auth/AuthController.ts`（拡張）

**新規エンドポイント**:

##### `POST /auth/register` - メール/パスワード登録

**リクエスト**:
```typescript
interface EmailPasswordRegisterRequest {
  email: string;
  password: string;
  displayName: string;
  handle?: string; // AT Protocol handle（オプション）
}
```

**レスポンス**:
```typescript
interface RegisterResponse {
  success: boolean;
  data?: {
    primaryDid: string; // did:plc:...
    email: string;
    emailVerified: boolean;
    verificationTokenSent: boolean;
    authData?: AuthData; // JWT token（オプション）
  };
  error?: ApiError;
}
```

**フロー**:
1. メールアドレス・パスワード検証
2. メール重複チェック（`DynamoDBIdentityLookupItem`）
3. パスワードハッシュ化
4. PDS API呼び出し（DID生成）
5. `DynamoDBUserProfileItem`作成
6. `DynamoDBIdentityLinkItem`作成（メール/パスワード）
7. `DynamoDBIdentityLookupItem`作成（メール逆引き）
8. メール認証トークン生成・送信
9. JWT生成（オプション）

**優先度**: **最高**

---

##### `POST /auth/email-login` - メール/パスワードログイン

**リクエスト**:
```typescript
interface EmailPasswordLoginRequest {
  email: string;
  password: string;
}
```

**レスポンス**:
```typescript
interface LoginResponse {
  success: boolean;
  data?: AuthData; // JWT token
  error?: ApiError;
}
```

**フロー**:
1. メールアドレス正規化
2. `DynamoDBIdentityLookupItem`で`primaryDid`取得
3. `DynamoDBIdentityLinkItem`で認証情報取得
4. アカウントロックチェック
5. パスワード検証
6. ログイン失敗回数更新
7. メール認証済みチェック（`emailVerified: true`のみ許可）
8. JWT生成（`authMethod: 'email'`）
9. ログイン成功ログ更新

**優先度**: **最高**

---

##### `POST /auth/verify-email` - メール認証

**リクエスト**:
```typescript
interface VerifyEmailRequest {
  token: string;
  primaryDid: string;
}
```

**レスポンス**:
```typescript
interface VerifyEmailResponse {
  success: boolean;
  data?: {
    email: string;
    verified: boolean;
  };
  error?: ApiError;
}
```

**優先度**: **最高**

---

##### `POST /auth/resend-verification-email` - 認証メール再送信

**リクエスト**:
```typescript
interface ResendVerificationEmailRequest {
  primaryDid: string;
  email: string;
}
```

**優先度**: **高**

---

##### `GET /auth/verification-status` - 認証ステータス確認

**リクエスト**:
```typescript
// Query parameters
{
  primaryDid: string;
  email: string;
}
```

**優先度**: **高**

---

##### `POST /auth/reset-password-request` - パスワードリセット要求

**リクエスト**:
```typescript
interface ResetPasswordRequestRequest {
  email: string;
}
```

**優先度**: **高**

---

##### `POST /auth/reset-password` - パスワードリセット

**リクエスト**:
```typescript
interface ResetPasswordRequest {
  token: string;
  primaryDid: string;
  newPassword: string;
}
```

**優先度**: **高**

---

#### 2.2 JWT Payload拡張

**ファイル**: `src/middleware/passport.ts`（更新）

**変更内容**:
```typescript
export interface JwtPayload {
  sub: string; // primaryDid（DID）
  address?: string; // Flow address（Flow認証の場合）
  email?: string; // Email（メール認証の場合）
  authMethod: 'flow' | 'email' | 'did'; // 認証方法
  role: 'user' | 'admin' | 'minter' | 'pauser';
  iat: number;
  exp: number;
}

export interface PassportUser {
  id: string; // primaryDid
  address?: string; // Flow address
  email?: string; // Email
  authMethod: 'flow' | 'email' | 'did';
  role: 'user' | 'admin' | 'minter' | 'pauser';
}
```

**優先度**: **最高**

---

### Phase 3: データモデル統合（必須）🔴 最高優先度

#### 3.1 DynamoDBスキーマ拡張

既存の`DynamoDBIdentityLinkItem`を活用（既に定義済み）

**確認事項**:
- [ ] `DynamoDBIdentityLinkItem`の実装確認
- [ ] `DynamoDBIdentityLookupItem`の実装確認
- [ ] GSI設定（メール検索用）

**優先度**: **最高**

---

#### 3.2 SnsService拡張

**ファイル**: `src/services/SnsService.ts`（更新）

**追加機能**:
- メール/パスワード認証情報の保存・取得
- メール認証ステータスの更新
- パスワードリセットトークンの管理

**優先度**: **最高**

---

### Phase 4: セキュリティ強化（推奨）🟡 高優先度

#### 4.1 レート制限強化

**ファイル**: `src/services/RateLimitService.ts`（更新）

**追加機能**:
- ログイン試行回数制限（5回/15分）
- メール送信レート制限（3回/24時間）
- パスワードリセット要求レート制限（3回/24時間）

**優先度**: **高**

---

#### 4.2 アカウントロック機能

**実装内容**:
- ログイン失敗回数による自動ロック
- ロック解除時刻の設定
- ロック状態の確認

**優先度**: **高**

---

#### 4.3 監査ログ

**実装内容**:
- ログイン試行ログ
- メール送信ログ
- パスワード変更ログ
- IPアドレスハッシュ化保存

**優先度**: **中**

---

### Phase 5: ユーザー体験向上（推奨）🟢 中優先度

#### 5.1 パスワード強度チェック

**実装内容**:
- 最小長: 8文字
- 大文字・小文字・数字・記号の組み合わせ
- 一般的なパスワードの拒否

**優先度**: **高**

---

#### 5.2 メール認証完了通知

**実装内容**:
- 認証完了メール送信
- フロントエンドへの通知（オプション）

**優先度**: **中**

---

#### 5.3 パスワード変更機能

**エンドポイント**: `POST /auth/change-password`

**優先度**: **高**

---

## 🔄 実装フロー

### ユーザー登録フロー（メール/パスワード）

```
1. POST /auth/register
   ↓
2. メールアドレス・パスワード検証
   ↓
3. メール重複チェック（DynamoDBIdentityLookupItem）
   ↓
4. パスワードハッシュ化（PasswordService）
   ↓
5. PDS API呼び出し（PdsService.createAccount）
   ├─> DID生成（did:plc:...）
   └─> Handle生成（オプション）
   ↓
6. DynamoDBUserProfileItem作成
   ├─> PK: USER#{primaryDid}
   ├─> SK: PROFILE
   └─> primaryDid, handle, displayName等
   ↓
7. DynamoDBIdentityLinkItem作成
   ├─> PK: USER#{primaryDid}
   ├─> SK: LINK#email:{email}
   ├─> passwordHash, email, emailVerified: false
   └─> status: "pending"
   ↓
8. DynamoDBIdentityLookupItem作成
   ├─> PK: LINK#email:{email}
   ├─> SK: PRIMARY
   └─> primaryDid
   ↓
9. メール認証トークン生成（EmailVerificationService）
   ↓
10. 認証メール送信（EmailService）
    ↓
11. JWT生成（オプション、即座ログインする場合）
    ↓
12. レスポンス返却
```

### ログインフロー（メール/パスワード）

```
1. POST /auth/email-login
   ↓
2. メールアドレス正規化
   ↓
3. DynamoDBIdentityLookupItemでprimaryDid取得
   ↓
4. DynamoDBIdentityLinkItemで認証情報取得
   ↓
5. アカウントロックチェック（lockUntil）
   ├─> ロック中: エラー返却（ロック解除時刻を表示）
   └─> ロックなし: 次へ
   ↓
6. パスワード検証（PasswordService.verifyPassword）
   ├─> 成功: 次へ
   └─> 失敗: failedLoginCount++, lastFailedLoginAt更新
        ├─> 5回失敗: アカウントロック（lockUntil設定）
        └─> エラー返却
   ↓
7. メール認証済みチェック（emailVerified: true）✅ **必須**
   ├─> 未認証: エラー返却（EMAIL_NOT_VERIFIED）
   │   └─> エラーメッセージ: "メールアドレスの認証が必要です。認証メールを確認してください。"
   └─> 認証済み: 次へ
   ↓
8. JWT生成（authMethod: 'email'）
   ↓
9. ログイン成功ログ更新
   ├─> lastLoginAt更新
   ├─> lastLoginIpHash更新（オプション）
   └─> failedLoginCountリセット
   ↓
10. レスポンス返却
```

### メール認証フロー

```
1. ユーザーがメール内リンクをクリック
   ↓
2. POST /auth/verify-email
   ├─> token: 認証トークン
   └─> primaryDid: ユーザーのDID
   ↓
3. EmailVerificationService.verifyToken
   ├─> トークン検証
   ├─> 有効期限チェック
   └─> 使用済みチェック
   ↓
4. DynamoDBIdentityLinkItem更新
   ├─> emailVerified: true
   ├─> emailVerifiedAt: 現在時刻
   └─> status: "verified"
   ↓
5. DynamoDBUserProfileItem更新（オプション）
   ├─> primaryEmail: メールアドレス
   └─> emailLoginEnabled: true
   ↓
6. 認証完了メール送信（オプション）
   ↓
7. レスポンス返却
```

---

## 🔒 セキュリティ考慮事項

### 1. パスワードセキュリティ

- ✅ **bcryptハッシュ化**: salt rounds: 12（推奨）
- ✅ **パスワード強度チェック**: 最小8文字、複雑さ要件
- ✅ **平文保存禁止**: データベースに平文パスワードを保存しない
- ✅ **タイミング攻撃対策**: `crypto.timingSafeEqual()`使用

### 2. メール認証セキュリティ

- ✅ **トークンハッシュ化**: データベースに平文トークンを保存しない
- ✅ **有効期限管理**: 24-48時間の有効期限
- ✅ **使用済みトークンの無効化**: 即座に無効化
- ✅ **レート制限**: 再送信回数制限（3-5回/24時間）

### 3. アカウントセキュリティ

- ✅ **ログイン試行回数制限**: 5回/15分
- ✅ **アカウントロック**: 失敗回数超過で自動ロック
- ✅ **IPアドレスハッシュ化**: プライバシー保護
- ✅ **監査ログ**: 認証イベントの記録

### 4. データ保護

- ✅ **メール正規化**: 大文字小文字、空白の正規化
- ✅ **メール重複防止**: `DynamoDBIdentityLookupItem`で一意性保証
- ✅ **TTL設定**: DynamoDB TTLで自動削除
- ✅ **暗号化**: 機密情報の暗号化保存

---

## 📦 必要な依存関係

### 新規追加

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.6",
    "@aws-sdk/client-ses": "^3.879.0",
    "@atproto/api": "^0.9.0"
  }
}
```

### インストールコマンド

```bash
pnpm add bcryptjs @types/bcryptjs @aws-sdk/client-ses @atproto/api
```

---

## 🧪 テスト計画

### ユニットテスト

- [ ] PasswordService: ハッシュ化・検証テスト
- [ ] EmailVerificationService: トークン生成・検証テスト
- [ ] EmailService: メール送信テスト（SESモック）
- [ ] PdsService: DID生成テスト（PDSモック）
- [ ] UserAuthService: 認証フローテスト

### 統合テスト

- [ ] ユーザー登録フローテスト
- [ ] ログインフローテスト
- [ ] メール認証フローテスト
- [ ] パスワードリセットフローテスト
- [ ] DynamoDB統合テスト

### E2Eテスト

- [ ] 完全なユーザー登録→認証→ログインフロー
- [ ] Flow wallet認証との並行運用テスト
- [ ] エラーハンドリングテスト

---

## 📈 実装優先順位

### 🔴 Phase 1: 基盤実装（必須）- 最高優先度

1. **PasswordService** - パスワード管理
2. **EmailVerificationService** - メール認証
3. **EmailService** - メール送信
4. **PdsService** - PDS連携（DID生成）
5. **UserAuthService** - 統合認証サービス

### 🔴 Phase 2: API実装（必須）- 最高優先度

6. **POST /auth/register** - ユーザー登録
7. **POST /auth/email-login** - ログイン
8. **POST /auth/verify-email** - メール認証
9. **JWT Payload拡張** - 認証方法の識別

### 🟡 Phase 3: データモデル統合（必須）- 最高優先度

10. **DynamoDBスキーマ確認・拡張**
11. **SnsService拡張**

### 🟡 Phase 4: セキュリティ強化（推奨）- 高優先度

12. **レート制限強化**
13. **アカウントロック機能**
14. **パスワード強度チェック**

### 🟢 Phase 5: UX向上（推奨）- 中優先度

15. **POST /auth/resend-verification-email** - 再送信
16. **GET /auth/verification-status** - ステータス確認
17. **POST /auth/reset-password-request** - パスワードリセット要求
18. **POST /auth/reset-password** - パスワードリセット
19. **POST /auth/change-password** - パスワード変更

---

## 🔗 関連ドキュメント

- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - メール認証の詳細実装計画
- `AT_PROTOCOL_MIGRATION_TASKS.md` - AT Protocol対応タスク
- `DATA_MODEL_FINAL_CONFIRMATION.md` - データモデル最終確認
- `IMPLEMENTATION_READINESS_CHECKLIST.md` - 実装準備チェックリスト

---

## 📝 実装前の確認事項

### ✅ 決定済み事項

- [x] Followのsubject.uri形式: `at://{followedDid}/app.bsky.actor.profile/self`（決定済み）
- [x] PDS APIエンドポイント: `https://bsky.social`（決定済み）
- [x] PDS APIメソッド: `com.atproto.server.createAccount`（決定済み）
- [x] PDS API認証: 認証不要（調査完了）
- [x] メール認証未完了ユーザーのログイン: **禁止**（決定済み）
- [x] 環境変数管理: `.env`ファイルで管理（決定済み）

### ⚠️ 実装時に必要な設定

- [ ] メール送信サービス（AWS SES）の設定
  - SESサンドボックス解除（本番環境）
  - 送信元メールアドレスの検証
  - IAM権限の追加（`serverless.yml`）
  
- [ ] 環境変数の設定（`.env`ファイル）
  - `PDS_ENDPOINT`, `PDS_TIMEOUT`
  - `SES_REGION`, `SES_FROM_EMAIL`, `FRONTEND_URL`
  - `EMAIL_VERIFICATION_TOKEN_EXPIRY`, `EMAIL_VERIFICATION_MAX_RESENDS`
  - `PASSWORD_MIN_LENGTH`, `PASSWORD_BCRYPT_ROUNDS`
  
- [ ] DynamoDBテーブル・GSIの設定確認

### 推奨確認

- [ ] メールテンプレートのデザイン
- [ ] フロントエンドとの連携仕様
- [ ] エラーメッセージの多言語対応（将来的）

---

**最終更新**: 2025-12-30  
**状態**: 実装計画完了（実装はまだ行わない）  
**次回**: 実装開始前の最終確認後、Phase 1から順次実装

