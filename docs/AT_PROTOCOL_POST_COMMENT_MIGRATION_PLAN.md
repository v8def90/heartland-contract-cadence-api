# AT Protocol対応: Post/Comment データモデル移行計画

**作成日**: 2026-01-05  
**目的**: Post（投稿）とComment（コメント）のデータモデルをAT Protocolに対応させるための作業計画  
**対象**: DynamoDBPostItem, DynamoDBCommentItem

---

## 📋 現状のデータモデル分析

### 1. 現在のPostデータモデル（DynamoDBPostItem）

```typescript
export interface DynamoDBPostItem {
  PK: string; // POST#{postId}
  SK: string; // META
  GSI1PK: string; // USER#{authorId}
  GSI1SK: string; // POST#{createdAt}#{postId}
  GSI2PK: string; // POST#{postId}
  GSI2SK: string; // META
  postId: string; // UUID形式（例: post-123）
  authorId: string; // DID形式（例: did:plc:xxx）またはUUID
  authorName: string;
  authorUsername: string;
  content: string;
  images?: string[];
  tags?: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}
```

**特徴**:
- ❌ AT ProtocolのRepository構造に非準拠（PK: `POST#{postId}`）
- ❌ AT URI体系を使用していない
- ❌ Collection名が定義されていない
- ❌ rkey（Record Key）が使用されていない
- ✅ 基本的なフィールド（content, images, tags）は存在

### 2. 現在のCommentデータモデル（DynamoDBCommentItem）

```typescript
export interface DynamoDBCommentItem {
  PK: string; // POST#{postId}
  SK: string; // COMMENT#{commentId}
  GSI1PK: string; // POST#{postId}
  GSI1SK: string; // COMMENT#{createdAt}#{commentId}
  GSI2PK: string; // USER#{authorId}
  GSI2SK: string; // COMMENT#{createdAt}#{commentId}
  commentId: string; // UUID形式（例: comment-123）
  postId: string;
  authorId: string; // DID形式またはUUID
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}
```

**特徴**:
- ❌ AT ProtocolのRepository構造に非準拠
- ❌ AT URI体系を使用していない
- ❌ Commentが独立したコレクションとして扱われている（AT ProtocolではReply Postとして扱うべき）
- ❌ replyフィールド（ReplyRef）が存在しない
- ✅ 基本的なフィールド（content, likeCount）は存在

### 3. 既存のAT Protocol対応（参考）

**UserProfile（DynamoDBUserProfileItem）**:
- ✅ PK: `USER#{primaryDid}` - DID中心設計
- ✅ AT Protocol標準フィールド（displayName, handle, bio, avatar, banner）
- ✅ カスタム拡張フィールド（email, walletAddress）

**AT URIユーティリティ（src/utils/atUri.ts）**:
- ✅ AT URI生成・解析機能が既に実装済み
- ✅ `generateAtUri()`, `parseAtUri()`, `validateAtUri()` 関数が存在

---

## 🎯 AT Protocol要件

### 1. Repository構造

**AT Protocol標準**:
- **PK**: `REPO#{ownerDid}` - ユーザーごとのRepository
- **SK**: `REC#{collection}#{rkey}` - Record構造
- **Collection**: `app.bsky.feed.post`（標準コレクション）

**現状との差異**:
- 現状: `PK: POST#{postId}`, `SK: META`
- 要件: `PK: REPO#{ownerDid}`, `SK: REC#app.bsky.feed.post#{rkey}`

### 2. AT URI体系

**AT Protocol標準**:
- **AT URI**: `at://{ownerDid}/{collection}/{rkey}`
- **rkey**: TID/ULID形式（時系列、一意性保証）
- **StrongRef**: AT URIとCIDを含む参照型

**現状との差異**:
- 現状: `postId: string`（UUID形式）
- 要件: `uri: string`（AT URI形式）、`rkey: string`（TID/ULID形式）

### 3. Commentの扱い

**AT Protocol標準**:
- Commentは`app.bsky.feed.post`コレクションとして保存
- `reply`フィールド（ReplyRef）で親子関係を表現
- `reply.root`: ルート投稿への参照
- `reply.parent`: 親投稿への参照

