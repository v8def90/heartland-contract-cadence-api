# 実装決定事項サマリー

**作成日**: 2025-12-30  
**目的**: 実装前の決定事項の整理と確認  
**状態**: 決定事項反映完了（実装はまだ行わない）

---

## ✅ 決定済み事項

### AT Protocol関連

1. ✅ **Followのsubject.uri形式**: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）
2. ✅ **PDS APIエンドポイント**: `https://bsky.social`
3. ✅ **PDS APIメソッド**: `com.atproto.server.createAccount`
4. ✅ **PDS API認証**: **認証不要**（リクエストパラメータのみでアカウント作成可能）
5. ✅ **PDS連携タイミング**: ユーザー登録時にPDS経由でDID生成
6. ✅ **Commentの扱い**: Reply Postとして扱う（`app.bsky.feed.post`コレクション）

### メール/パスワード認証関連

7. ✅ **認証方法**: メール/パスワード認証を追加（Flow wallet認証と並行運用）
8. ✅ **メール認証未完了ユーザーのログイン**: **禁止**（`emailVerified: true`のみログイン許可）
9. ✅ **データモデル**: 既存の`DynamoDBIdentityLinkItem`を活用
10. ✅ **JWT統合**: JWT Payloadに`authMethod`フィールドを追加
11. ✅ **環境変数管理**: `.env`ファイルで管理

### AWS SES関連

12. ⚠️ **AWS SES設定**: **未設定**（実装時に設定が必要）
   - SESサンドボックス解除（本番環境）
   - 送信元メールアドレスの検証
   - IAM権限の追加（`serverless.yml`）

---

## 📋 実装時に必要な設定

### 1. AWS SES設定

**手順**:
1. AWS SESコンソールで送信元メールアドレスを検証
2. 開発環境: SESサンドボックス（検証済みメールアドレスのみ送信可能）
3. 本番環境: SESサンドボックス解除申請
4. IAM権限を`serverless.yml`に追加

**IAM権限**（`serverless.yml`に追加）:
```yaml
- Effect: Allow
  Action:
    - ses:SendEmail
    - ses:SendRawEmail
  Resource: '*'
```

### 2. 環境変数の追加（`.env`ファイル）

```bash
# PDS Configuration
PDS_ENDPOINT=https://bsky.social
PDS_TIMEOUT=30000  # 30秒（ミリ秒）

# Email Service (SES)
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=noreply@example.com
FRONTEND_URL=https://app.example.com

# Email Verification
EMAIL_VERIFICATION_TOKEN_EXPIRY=86400000  # 24時間（ミリ秒）
EMAIL_VERIFICATION_MAX_RESENDS=3  # 24時間あたり

# Password
PASSWORD_MIN_LENGTH=8
PASSWORD_BCRYPT_ROUNDS=12
```

### 3. 依存関係の追加

```bash
pnpm add bcryptjs @types/bcryptjs @aws-sdk/client-ses @atproto/api @atproto/tid
```

---

## 🔄 実装フロー（決定事項反映版）

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
   ├─> エンドポイント: https://bsky.social/xrpc/com.atproto.server.createAccount
   ├─> 認証: 不要
   ├─> リクエスト: email, password, handle（オプション）
   ├─> レスポンス: did, handle, accessJwt, refreshJwt
   ├─> リトライ: 3回、指数バックオフ
   └─> タイムアウト: 30秒
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
   ↓
6. パスワード検証（PasswordService.verifyPassword）
   ↓
7. メール認証済みチェック（emailVerified: true）✅ **必須**
   ├─> 未認証: エラー返却（EMAIL_NOT_VERIFIED）
   │   └─> エラーメッセージ: "メールアドレスの認証が必要です。認証メールを確認してください。"
   └─> 認証済み: 次へ
   ↓
8. JWT生成（authMethod: 'email'）
   ↓
9. ログイン成功ログ更新
   ↓
10. レスポンス返却
```

---

## 📝 実装時の注意点

### PDS連携

- **認証不要**: `com.atproto.server.createAccount`は認証不要
- **エラーハンドリング**: PDSが利用できない場合はユーザー登録を失敗として返却
- **リトライ**: 3回、指数バックオフ
- **タイムアウト**: 30秒

### メール認証

- **ログイン制限**: `emailVerified: true`のみログイン許可
- **エラーメッセージ**: 未認証ユーザーには明確なエラーメッセージを返却
- **再送信**: 未認証ユーザーは認証メール再送信のみ可能

### 環境変数

- **管理方法**: `.env`ファイルで管理
- **セキュリティ**: `.env`ファイルは`.gitignore`に追加済み
- **本番環境**: `serverless.yml`で環境変数を設定

---

## 🔗 関連ドキュメント

- `EMAIL_PASSWORD_AUTH_IMPLEMENTATION_PLAN.md` - 実装計画詳細
- `PRE_IMPLEMENTATION_CHECKLIST.md` - 実装前確認チェックリスト
- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - メール認証詳細
- `DATA_MODEL_FINAL_CONFIRMATION.md` - データモデル確認
- `FOLLOW_SUBJECT_URI_ANALYSIS.md` - Follow形式分析

---

**最終更新**: 2025-12-30  
**状態**: 決定事項反映完了（実装はまだ行わない）  
**次回**: 実装開始（AWS SES設定後）

