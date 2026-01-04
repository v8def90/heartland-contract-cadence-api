# メール本人認証機能 実装計画

**作成日**: 2025-12-30  
**目的**: メールアドレス検証（Email Verification）機能の包括的な実装計画  
**参考**: OWASP Email Verification Best Practices

---

## 📋 概要

メール本人認証は、ユーザーが登録したメールアドレスが実際に本人のものであることを確認するための重要なセキュリティ機能です。以下の機能を実装することで、アカウントの安全性と信頼性を向上させます。

---

## 🎯 実装すべき機能一覧

### 1. **コア機能（必須）** ✅

#### 1.1 メール認証トークン生成・送信

- **目的**: ユーザー登録時またはメール変更時に認証トークンを生成し、メール送信
- **実装内容**:
  - セキュアなランダムトークン生成（32-64文字、URL-safe）
  - トークンの有効期限設定（24-48時間推奨）
  - メール送信機能（AWS SES等）
  - 認証リンクの生成（`https://api.example.com/auth/verify-email?token=xxx`）

#### 1.2 メール認証トークン検証

- **目的**: ユーザーがメール内のリンクをクリックした際にトークンを検証
- **実装内容**:
  - トークンの有効性チェック（存在、有効期限、使用済みチェック）
  - トークン使用後の無効化（再利用防止）
  - メール認証ステータスの更新
  - ユーザープロフィールの認証ステータス更新

#### 1.3 認証ステータス管理

- **目的**: メール認証の状態を追跡・管理
- **実装内容**:
  - 認証ステータス（`unverified`, `verified`, `expired`）
  - 認証日時の記録
  - 認証試行回数の記録

#### 1.4 認証メール再送信

- **目的**: ユーザーがメールを受信できなかった場合の再送信
- **実装内容**:
  - 再送信回数制限（24時間あたり3-5回）
  - レート制限（スパム防止）
  - 前回送信からの待機時間（1-5分）

---

### 2. **セキュリティ機能（推奨）** 🔒

#### 2.1 レート制限

- **目的**: スパム・不正利用の防止
- **実装内容**:
  - メール送信レート制限（IPアドレス、ユーザーID単位）
  - トークン検証試行回数制限（ブルートフォース攻撃防止）
  - 再送信レート制限

#### 2.2 トークンセキュリティ

- **目的**: トークンの安全性確保
- **実装内容**:
  - 暗号学的に安全なランダムトークン生成
  - トークンのハッシュ化保存（データベースに平文保存しない）
  - トークンの有効期限管理（TTL）
  - 使用済みトークンの即座無効化

#### 2.3 メールアドレス検証

- **目的**: メールアドレスの形式検証
- **実装内容**:
  - RFC 5322準拠のメールアドレス形式検証
  - ドメイン検証（MXレコード確認、オプション）
  - 無効なメールアドレスの拒否

---

### 3. **ユーザー体験向上機能（オプション）** ✨

#### 3.1 認証ステータス確認API

- **目的**: ユーザーが認証ステータスを確認できる
- **実装内容**:
  - `GET /auth/verification-status` エンドポイント
  - 認証ステータス、有効期限、再送信可能かどうかの情報

#### 3.2 認証期限延長

- **目的**: トークン有効期限が切れた場合の延長
- **実装内容**:
  - 期限切れトークンでの新規トークン生成
  - 自動再送信機能

#### 3.3 認証完了通知

- **目的**: 認証完了時の通知
- **実装内容**:
  - 認証完了メール送信
  - フロントエンドへの通知（WebSocket/SSE）

---

## 🏗️ アーキテクチャ設計

### データモデル

```typescript
/**
 * Email Verification Token
 */
interface EmailVerificationToken {
  /** Token ID (primary key) */
  tokenId: string; // UUID
  /** User ID */
  userId: string;
  /** Email address to verify */
  email: string;
  /** Hashed token (stored in DB) */
  tokenHash: string; // SHA-256 hash
  /** Token status */
  status: 'pending' | 'verified' | 'expired' | 'revoked';
  /** Token expiration timestamp */
  expiresAt: string; // ISO 8601
  /** Token created timestamp */
  createdAt: string;
  /** Token verified timestamp (if verified) */
  verifiedAt?: string;
  /** Number of verification attempts */
  attemptCount: number;
  /** Maximum attempts allowed */
  maxAttempts: number;
}

/**
 * Email Verification Status
 */
interface EmailVerificationStatus {
  /** User ID */
  userId: string;
  /** Email address */
  email: string;
  /** Verification status */
  isVerified: boolean;
  /** Verification timestamp */
  verifiedAt?: string;
  /** Last verification attempt timestamp */
  lastAttemptAt?: string;
  /** Number of verification attempts */
  attemptCount: number;
  /** Can resend verification email */
  canResend: boolean;
  /** Next resend available timestamp */
  nextResendAt?: string;
}
```

### DynamoDBスキーマ