**現状との差異**:
- 現状: Commentが独立したコレクション（`COMMENT#{commentId}`）
- 要件: Commentも`app.bsky.feed.post`として保存、`reply`フィールドで親子関係を表現

### 4. Lexicon準拠のフィールド

**AT Protocol標準（app.bsky.feed.post）**:
```typescript
{
  text: string; // 投稿内容
  createdAt: string; // 作成日時
  langs?: string[]; // 言語コード
  reply?: ReplyRef; // 返信構造
  embed?: Embed; // 埋め込み（画像、外部リンク等）
  facets?: Facet[]; // リッチテキスト表現（メンション、リンク等）
}
```

**現状との差異**:
- 現状: `content`, `images`, `tags`
- 要件: `text`, `embed.images`, `facets`（将来的な変換が必要）

---

## 📊 ギャップ分析

### 🔴 重大な差異（必須対応）

1. **Repository構造の変更**
   - 現状: `PK: POST#{postId}`, `SK: META`
   - 要件: `PK: REPO#{ownerDid}`, `SK: REC#app.bsky.feed.post#{rkey}`
   - **影響**: DynamoDBの全クエリパターンが変更される

2. **ID体系の変更**
   - 現状: `postId: string`（UUID形式）
   - 要件: `uri: string`（AT URI形式）、`rkey: string`（TID/ULID形式）
   - **影響**: 全APIエンドポイントのパラメータとレスポンスが変更される

3. **Commentの扱い変更**
   - 現状: 独立したコレクション（`COMMENT#{commentId}`）
   - 要件: `app.bsky.feed.post`として保存、`reply`フィールドで親子関係を表現
   - **影響**: Comment関連の全ロジックが変更される

### 🟡 重要な差異（推奨対応）

4. **フィールド名の変更**
   - 現状: `content`, `images`, `tags`
   - 要件: `text`, `embed.images`, `facets`（将来的な変換）
   - **影響**: APIレスポンスとリクエストのフィールド名が変更される

5. **集計データの扱い**
   - 現状: `likeCount`, `commentCount`をRepositoryに保存
   - 要件: AT Protocolでは集計データはAppViewで計算（キャッシュとして保存は可）
   - **影響**: 集計データの更新ロジックが変更される

### 🟢 軽微な差異（最適化）

6. **CID（Content Identifier）の実装**
   - 現状: 未実装
   - 要件: 将来的にCID生成・検証が必要（現時点ではoptionalでOK）
   - **影響**: 将来的な実装が必要

---

## 🔍 確認事項

### 1. 既存データの移行方針

**質問**:
- 既存のPost/Commentデータはどのように移行しますか？
- 既存データとの互換性を維持する必要がありますか？
- 段階的移行（新旧データモデルの並行運用）は可能ですか？

**推奨**:
- 既存データの移行スクリプトを作成
- 段階的移行を検討（新旧データモデルの並行運用期間を設ける）
- 既存データとの互換性を維持するためのマッピングレイヤーを実装

### 2. rkey生成方法

**質問**:
- rkeyの生成方法は？（TID/ULIDライブラリの選定）
- rkeyの一意性保証方法は？
- 時系列ソートの要件は？

**推奨**:
- `@atproto/syntax` または `tid` ライブラリを使用
- TID（Time-based ID）形式を推奨（時系列ソートが可能）
- rkey生成ユーティリティ関数を実装

### 3. Commentの実装方針

**質問**:
- Commentを完全にReply Postとして扱いますか？
- 既存のCommentエンドポイント（`/sns/posts/{postId}/comments`）は維持しますか？
- Commentメタデータ（`jp.yourapp.feed.comment.meta`）は必要ですか？

**推奨**:
- CommentをReply Postとして扱う（AT Protocol準拠）
- 既存のCommentエンドポイントは維持（内部でReply Postとして処理）
- Commentメタデータは将来的に必要になったら追加

### 4. フィールド名の互換性

**質問**:
- `content` → `text` への変更は段階的に行いますか？
- `images` → `embed.images` への変換はいつ実装しますか？
- `tags` → `facets` への変換はいつ実装しますか？

