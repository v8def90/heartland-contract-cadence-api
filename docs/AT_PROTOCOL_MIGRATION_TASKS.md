# AT Protocol準拠タスク整理

**作成日**: 2025-12-30  
**目的**: SNS機能をAT Protocol (ATProto) に準拠させるためのタスク分類  
**参考**: [AT Protocol Specification](https://atproto.com/)

---

## 📋 タスク分類の基準

### 🔴 **現時点で対応すべき項目（後から変更が困難）**

- データベーススキーマ・データモデルの根本的な変更
- ID体系の変更（全システムに影響）
- ストレージ構造の変更
- 認証基盤の変更
- アーキテクチャの根本的な変更

### 🟡 **将来的に対応可能な項目（後からでも対応可能）**

- APIエンドポイントの追加・変更
- レスポンス形式の調整
- 機能追加（既存構造を維持）
- 最適化・パフォーマンス改善
- 外部サービス統合

---

## 🔴 現時点で対応すべき項目（後から変更が困難）

### 0. **メール/パスワード認証の追加** ⭐ 新規要件

#### 現状

- Flow wallet認証のみ（FlowAuthService, BloctoAuthService）
- JWT認証基盤は存在
- UserProfileにemailフィールドは存在（オプション）
- パスワード保存の仕組みなし

#### 要件

- **メール/パスワード認証**: 従来型の認証方法を追加
- **Flow wallet認証との並行運用**: 両方の認証方法をサポート
- **ユーザー登録**: メール/パスワードでの新規登録
- **認証方法の識別**: JWT payloadで認証方法を区別

#### 対応内容

```typescript
// 新しいデータモデル
interface UserCredentials {
  userId: string;
  email: string;
  passwordHash: string; // bcrypt hash
  authMethod: 'flow' | 'email'; // 認証方法
  flowAddress?: string; // Flow wallet認証の場合
  createdAt: string;
  updatedAt: string;
}

// 認証リクエスト
interface EmailPasswordLoginRequest {
  email: string;
  password: string;
}

interface EmailPasswordRegisterRequest {
  email: string;
  password: string;
  displayName: string;
  username: string;
}
```

#### 実装タスク

- [ ] **パスワードハッシュ化サービス**
  - `src/services/PasswordService.ts` 新規作成
  - bcryptによるパスワードハッシュ化
  - パスワード検証機能
  - 優先度: **最高**

- [ ] **ユーザー認証情報管理サービス**
  - `src/services/UserAuthService.ts` 新規作成
  - メール/パスワード認証
  - Flow wallet認証との統合
  - 認証方法の管理
  - 優先度: **最高**

- [ ] **DynamoDBスキーマ拡張**
  - `USER_CREDENTIALS#{email}` テーブル/アイテム追加
  - パスワードハッシュ保存
  - 認証方法の保存
  - 優先度: **最高**

- [ ] **認証エンドポイント追加**
  - `POST /auth/register` - メール/パスワード登録
  - `POST /auth/email-login` - メール/パスワードログイン
  - 既存Flow wallet認証との統合
  - 優先度: **最高**

- [ ] **JWT Payload拡張**
  - `authMethod` フィールド追加
  - `email` フィールド追加（メール認証の場合）
  - 優先度: **高**

- [ ] **データモデル拡張**
  - `UserProfile.email` を必須に変更（メール認証の場合）
  - 認証方法の識別フィールド追加
  - 優先度: **高**

#### 影響範囲

- ✅ 認証システム（AuthController, 認証サービス）
- ✅ データモデル（UserProfile, 認証リクエスト/レスポンス）
- ✅ DynamoDBスキーマ（ユーザー認証情報テーブル）
- ✅ JWT Payload（認証方法の識別）
- ✅ ミドルウェア（認証方法の判定）

#### セキュリティ考慮事項

- ✅ **パスワードハッシュ化**: bcrypt（salt rounds: 10-12推奨）
- ✅ **レート制限**: ログイン試行回数制限
- ✅ **メール検証**: メールアドレス検証（将来的）
- ✅ **パスワード強度**: 最小長、複雑さ要件
- ✅ **セッション管理**: JWT有効期限の適切な設定

#### 依存関係

- `bcrypt` または `bcryptjs` パッケージ追加
- メール送信サービス（将来的なメール認証用）

---

### 1. **ID体系の変更: UUID → DID (Decentralized Identifier)**

#### 現状

- `userId`: UUID (`user-123`, `user_${hash}`)
- `postId`: UUID (`post-${uuidv4()}`)
- `commentId`: UUID (`comment-${uuidv4()}`)
- `walletAddress`: Flow address (`0x58f9e6153690c852`)

#### AT Protocol要件

- **DID**: `did:plc:xxx`, `did:web:xxx`, `did:key:xxx`
- **Handle**: `@username.bsky.social` (オプション)
- **AT URI**: `at://did:plc:xxx/app.bsky.feed.post/xxx`

#### 対応内容

```typescript
// 変更が必要なファイル
- src/models/responses/SnsResponses.ts
  - userId: string → did: string
  - postId: string → atUri: string

- src/services/SnsService.ts
  - DynamoDBUserItem.userId → did
  - DynamoDBPostItem.postId → atUri

- src/controllers/sns/**/*.ts
  - 全コントローラーでID体系変更
```

#### 実装タスク

- [ ] **DID生成・管理サービスの実装**
  - `src/services/DidService.ts` 新規作成
  - DID解決機能（did:plc, did:web対応）
  - DIDドキュメント管理
  - 優先度: **最高**

- [ ] **データモデルのID体系変更**
  - `UserProfile.userId` → `UserProfile.did`
  - `PostData.postId` → `PostData.atUri`
  - `CommentData.commentId` → `CommentData.atUri`
  - 優先度: **最高**

- [ ] **DynamoDBスキーマ変更**
  - PK/SK構造の変更（`USER#{did}` 形式）
  - 既存データの移行計画
  - 優先度: **最高**

#### 影響範囲

- ✅ 全SNSコントローラー（9ファイル）
- ✅ SnsService（全メソッド）
- ✅ データモデル（全型定義）
- ✅ DynamoDBテーブル構造
- ✅ 認証システム（JWT payload）

---

### 2. **Repository構造への対応**

#### 現状

- DynamoDB Single Table Design
- PK/SK/GSIによるクエリ
- 集約的なデータ管理

#### AT Protocol要件

- **Repository**: ユーザーごとの自己認証ストレージ
- **Record**: JSONレコード（Post, Profile, Like等）
- **Collection**: レコードのコレクション（`app.bsky.feed.post`等）
- **Commit**: リポジトリへの変更履歴

#### 対応内容

```typescript
// 新しいRepository構造
interface Repository {
  did: string;
  records: {
    [collection: string]: {
      [rkey: string]: Record;
    };
  };
  commits: Commit[];
}
```

#### 実装タスク

- [ ] **Repositoryデータモデル設計**
  - `src/models/atproto/Repository.ts` 新規作成
  - Record型定義（Post, Profile, Like等）
  - Collection型定義
  - 優先度: **最高**

- [ ] **DynamoDBスキーマ再設計**
  - Repository構造に対応したPK/SK設計
  - Record保存形式の変更
  - 既存データとの互換性検討
  - 優先度: **最高**

- [ ] **Repository Service実装**
  - `src/services/RepositoryService.ts` 新規作成
  - Record作成・更新・削除
  - Commit管理
  - 優先度: **最高**

#### 影響範囲

- ✅ DynamoDBテーブル構造（根本的変更）
- ✅ SnsService（全メソッドの書き直し）
- ✅ データアクセスパターン
- ✅ クエリロジック

---

### 3. **Lexiconスキーマ定義の準備**

#### 現状

- TypeScript型定義のみ
- tsoaによるOpenAPI生成
- スキーマ定義の標準化なし

#### AT Protocol要件

- **Lexicon**: JSONスキーマベースのスキーマ定義言語
- **XRPC**: Lexiconで定義されたHTTP API
- **スキーマバージョニング**: スキーマの進化に対応

#### 対応内容

```json
// Lexiconスキーマ例
{
  "lexicon": 1,
  "id": "app.bsky.feed.post",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["text", "createdAt"],
        "properties": {
          "text": { "type": "string", "maxLength": 3000 },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

#### 実装タスク

- [ ] **Lexiconスキーマ定義ファイル作成**
  - `lexicons/` ディレクトリ作成
  - Post, Profile, Like等のスキーマ定義
  - 優先度: **高**

- [ ] **Lexicon検証ライブラリ統合**
  - `@atproto/lexicon` または類似ライブラリ
  - スキーマ検証機能
  - 優先度: **高**

- [ ] **TypeScript型生成ツール**
  - LexiconからTypeScript型を自動生成
  - 既存型定義との統合
  - 優先度: **中**

#### 影響範囲

- ✅ データモデル（Lexicon準拠）
- ✅ APIリクエスト/レスポンス検証
- ✅ 型定義の生成方法

---

### 4. **AT URI体系の導入**

#### 現状

- 単純なID文字列（`post-123`）
- URI体系なし

#### AT Protocol要件

- **AT URI**: `at://did:plc:xxx/app.bsky.feed.post/xxx`
- **rkey**: レコードキー（TID形式推奨）
- **URI解決**: AT URIからレコード取得

#### 対応内容

```typescript
// AT URI生成・解決
interface AtUri {
  did: string;
  collection: string;
  rkey: string;
}

function generateAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}
```

#### 実装タスク

- [ ] **AT URI生成・解決ユーティリティ**
  - `src/utils/atUri.ts` 新規作成
  - AT URIパース・生成
  - 優先度: **高**

- [ ] **TID生成ライブラリ統合**
  - `@atproto/tid` または類似ライブラリ
  - レコードキー生成
  - 優先度: **高**

- [ ] **データモデルへのAT URI統合**
  - 全レコードにAT URIフィールド追加
  - 優先度: **高**

#### 影響範囲

- ✅ 全レコード型（Post, Comment, Like等）
- ✅ APIレスポンス
- ✅ データベースクエリ

---

### 5. **認証基盤の変更: JWT → DID署名**

#### 現状

- JWT認証（`jsonwebtoken`）
- Flow addressベースの認証
- メール/パスワード認証（新規追加予定）
- JWT payloadにuserIdを含む

#### AT Protocol要件

- **DID署名**: DIDドキュメントの公開鍵で署名検証
- **Handle認証**: Handle解決 → DID取得 → 署名検証
- **セッション管理**: AT Protocol準拠のセッション管理

#### 対応内容

```typescript
// DID署名検証
interface DidAuthRequest {
  did: string;
  signature: string;
  message: string;
  timestamp: string;
}

// 複数認証方法の統合
interface UnifiedAuthRequest {
  method: 'flow' | 'email' | 'did';
  // Flow認証
  address?: string;
  signature?: string;
  // メール認証
  email?: string;
  password?: string;
  // DID認証
  did?: string;
}
```

#### 実装タスク

- [ ] **DID署名検証サービス**
  - `src/services/DidAuthService.ts` 新規作成
  - DIDドキュメント取得
  - 公開鍵による署名検証
  - 優先度: **最高**

- [ ] **統合認証サービス**
  - `src/services/UnifiedAuthService.ts` 新規作成
  - Flow wallet、メール/パスワード、DID認証の統合
  - 認証方法の自動判定
  - 優先度: **高**

- [ ] **JWT認証の段階的移行**
  - 既存JWT認証の維持（後方互換性）
  - DID認証の並行実装
  - メール/パスワード認証の統合
  - 優先度: **高**

- [ ] **認証ミドルウェア更新**
  - `src/middleware/auth.ts` 更新
  - 複数認証方法のサポート
  - DID認証対応
  - 優先度: **高**

#### 影響範囲

- ✅ 認証システム（根本的変更）
- ✅ 全保護エンドポイント
- ✅ セッション管理
- ✅ メール/パスワード認証との統合

---

### 6. **ストレージ構造の変更: DynamoDB → Repository**

#### 現状

- DynamoDB Single Table Design
- PK/SK/GSIによるクエリ
- 集約的なデータ管理

#### AT Protocol要件

- **Repository**: ユーザーごとの自己認証ストレージ
- **PDS (Personal Data Server)**: リポジトリホスティング
- **AppView**: インデックス・検索・フィード生成

#### 対応内容

```typescript
// Repository構造
interface UserRepository {
  did: string;
  handle?: string;
  records: {
    [collection: string]: {
      [rkey: string]: Record;
    };
  };
  commits: Commit[];
}
```

#### 実装タスク

- [ ] **Repositoryストレージ設計**
  - DynamoDBでのRepository構造実装
  - または別ストレージ（S3等）の検討
  - 優先度: **最高**

- [ ] **PDS機能の実装**
  - リポジトリホスティング
  - リポジトリ同期
  - 優先度: **高**

- [ ] **AppView機能の実装**
  - インデックス構築
  - 検索機能
  - フィード生成
  - 優先度: **高**

#### 影響範囲

- ✅ ストレージアーキテクチャ（根本的変更）
- ✅ データアクセスパターン
- ✅ クエリロジック

---

## 🟡 将来的に対応可能な項目（後からでも対応可能）

### 0. **メール/パスワード認証の拡張機能** ⭐ 新規要件

#### 実装タスク

- [ ] **パスワードリセット機能**
  - `POST /auth/forgot-password` - パスワードリセット要求
  - `POST /auth/reset-password` - パスワードリセット実行
  - メール送信機能（リセットトークン）
  - 優先度: **中**

- [ ] **メール認証機能** ⭐ 詳細設計完了
  - `POST /auth/send-verification-email` - 認証メール送信
  - `POST /auth/verify-email` - メール認証
  - `GET /auth/verification-status` - 認証ステータス確認
  - `POST /auth/resend-verification-email` - 認証メール再送信
  - メール認証ステータス管理
  - トークン生成・検証機能
  - AWS SES統合
  - 優先度: **中**
  - **詳細**: `EMAIL_VERIFICATION_IMPLEMENTATION.md` を参照

- [ ] **パスワード変更機能**
  - `POST /auth/change-password` - パスワード変更
  - 現在のパスワード検証
  - 優先度: **中**

- [ ] **2FA（二要素認証）機能**
  - TOTP（Time-based One-Time Password）実装
  - SMS認証（オプション）
  - 優先度: **低**

- [ ] **アカウント連携機能**
  - Flow walletとメール/パスワードアカウントの連携
  - 複数認証方法の管理
  - 優先度: **低**

#### 影響範囲

- ✅ 認証エンドポイント（追加のみ）
- ✅ メール送信サービス統合
- ✅ 既存機能への影響なし

---

### 1. **XRPC APIエンドポイントの実装**

#### 現状

- RESTful API (tsoa)
- `/sns/posts`, `/sns/users` 等

#### AT Protocol要件

- **XRPC**: Lexiconで定義されたHTTP API
- `com.atproto.repo.createRecord`
- `app.bsky.feed.getTimeline`

#### 対応内容

- [ ] **XRPCエンドポイント追加**
  - 既存RESTful APIと並行運用
  - Lexicon定義に基づく実装
  - 優先度: **中**

- [ ] **XRPCルーティング実装**
  - `src/controllers/xrpc/` ディレクトリ作成
  - XRPCハンドラー実装
  - 優先度: **中**

#### 影響範囲

- ✅ APIエンドポイント（追加のみ）
- ✅ 既存APIへの影響なし

---

### 2. **Handle解決機能**

#### 現状

- usernameのみ（`@username`形式なし）
- Handle解決なし

#### AT Protocol要件

- **Handle**: `@username.bsky.social`
- **DNS TXTレコード**: Handle → DID解決
- **Handle解決サービス**: 外部サービス統合

#### 対応内容

- [ ] **Handle解決サービス実装**
  - `src/services/HandleService.ts` 新規作成
  - DNS TXTレコード解決
  - 優先度: **低**

- [ ] **Handle管理機能**
  - Handle登録・更新
  - Handle検証
  - 優先度: **低**

#### 影響範囲

- ✅ 機能追加のみ
- ✅ 既存機能への影響なし

---

### 3. **リレー機能の実装**

#### 現状

- リレー機能なし
- 直接PDS通信

#### AT Protocol要件

- **リレー**: リポジトリ集約・同期
- **Firehose**: 変更イベントストリーム
- **最適化**: パフォーマンス改善

#### 対応内容

- [ ] **リレーサービス実装**
  - `src/services/RelayService.ts` 新規作成
  - リポジトリ同期
  - 優先度: **低**

- [ ] **Firehose実装**
  - 変更イベントストリーム
  - WebSocketまたはSSE
  - 優先度: **低**

#### 影響範囲

- ✅ 最適化機能
- ✅ 既存機能への影響なし

---

### 4. **楽観的更新の実装**

#### 現状

- 通常の更新フロー
- 楽観的更新なし

#### AT Protocol要件

- **楽観的更新**: 即座のUI更新
- **競合解決**: サーバー側での競合解決

#### 対応内容

- [ ] **楽観的更新ロジック**
  - フロントエンド側実装
  - 競合解決ロジック
  - 優先度: **低**

#### 影響範囲

- ✅ フロントエンド実装
- ✅ 既存APIへの影響なし

---

### 5. **外部AT Protocolサービス統合**

#### 現状

- 独立したSNSシステム
- 外部サービス統合なし

#### AT Protocol要件

- **相互運用性**: 他のAT Protocolサービスとの連携
- **リポジトリ同期**: 外部リポジトリの同期
- **検索**: 外部AppViewの検索

#### 対応内容

- [ ] **外部サービス統合**
  - Bluesky等との連携
  - リポジトリ同期
  - 優先度: **低**

#### 影響範囲

- ✅ 外部統合機能
- ✅ 既存機能への影響なし

---

## 📊 実装優先順位

### Phase 0: メール/パスワード認証実装（新規要件・最優先）⭐

1. **パスワードハッシュ化サービス** 🔴
2. **ユーザー認証情報管理サービス** 🔴
3. **DynamoDBスキーマ拡張（認証情報）** 🔴
4. **認証エンドポイント追加** 🔴
5. **JWT Payload拡張** 🔴

### Phase 1: 基盤構築（必須）

1. **DID生成・管理サービス** 🔴
2. **ID体系変更（UUID → DID）** 🔴
3. **Repositoryデータモデル設計** 🔴
4. **DynamoDBスキーマ再設計** 🔴

### Phase 2: コア機能実装（必須）

5. **Repository Service実装** 🔴
6. **AT URI体系導入** 🔴
7. **Lexiconスキーマ定義** 🔴
8. **DID署名認証** 🔴

### Phase 3: API移行（推奨）

9. **XRPCエンドポイント実装** 🟡
10. **既存APIとの並行運用** 🟡

### Phase 4: 拡張機能（オプション）

11. **Handle解決機能** 🟡
12. **リレー機能** 🟡
13. **楽観的更新** 🟡
14. **外部サービス統合** 🟡

---

## 🚨 重要な注意事項

### データ移行

- **既存データの移行計画**: UUID → DID変換
- **ダウンタイム最小化**: 段階的移行
- **後方互換性**: 既存APIの維持期間

### パフォーマンス

- **Repository構造**: クエリパフォーマンスへの影響
- **DID解決**: 外部サービス依存のレイテンシ
- **インデックス**: AppViewのインデックス構築

### セキュリティ

- **DID署名**: 署名検証の実装
- **リポジトリ整合性**: 自己認証ストレージの検証
- **アクセス制御**: Repositoryアクセス制御

---

## 📝 次のステップ

### 即座に開始すべき作業（最優先）⭐

#### メール/パスワード認証実装

1. **パスワードハッシュ化サービスの実装**
   - `src/services/PasswordService.ts` 作成
   - bcrypt統合
   - パスワード検証機能
   - テスト実装

2. **ユーザー認証情報管理サービスの実装**
   - `src/services/UserAuthService.ts` 作成
   - メール/パスワード認証ロジック
   - Flow wallet認証との統合
   - テスト実装

3. **認証エンドポイントの実装**
   - `POST /auth/register` 実装
   - `POST /auth/email-login` 実装
   - 既存Flow wallet認証との統合
   - テスト実装

4. **DynamoDBスキーマ拡張**
   - ユーザー認証情報テーブル設計
   - パスワードハッシュ保存構造
   - 既存データとの互換性検討

#### AT Protocol準拠準備

5. **DID生成・管理サービスの実装**
   - `src/services/DidService.ts` 作成
   - DID生成・解決機能
   - テスト実装

6. **データモデルのID体系変更設計**
   - 移行計画の策定
   - 既存データとの互換性検討
   - 段階的移行計画

7. **Repository構造の設計**
   - DynamoDBでのRepository構造設計
   - パフォーマンス検証
   - 移行計画

### 並行して進める作業

4. **Lexiconスキーマ定義**
   - 主要スキーマ（Post, Profile）の定義
   - 型生成ツールの検討

5. **AT URI体系の実装**
   - AT URI生成・解決ユーティリティ
   - TID生成ライブラリ統合

---

## 📦 必要な依存関係追加

### メール/パスワード認証用

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

または

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "@types/bcrypt": "^5.0.2"
  }
}
```

**推奨**: `bcryptjs`（純JavaScript実装、Lambda環境で問題が少ない）

---

## 🔗 参考リソース

### AT Protocol

- [AT Protocol Specification](https://atproto.com/)
- [AT Protocol Guides](https://atproto.com/guides)
- [Bluesky AT Protocol Documentation](https://docs.bsky.app/)
- [Lexicon Schema Language](https://atproto.com/specs/lexicon)

### 認証・セキュリティ

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [bcrypt.js Documentation](https://www.npmjs.com/package/bcryptjs)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

**最終更新**: 2025-12-30  
**変更履歴**:

- 2025-12-30: メール/パスワード認証要件を追加（Phase 0として最優先）
- 2025-12-30: 認証基盤の変更セクションを更新（複数認証方法の統合）

**次回レビュー**: Phase 0完了後