```typescript
/**
 * DynamoDB Email Verification Token Item
 */
interface DynamoDBEmailVerificationTokenItem {
  PK: string; // EMAIL_VERIFICATION#{userId}
  SK: string; // TOKEN#{tokenId}
  GSI1PK: string; // EMAIL#{email}
  GSI1SK: string; // TOKEN#{createdAt}
  tokenId: string;
  userId: string;
  email: string;
  tokenHash: string; // SHA-256 hash of token
  status: 'pending' | 'verified' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  verifiedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  ttl: number; // DynamoDB TTL (expiresAt timestamp)
}

/**
 * DynamoDB Email Verification Status Item
 */
interface DynamoDBEmailVerificationStatusItem {
  PK: string; // USER#{userId}
  SK: string; // EMAIL_VERIFICATION
  GSI1PK: string; // EMAIL#{email}
  GSI1SK: string; // STATUS
  userId: string;
  email: string;
  isVerified: boolean;
  verifiedAt?: string;
  lastAttemptAt?: string;
  attemptCount: number;
  lastResendAt?: string;
  resendCount: number;
  maxResendsPerDay: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 📝 実装タスク詳細

### Phase 1: 基盤実装（必須）

#### 1.1 Email Verification Service

- [ ] **`src/services/EmailVerificationService.ts` 作成**
  - トークン生成機能
  - トークン検証機能
  - トークン管理機能
  - ステータス管理機能

#### 1.2 Email Service

- [ ] **`src/services/EmailService.ts` 作成**
  - AWS SES統合
  - メール送信機能
  - メールテンプレート管理
  - 送信レート制限

#### 1.3 Token Generation Utility

- [ ] **`src/utils/tokenGenerator.ts` 作成**
  - セキュアなランダムトークン生成
  - トークンハッシュ化
  - トークン検証

#### 1.4 DynamoDB Schema Extension

- [ ] **DynamoDBテーブル拡張**
  - Email Verification Tokenテーブル
  - Email Verification Statusテーブル
  - GSI設定

### Phase 2: API実装（必須）

#### 2.1 認証エンドポイント

- [ ] **`POST /auth/send-verification-email`**
  - 認証メール送信
  - レート制限
  - 再送信制御

- [ ] **`POST /auth/verify-email`**
  - トークン検証
  - ステータス更新
  - エラーハンドリング

- [ ] **`GET /auth/verification-status`**
  - 認証ステータス取得
  - 再送信可能かどうかの情報

- [ ] **`POST /auth/resend-verification-email`**
  - 認証メール再送信
  - レート制限チェック

### Phase 3: 統合（必須）

#### 3.1 ユーザー登録フロー統合

- [ ] **`POST /auth/register` 拡張**
  - 登録時に認証メール自動送信
  - 認証ステータスの初期化

#### 3.2 メール変更フロー統合

- [ ] **メール変更時の認証**
  - 新メールアドレスへの認証メール送信
  - 旧メールアドレスへの通知

#### 3.3 認証ステータスチェック

- [ ] **保護エンドポイントでの認証チェック**
  - 認証済みユーザーのみアクセス可能
  - 認証未完了時のエラーレスポンス

### Phase 4: セキュリティ強化（推奨）

#### 4.1 レート制限実装

- [ ] **RateLimitService拡張**
  - メール送信レート制限
  - トークン検証試行回数制限

#### 4.2 監査ログ

- [ ] **認証イベントログ**
  - メール送信ログ
  - トークン検証ログ
  - 失敗試行ログ

---

## 🔧 技術実装詳細

### 1. トークン生成

```typescript
import crypto from 'crypto';

/**
 * Generate secure random token for email verification
 *
 * @param length - Token length in bytes (default: 32)
 * @returns Base64 URL-safe encoded token
 */
export function generateVerificationToken(length: number = 32): string {
  const randomBytes = crypto.randomBytes(length);
  return randomBytes.toString('base64url');
}

/**
 * Hash token for storage
 *
 * @param token - Plain token
 * @returns SHA-256 hash of token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token against hash
 *
 * @param token - Plain token
 * @param hash - Stored hash
 * @returns True if token matches hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}
```

### 2. メール送信（AWS SES）

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * Send verification email
 *
 * @param email - Recipient email address
 * @param token - Verification token
 * @param userId - User ID
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userId: string
): Promise<void> {
  const sesClient = new SESClient({ region: process.env.AWS_REGION });

  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}&userId=${userId}`;

  const emailContent = `
    <h1>メールアドレス認証</h1>
    <p>以下のリンクをクリックしてメールアドレスを認証してください。</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>このリンクは24時間有効です。</p>
    <p>このメールに心当たりがない場合は、無視してください。</p>
  `;

  const command = new SendEmailCommand({
    Source: process.env.VERIFICATION_EMAIL_FROM || 'noreply@example.com',
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'メールアドレス認証',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: emailContent,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}
```

### 3. トークン検証

```typescript
/**
 * Verify email verification token
 *
 * @param token - Verification token
 * @param userId - User ID
 * @returns Verification result
 */