**推奨**:
- 段階的移行を推奨（新旧フィールドを並行保持）
- `images`/`tags`は現時点で維持、将来的にLexicon準拠形式へ変換
- マッピングレイヤーで新旧フィールドを相互変換

### 5. GSI設計の見直し

**質問**:
- 新しいRepository構造に合わせてGSIを再設計しますか？
- 既存のGSI（GSI1, GSI2）は維持しますか？
- 新しいGSIが必要ですか？

**推奨**:
- GSIを再設計（Repository構造に合わせて）
- フィード生成用GSI（GSI1）
- 逆引き用GSI（GSI2）
- 必要に応じて新しいGSIを追加

---

## 📝 作業計画

### Phase 1: データモデル設計（必須）

#### 1.1 AT Protocol準拠のPostデータモデル設計

**タスク**:
- [ ] `DynamoDBBskyPostRecordItem` インターフェースの定義
- [ ] Repository構造（PK: `REPO#{ownerDid}`, SK: `REC#app.bsky.feed.post#{rkey}`）の実装
- [ ] AT URI生成・管理機能の実装
- [ ] rkey生成ユーティリティ（TID/ULID）の実装

**成果物**:
- `src/models/dynamodb/AtProtocolPostModels.ts` 新規作成
- `src/utils/rkeyGenerator.ts` 新規作成（rkey生成ユーティリティ）

**確認事項**:
- rkey生成方法の選定（TID/ULID）
- AT URI生成ロジックの実装
- Repository構造の設計

#### 1.2 AT Protocol準拠のCommentデータモデル設計

**タスク**:
- [ ] CommentをReply Postとして扱う設計
- [ ] `ReplyRef`構造の実装（root, parent）
- [ ] Commentメタデータの必要性検討

**成果物**:
- `src/models/dynamodb/AtProtocolPostModels.ts` にReplyRef型を追加
- Comment関連の型定義を更新

**確認事項**:
- CommentをReply Postとして扱う方針の確認
- Commentメタデータの必要性

#### 1.3 メタデータ設計（オプション）

**タスク**:
- [ ] `DynamoDBPostMetaRecordItem` インターフェースの定義
- [ ] 独自拡張コレクション（`jp.heartland.feed.post.meta`）の設計
- [ ] メタデータと標準Postの関連付け

**成果物**:
- `src/models/dynamodb/AtProtocolPostModels.ts` にメタデータ型を追加

**確認事項**:
- メタデータの必要性
- 独自拡張コレクションの名前空間

---

### Phase 2: データアクセス層の実装（必須）

#### 2.1 Post操作の実装

**タスク**:
- [ ] `SnsService.createPost()` をAT Protocol準拠に変更
- [ ] `SnsService.getPost()` をAT Protocol準拠に変更
- [ ] `SnsService.getAllPosts()` をAT Protocol準拠に変更
- [ ] `SnsService.getUserPosts()` をAT Protocol準拠に変更
- [ ] `SnsService.deletePost()` をAT Protocol準拠に変更

**成果物**:
- `src/services/SnsService.ts` のPost操作メソッドを更新
- 新しいRepository構造に対応したクエリロジック

**確認事項**:
- 既存のPost操作メソッドの互換性
- クエリパフォーマンスの確認

#### 2.2 Comment操作の実装

**タスク**:
- [ ] `SnsService.createComment()` をReply Postとして実装
- [ ] `SnsService.getPostComments()` をReply Postクエリに変更
- [ ] `SnsService.deleteComment()` をReply Post削除に変更
- [ ] ReplyRef構造の実装

**成果物**:
- `src/services/SnsService.ts` のComment操作メソッドを更新
- Reply PostとしてのComment処理ロジック

**確認事項**:
- CommentをReply Postとして扱う実装方針
- 既存のCommentエンドポイントの互換性

#### 2.3 GSI設計と実装

**タスク**:
- [ ] 新しいRepository構造に合わせたGSI設計
- [ ] GSI定義の更新（serverless.yml）
- [ ] GSIクエリロジックの実装

**成果物**:
- `serverless.yml` のGSI定義を更新
- GSIクエリロジックの実装

**確認事項**:
- GSIの使用目的とクエリパターン
- GSIのコスト最適化

---

### Phase 3: API層の更新（必須）

