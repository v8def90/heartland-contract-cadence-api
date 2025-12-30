# 実装前最終確認チェックリスト

**作成日**: 2025-12-30  
**目的**: 実装開始前の最終確認事項の整理  
**状態**: 実装準備完了（実装はまだ行わない）

---

## ✅ 決定済み事項

### AT Protocol関連

1. ✅ **Followのsubject.uri形式**: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）
2. ✅ **PDS APIエンドポイント**: 開発環境用として`https://bsky.social`を使用
3. ✅ **PDS連携タイミング**: ユーザー登録時にPDS経由でDID生成
4. ✅ **Commentの扱い**: Reply Postとして扱う（`app.bsky.feed.post`コレクション）

### メール/パスワード認証関連

5. ✅ **認証方法**: メール/パスワード認証を追加（Flow wallet認証と並行運用）
6. ✅ **データモデル**: 既存の`DynamoDBIdentityLinkItem`を活用
7. ✅ **JWT統合**: JWT Payloadに`authMethod`フィールドを追加
8. ✅ **実装計画**: `EMAIL_PASSWORD_AUTH_IMPLEMENTATION_PLAN.md`に詳細記載

---

## ⚠️ 確認が必要な項目

### 🔴 高優先度（実装前に必須決定）

#### 1. PDS連携の詳細仕様 ✅ **決定済み**

**決定済み**:

- ✅ エンドポイント: `https://bsky.social`
- ✅ タイミング: ユーザー登録時
- ✅ APIメソッド: `com.atproto.server.createAccount`
- ✅ 認証方法: **認証不要**（リクエストパラメータのみでアカウント作成可能）

**調査結果**:

- `com.atproto.server.createAccount`は認証不要のAPI
- リクエストパラメータ: `email`, `handle`, `password`, `inviteCode`（オプション）, `verificationCode`（オプション）
- レスポンス: `accessJwt`, `refreshJwt`, `handle`, `did`（DID）

**実装方針**:

- リトライ: 3回、指数バックオフ
- タイムアウト: 30秒
- エラー時: ユーザー登録を失敗として返却（部分的な登録を避ける）
- レート制限: PDS側の制限に注意（実装時に監視）