export async function verifyEmailToken(
  token: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  email?: string;
}> {
  // 1. Get token from database
  const tokenItem = await getTokenByUserId(userId);

  if (!tokenItem) {
    return { success: false, error: 'Token not found' };
  }

  // 2. Check token status
  if (tokenItem.status !== 'pending') {
    return { success: false, error: 'Token already used or expired' };
  }

  // 3. Check expiration
  if (new Date(tokenItem.expiresAt) < new Date()) {
    await markTokenAsExpired(tokenItem.tokenId);
    return { success: false, error: 'Token expired' };
  }

  // 4. Verify token hash
  if (!verifyToken(token, tokenItem.tokenHash)) {
    await incrementAttemptCount(tokenItem.tokenId);
    return { success: false, error: 'Invalid token' };
  }

  // 5. Check attempt count
  if (tokenItem.attemptCount >= tokenItem.maxAttempts) {
    await markTokenAsRevoked(tokenItem.tokenId);
    return { success: false, error: 'Too many attempts' };
  }

  // 6. Mark token as verified
  await markTokenAsVerified(tokenItem.tokenId, tokenItem.email);

  // 7. Update user email verification status
  await updateEmailVerificationStatus(userId, tokenItem.email, true);

  return { success: true, email: tokenItem.email };
}
```

---

## 📊 フロー図

### ユーザー登録フロー

```
1. ユーザー登録 (POST /auth/register)
   ↓
2. パスワードハッシュ化・保存
   ↓
3. メール認証トークン生成
   ↓
4. トークン保存（DynamoDB）
   ↓
5. 認証メール送信（AWS SES）
   ↓
6. ユーザーにメール通知
   ↓
7. ユーザーがメール内リンクをクリック
   ↓
8. トークン検証 (POST /auth/verify-email)
   ↓
9. メール認証完了
   ↓
10. ユーザープロフィール更新（isEmailVerified: true）
```

### メール変更フロー

```
1. メールアドレス変更要求 (PUT /sns/users/{userId}/email)
   ↓
2. 新メールアドレスへの認証トークン生成
   ↓
3. 新メールアドレスに認証メール送信
   ↓
4. 旧メールアドレスに変更通知メール送信
   ↓
5. ユーザーが新メール内リンクをクリック
   ↓
6. トークン検証
   ↓
7. メールアドレス変更完了
```

---

## 🔒 セキュリティ考慮事項

### 1. トークンセキュリティ

- ✅ **暗号学的に安全なランダム生成**: `crypto.randomBytes()`
- ✅ **ハッシュ化保存**: データベースに平文保存しない
- ✅ **有効期限管理**: 24-48時間の有効期限
- ✅ **使用済みトークンの無効化**: 即座に無効化
- ✅ **タイミング攻撃対策**: `crypto.timingSafeEqual()`使用

### 2. レート制限

- ✅ **メール送信制限**: 24時間あたり3-5回
- ✅ **トークン検証試行制限**: 5-10回
- ✅ **IPアドレス単位の制限**: DDoS攻撃防止

### 3. メール送信セキュリティ

- ✅ **SPF/DKIM/DMARC設定**: メール送信元の認証
- ✅ **送信元アドレスの固定**: なりすまし防止
- ✅ **メール内容の検証**: XSS対策

### 4. データ保護

- ✅ **トークンの暗号化**: ハッシュ化保存
- ✅ **TTL設定**: DynamoDB TTLで自動削除
- ✅ **監査ログ**: 認証イベントの記録

---

## 📦 必要な依存関係

### AWS SDK

```json
{
  "dependencies": {
    "@aws-sdk/client-ses": "^3.879.0"
  }
}
```

### その他

- `crypto` (Node.js標準ライブラリ)
- `uuid` (既存)

---

## 🧪 テスト計画

### ユニットテスト

- [ ] トークン生成・検証テスト
- [ ] トークンハッシュ化テスト
- [ ] 有効期限チェックテスト
- [ ] レート制限テスト

### 統合テスト

- [ ] メール送信テスト（SESモック）
- [ ] トークン検証フローテスト
- [ ] DynamoDB統合テスト
- [ ] エンドツーエンドテスト

---

## 📈 実装優先順位

### Phase 1: 最小限の実装（必須）

1. トークン生成・検証機能
2. メール送信機能（AWS SES）
3. トークン検証エンドポイント
4. 認証ステータス管理

### Phase 2: 基本機能（推奨）

5. 認証メール再送信
6. 認証ステータス確認API
7. レート制限

### Phase 3: 拡張機能（オプション）

8. 認証期限延長
9. 認証完了通知
10. 監査ログ

---

## 🔗 参考リソース

- [OWASP Email Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Verification_Cheat_Sheet.html)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [RFC 5322 - Internet Message Format](https://tools.ietf.org/html/rfc5322)
- [Node.js crypto Documentation](https://nodejs.org/api/crypto.html)

---

**最終更新**: 2025-12-30  
**次回レビュー**: Phase 1実装完了後