#### 3.1 Post APIエンドポイントの更新

**タスク**:
- [ ] `PostsController` の全メソッドをAT Protocol準拠に更新
- [ ] リクエスト/レスポンスモデルの更新
- [ ] AT URIをパラメータとして受け取るように変更
- [ ] 既存の`postId`パラメータとの互換性維持

**成果物**:
- `src/controllers/sns/PostsController.ts` を更新
- `src/models/responses/SnsResponses.ts` のPostData型を更新
- `src/models/requests/SnsRequests.ts` のCreatePostRequest型を更新

**確認事項**:
- 既存APIエンドポイントの互換性
- 段階的移行のためのマッピングレイヤー

#### 3.2 Comment APIエンドポイントの更新

**タスク**:
- [ ] `CommentsController` の全メソッドをReply Postとして更新
- [ ] リクエスト/レスポンスモデルの更新
- [ ] ReplyRef構造の実装

**成果物**:
- `src/controllers/sns/CommentsController.ts` を更新
- `src/models/responses/SnsResponses.ts` のCommentData型を更新
- `src/models/requests/SnsRequests.ts` のCreateCommentRequest型を更新

**確認事項**:
- CommentをReply Postとして扱う実装方針
- 既存のCommentエンドポイントの互換性

---

### Phase 4: データ移行（必須）

#### 4.1 既存データの移行スクリプト

**タスク**:
- [ ] 既存Postデータの移行スクリプト作成
- [ ] 既存Commentデータの移行スクリプト作成
- [ ] データ検証スクリプト作成
- [ ] ロールバックスクリプト作成

**成果物**:
- `scripts/migrate-posts-to-atproto.ts` 新規作成
- `scripts/migrate-comments-to-atproto.ts` 新規作成
- `scripts/validate-migration.ts` 新規作成

**確認事項**:
- 既存データの移行方針
- データ移行のタイミング
- ロールバック計画

#### 4.2 段階的移行の実装

**タスク**:
- [ ] 新旧データモデルの並行運用期間の設定
- [ ] マッピングレイヤーの実装（新旧データモデルの相互変換）
- [ ] 移行完了後の旧データモデルの削除

**成果物**:
- マッピングレイヤーの実装
- 移行計画書

**確認事項**:
- 並行運用期間の長さ
- 移行完了の判断基準

---

### Phase 5: フィールド名の段階的移行（推奨）

#### 5.1 フィールド名のマッピング

**タスク**:
- [ ] `content` → `text` のマッピング実装
- [ ] `images` → `embed.images` の変換準備（将来的な実装）
- [ ] `tags` → `facets` の変換準備（将来的な実装）

**成果物**:
- フィールド名マッピングユーティリティ
- 新旧フィールドの相互変換ロジック

**確認事項**:
- フィールド名変更のタイミング
- 新旧フィールドの並行保持期間

---

### Phase 6: テストと検証（必須）

#### 6.1 単体テスト

**タスク**:
- [ ] Post操作の単体テスト作成
- [ ] Comment操作の単体テスト作成
- [ ] AT URI生成・解析のテスト作成
- [ ] rkey生成のテスト作成

**成果物**:
- `tests/services/SnsService.post.test.ts` 更新
- `tests/services/SnsService.comment.test.ts` 更新
- `tests/utils/atUri.test.ts` 新規作成
- `tests/utils/rkeyGenerator.test.ts` 新規作成

#### 6.2 統合テスト

**タスク**:
- [ ] Post APIエンドポイントの統合テスト
- [ ] Comment APIエンドポイントの統合テスト
- [ ] データ移行の統合テスト

**成果物**:
- 統合テストスイート

#### 6.3 パフォーマンステスト

**タスク**:
- [ ] 新しいRepository構造でのクエリパフォーマンステスト
- [ ] GSIクエリのパフォーマンステスト
- [ ] データ移行のパフォーマンステスト

**成果物**:
- パフォーマンステストレポート

---

### Phase 7: ドキュメント更新（必須）

#### 7.1 APIドキュメント更新

**タスク**:
- [ ] Swagger/OpenAPI仕様書の更新
- [ ] エンドポイントの説明更新
- [ ] リクエスト/レスポンス例の更新