**参考**: [AT Protocol API Documentation](https://docs.bsky.app/docs/api/com-atproto-server-create-account)

---

#### 2. Flow wallet認証時のDID生成タイミング

**確認事項**:

- [ ] **既存Flow wallet認証ユーザー**: DID生成タイミングは？
  - オプション1: 初回ログイン時にDID生成（遅延生成）
  - オプション2: 既存ユーザーはDIDなしで運用
  - オプション3: 手動でDID生成を促す
- [ ] **新規Flow wallet認証ユーザー**: DID生成タイミングは？
  - オプション1: 初回ログイン時にDID生成
  - オプション2: ユーザー登録時にDID生成（メール/パスワードと同じ）
- [ ] **既存ユーザーの移行**: 既存のFlow wallet認証ユーザーはどうするか？
  - 移行スクリプトで一括DID生成？
  - 段階的にDID生成？

**推奨**:

- 新規Flow wallet認証: 初回ログイン時にDID生成
- 既存ユーザー: 初回ログイン時にDID生成（遅延生成）
- 移行: 段階的にDID生成（強制しない）

---

#### 3. メール認証未完了ユーザーのログイン可否 ✅ **決定済み**

**決定事項**:

- ✅ **未認証メールでのログイン**: **禁止**（`emailVerified: true`のみログイン許可）

**実装方針**:

- ログイン時に`emailVerified: true`をチェック
- 未認証の場合はエラー返却（`EMAIL_NOT_VERIFIED`）
- 未認証ユーザーは認証メール再送信のみ可能
- エラーメッセージ: "メールアドレスの認証が必要です。認証メールを確認してください。"

---

#### 4. rkey生成方法

**確認事項**:

- [ ] **ライブラリ選択**: どのライブラリを使用するか？
  - `@atproto/tid`（AT Protocol標準、推奨）
  - `ulid`（ULID形式）
  - その他？
- [ ] **rkey形式**: どの形式を使用するか？
  - TID形式: `3k2abc123...`（AT Protocol標準）
  - ULID形式: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

**推奨**:

- `@atproto/tid`を使用（AT Protocol標準準拠）
- TID形式で生成

**依存関係**:

```bash
pnpm add @atproto/tid
```

---

#### 5. AT URI生成ユーティリティ

**確認事項**:

- [ ] **実装場所**: どこに実装するか？
  - `src/utils/atUri.ts`（新規作成）
  - `src/services/AtProtocolService.ts`（新規作成）
  - 既存のサービスに統合？
- [ ] **機能**: どの機能を実装するか？
  - AT URI生成: `generateAtUri(did, collection, rkey)`
  - AT URI解析: `parseAtUri(uri)`
  - AT URI検証: `validateAtUri(uri)`

**推奨**:

- `src/utils/atUri.ts`に実装
- 生成・解析・検証の3機能を実装

---

#### 6. AWS SES設定 ⚠️ **未設定（実装時に設定が必要）**

**現状**:

- ⚠️ AWS SESは未設定（実装時に設定が必要）

**実装時に必要な設定**:

- [ ] **SES設定**:
  - SESサンドボックス解除（本番環境の場合）
  - 送信元メールアドレス（From）の設定・検証
  - 送信元ドメインの認証（SPF/DKIM/DMARC）
- [ ] **環境変数**（`.env`ファイルに追加）:
  ```bash
  SES_REGION=ap-northeast-1
  SES_FROM_EMAIL=noreply@example.com
  FRONTEND_URL=https://app.example.com
  ```
- [ ] **IAM権限**（`serverless.yml`に追加）:
  ```yaml
  - Effect: Allow
    Action:
      - ses:SendEmail
      - ses:SendRawEmail
    Resource: '*'
  ```

**実装時の手順**:

1. AWS SESコンソールで送信元メールアドレスを検証
2. 開発環境: SESサンドボックス（検証済みメールアドレスのみ送信可能）
3. 本番環境: SESサンドボックス解除申請
4. IAM権限を`serverless.yml`に追加
5. 環境変数を`.env`ファイルに追加

---

#### 7. 環境変数の追加 ✅ **決定済み**

**決定事項**:

- ✅ **環境変数の管理**: `.env`ファイルで管理

**実装時に追加する環境変数**:

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

**実装時の注意点**:

- `.env`ファイルは`.gitignore`に追加済み（確認）
- 本番環境: `serverless.yml`で環境変数を設定
- 機密情報: AWS Secrets Managerを検討（将来的）

---

### 🟡 中優先度（実装中に検討可能）

#### 8. メールテンプレート

**確認事項**:

- [ ] **テンプレート形式**: どの形式を使用するか？
  - HTMLテンプレート（推奨）
  - プレーンテキスト
  - 両方
- [ ] **テンプレート管理**: どこで管理するか？
  - コード内に直接記述
  - 外部ファイル（`templates/email/`）
  - データベース
- [ ] **多言語対応**: 将来的に多言語対応するか？
  - 現時点では日本語のみで問題ないか？

**推奨**:

- HTMLテンプレート（コード内に直接記述）
- 将来的に外部ファイル化を検討

---

#### 9. パスワード強度要件

**確認事項**:

- [ ] **最小長**: 何文字以上か？
  - 推奨: 8文字以上
- [ ] **複雑さ要件**: どの要件を満たすか？
  - 大文字・小文字・数字・記号の組み合わせ
  - 一般的なパスワードの拒否
- [ ] **エラーメッセージ**: どのように表示するか？

**推奨**:

- 最小長: 8文字
- 複雑さ: 大文字・小文字・数字・記号のうち3種類以上
- エラーメッセージ: 具体的な要件を表示

---

#### 10. データ移行計画

**確認事項**:

- [ ] **既存データ**: 既存のuserIdベースのデータはどうするか？
  - 移行スクリプトで一括移行？
  - 段階的に移行？
  - 並行運用？
- [ ] **後方互換性**: 既存APIとの互換性はどうするか？
  - APIバージョニング（`/api/v1/`, `/api/v2/`）
  - 既存APIを維持しながら新APIを追加

**推奨**:

- 段階的移行: 既存データと新データの並行運用
- APIバージョニング: `/api/v1/`と`/api/v2/`の並行運用

---

#### 11. エラーハンドリング戦略

**確認事項**:

- [ ] **PDS連携エラー**: PDSが利用できない場合の処理
  - ユーザー登録を失敗として返却（推奨）
  - 部分的な登録を避ける
- [ ] **メール送信エラー**: SES送信失敗時の処理
  - リトライするか？
  - エラーを返却するか？
- [ ] **DynamoDBエラー**: データベースエラー時の処理
  - トランザクションロールバック
  - エラーログ記録

**推奨**:

- PDS連携エラー: ユーザー登録を失敗として返却
- メール送信エラー: リトライ3回、失敗時はエラー返却
- DynamoDBエラー: トランザクションロールバック

---

### 🟢 低優先度（実装後に最適化可能）

#### 12. 監査ログ

**確認事項**:

- [ ] **ログ内容**: どの情報を記録するか？
  - ログイン試行（成功・失敗）
  - メール送信
  - パスワード変更
- [ ] **ログ保存先**: どこに保存するか？
  - CloudWatch Logs
  - DynamoDB
  - その他

**推奨**:

- CloudWatch Logsに記録
- 将来的にDynamoDBに移行を検討

---

#### 13. パフォーマンス最適化

**確認事項**:

- [ ] **キャッシュ**: どのデータをキャッシュするか？
  - DID解決結果
  - メール認証ステータス
- [ ] **バッチ処理**: バッチ処理が必要か？
  - メール送信のバッチ処理
  - データ移行のバッチ処理

**推奨**:

- 実装後に最適化
- 必要に応じてキャッシュを追加

---

## 📋 実装開始前の必須確認事項

### 必須決定事項（実装前に決定）

1. ✅ Followのsubject.uri形式: 決定済み
2. ✅ PDS APIエンドポイント: 決定済み
3. ✅ **PDS APIメソッド**: `com.atproto.server.createAccount`（決定済み）
4. ✅ **PDS API認証**: 認証不要（調査完了）
5. ⚠️ **Flow wallet認証時のDID生成**: 初回ログイン時に生成で問題ないか？
6. ✅ **メール認証未完了ユーザーのログイン**: **禁止**（決定済み）
7. ⚠️ **rkey生成方法**: `@atproto/tid`で問題ないか？
8. ⚠️ **AWS SES設定**: 未設定（実装時に設定が必要）
9. ✅ **環境変数**: `.env`ファイルで管理（決定済み）

### 推奨確認事項（実装中に検討可能）

10. メールテンプレートの形式・管理方法
11. パスワード強度要件の詳細
12. データ移行計画の詳細
13. エラーハンドリング戦略の詳細

---

## 🎯 実装開始可能な条件

### 必須条件

- ✅ 高優先度項目（1-7）の確認完了（一部決定済み）
- ⚠️ AWS SES設定: 未設定（実装時に設定が必要）
- ✅ 環境変数管理方法: `.env`ファイルで管理（決定済み）
- ⚠️ 依存関係の追加: 実装時に追加（`bcryptjs`, `@aws-sdk/client-ses`, `@atproto/api`, `@atproto/tid`）

### 推奨条件

- 🟡 中優先度項目（8-11）の検討完了
- 🟢 低優先度項目（12-13）の計画完了

---

## 📝 次のステップ

### Step 1: 必須確認事項への回答

上記の必須確認事項（1-9）への回答があれば、実装を開始できます。

### Step 2: 実装開始

1. **Phase 1**: 基盤実装（PasswordService, EmailVerificationService等）
2. **Phase 2**: API実装（認証エンドポイント）
3. **Phase 3**: データモデル統合
4. **Phase 4-5**: セキュリティ強化・UX向上

### Step 3: 実装後の確認

- テスト実行
- ドキュメント更新
- デプロイ準備

---

## 🔗 関連ドキュメント

- `EMAIL_PASSWORD_AUTH_IMPLEMENTATION_PLAN.md` - 実装計画詳細
- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - メール認証詳細
- `DATA_MODEL_FINAL_CONFIRMATION.md` - データモデル確認
- `IMPLEMENTATION_READINESS_CHECKLIST.md` - 実装準備チェックリスト
- `FOLLOW_SUBJECT_URI_ANALYSIS.md` - Follow形式分析

---

**最終更新**: 2025-12-30  
**状態**: 確認事項整理完了（実装はまだ行わない）  
**次回**: 必須確認事項への回答後、実装開始