**成果物**:
- `build/swagger.json` 更新
- APIドキュメント更新

#### 7.2 開発者向けドキュメント

**タスク**:
- [ ] AT Protocol対応の説明ドキュメント作成
- [ ] データモデル変更の説明
- [ ] 移行ガイドの作成

**成果物**:
- `docs/AT_PROTOCOL_POST_COMMENT_GUIDE.md` 新規作成
- 移行ガイドドキュメント

---

## ⚠️ リスクと対策

### 1. 既存データの移行リスク

**リスク**:
- 既存データの移行中にデータ損失が発生する可能性
- 移行時間が長くなり、サービス停止時間が発生する可能性

**対策**:
- 移行前の完全バックアップ
- 段階的移行の実施（新旧データモデルの並行運用）
- ロールバック計画の準備

### 2. API互換性のリスク

**リスク**:
- 既存のAPIクライアントが動作しなくなる可能性
- フィールド名の変更により、フロントエンドが影響を受ける可能性

**対策**:
- 段階的移行の実施（新旧フィールドの並行保持）
- マッピングレイヤーの実装
- APIバージョニングの検討

### 3. パフォーマンスリスク

**リスク**:
- 新しいRepository構造でのクエリパフォーマンスが低下する可能性
- GSIクエリのコストが増加する可能性

**対策**:
- パフォーマンステストの実施
- GSI設計の最適化
- クエリパターンの分析と最適化

---

## 📅 実装スケジュール（推奨）

### Week 1-2: Phase 1（データモデル設計）
- AT Protocol準拠のデータモデル設計
- rkey生成ユーティリティの実装
- AT URI生成・管理機能の実装

### Week 3-4: Phase 2（データアクセス層の実装）
- Post操作の実装
- Comment操作の実装
- GSI設計と実装

### Week 5-6: Phase 3（API層の更新）
- Post APIエンドポイントの更新
- Comment APIエンドポイントの更新

### Week 7-8: Phase 4（データ移行）
- 既存データの移行スクリプト作成
- 段階的移行の実装
- データ検証

### Week 9-10: Phase 5-7（最適化とドキュメント）
- フィールド名の段階的移行
- テストと検証
- ドキュメント更新

---

## 🔍 確認が必要な項目

### 1. 既存データの移行方針
- [ ] 既存のPost/Commentデータはどのように移行しますか？
- [ ] 既存データとの互換性を維持する必要がありますか？
- [ ] 段階的移行（新旧データモデルの並行運用）は可能ですか？

### 2. rkey生成方法
- [ ] rkeyの生成方法は？（TID/ULIDライブラリの選定）
- [ ] rkeyの一意性保証方法は？
- [ ] 時系列ソートの要件は？

### 3. Commentの実装方針
- [ ] Commentを完全にReply Postとして扱いますか？
- [ ] 既存のCommentエンドポイント（`/sns/posts/{postId}/comments`）は維持しますか？
- [ ] Commentメタデータ（`jp.yourapp.feed.comment.meta`）は必要ですか？

### 4. フィールド名の互換性
- [ ] `content` → `text` への変更は段階的に行いますか？
- [ ] `images` → `embed.images` への変換はいつ実装しますか？
- [ ] `tags` → `facets` への変換はいつ実装しますか？

### 5. GSI設計の見直し
- [ ] 新しいRepository構造に合わせてGSIを再設計しますか？
- [ ] 既存のGSI（GSI1, GSI2）は維持しますか？
- [ ] 新しいGSIが必要ですか？

---

## 📊 実装優先度

### 🔴 最高優先度（必須）
1. **Repository構造の変更** - AT Protocol準拠の基本構造
2. **ID体系の変更** - AT URIとrkeyの実装
3. **Commentの扱い変更** - Reply Postとしての実装

### 🟡 高優先度（推奨）
4. **フィールド名の変更** - Lexicon準拠のフィールド名
5. **GSI設計の見直し** - 新しいRepository構造に合わせたGSI

### 🟢 中優先度（最適化）
6. **CID実装** - 将来的な実装
7. **メタデータ実装** - 必要に応じて追加

---

**最終更新**: 2026-01-05  
**次回レビュー**: 確認事項の回答後

