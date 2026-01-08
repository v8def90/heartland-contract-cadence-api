# AT Protocol対応: Post/Comment 実装状況

**最終更新**: 2026-01-05  
**実装フェーズ**: Phase 1-2 完了、Phase 3 以降 未着手

---

## 📊 実装進捗サマリー

| フェーズ | ステータス | 進捗率 |
|---------|----------|--------|
| **Phase 1: 依存関係とユーティリティの準備** | ✅ **完了** | 100% |
| **Phase 2: データモデルの定義** | ✅ **完了** | 100% |
| **Phase 3: DynamoDBスキーマの更新** | ⏸️ **未着手** | 0% |
| **Phase 4: データアクセス層の実装** | ⏸️ **未着手** | 0% |
| **Phase 5: API層の更新** | ⏸️ **未着手** | 0% |
| **Phase 6: テストの実装** | ⏸️ **未着手** | 0% |
| **Phase 7: ドキュメント更新** | ⏸️ **未着手** | 0% |

**全体進捗**: 約 **28.6%** (2/7 フェーズ完了)

---

## ✅ 完了したタスク

### Phase 1: 依存関係とユーティリティの準備

#### ✅ 1.1 パッケージのインストール
- [x] `@atproto/syntax`パッケージのインストール
- **ファイル**: `package.json`（依存関係追加）

#### ✅ 1.2 rkey生成ユーティリティの実装
- [x] `src/utils/rkeyGenerator.ts` 作成完了
- **実装内容**:
  - `generateRkey()` - rkey生成関数
  - `validateRkey()` - rkey検証関数
  - `rkeyToTimestamp()` - rkeyからタイムスタンプ取得関数
  - `RkeyGenerator` クラス（静的メソッド）

#### ✅ 1.3 AT URIユーティリティの拡張
- [x] `src/utils/atUri.ts` 拡張完了
- **追加実装**:
  - `generatePostAtUri()` - Post AT URI生成
  - `parsePostAtUri()` - Post AT URI解析
  - `extractRkeyFromUri()` - AT URIからrkey抽出

---

### Phase 2: データモデルの定義

#### ✅ 2.1 AT Protocol準拠のPostデータモデル定義
- [x] `src/models/dynamodb/AtProtocolPostModels.ts` 作成完了
- **実装内容**:
  - `DynamoDBBskyPostRecordItem` - AT Protocol準拠Post Record Item
  - `ReplyRef` - 返信構造
  - `StrongRef` - 強参照型
  - `EmbedImage` - 画像埋め込み（完全版）
  - `SimplifiedEmbedImage` - 画像埋め込み（簡易版）
  - `Facet` - リッチテキスト表現
  - `FacetFeature` - Facet機能型
  - `SimplifiedFacet` - Facet（簡易版）

#### ✅ 2.2 レスポンスモデルの更新
- [x] `src/models/responses/SnsResponses.ts` 更新完了
- **変更内容**:
  - `PostData` インターフェース更新
    - `postId` → 削除
    - `uri`, `rkey` → 追加
    - `authorId` → `ownerDid` に変更
    - `content` → `text` に変更
    - `images` → `embed.images` に変更
    - `tags` → `facets` に変更
    - `likeCount`, `commentCount` → 削除（AppViewで計算）
  - `CommentData` インターフェース更新
    - `commentId` → 削除
    - `uri`, `rkey` → 追加
    - `postId` → `rootPostUri`, `parentPostUri` に変更
    - `authorId` → `ownerDid` に変更
    - `content` → `text` に変更
    - `likeCount` → 削除（AppViewで計算）
    - `reply` → 追加

#### ✅ 2.3 リクエストモデルの更新
- [x] `src/models/requests/SnsRequests.ts` 更新完了
- **変更内容**:
  - `CreatePostRequest` インターフェース更新
    - `content` → `text` に変更
    - `images` → `embed.images` に変更
    - `tags` → `facets` に変更
  - `UpdatePostRequest` インターフェース更新
    - `content` → `text` に変更
    - `images` → `embed.images` に変更
    - `tags` → `facets` に変更
  - `CreateCommentRequest` インターフェース更新
    - `content` → `text` に変更
  - `LikePostRequest` インターフェース更新
    - `postId` → `uri` に変更

---

## ⏸️ 未着手のタスク

### Phase 3: DynamoDBスキーマの更新

#### ⏸️ 3.1 GSI定義の更新
- [ ] `serverless.yml` のGSI定義更新
- **必要な変更**:
  - 既存のGSI1, GSI2（Post/Comment用）を新しいAT Protocol構造に更新
  - 新しいGSI13（Reply Post取得用）を追加
  - **注意**: GSI3は既に「User likes用」として使用されているため、Reply Post用はGSI13を使用

**GSI定義の変更内容**:
- **GSI1**: `REPO#{ownerDid}` → ユーザーの投稿一覧取得用
- **GSI2**: `POST#ALL` → フィード取得用
- **GSI13**: `REPLY#ROOT#{rootPostUri}` → Reply Post取得用（新規追加）

**注意事項**:
- GSIは一度に1つずつデプロイする必要がある（DynamoDBの制限）
- 既存のGSI1, GSI2を削除してから、新しいGSIを追加

---

### Phase 4: データアクセス層の実装

#### ⏸️ 4.1 Post操作の実装
- [ ] `src/services/SnsService.ts` の `createPost()` メソッド更新
- [ ] `src/services/SnsService.ts` の `getPost()` メソッド更新
- [ ] `src/services/SnsService.ts` の `getAllPosts()` メソッド更新
- [ ] `src/services/SnsService.ts` の `getUserPosts()` メソッド更新
- [ ] `src/services/SnsService.ts` の `deletePost()` メソッド更新

#### ⏸️ 4.2 Comment操作の実装（Reply Postとして）
- [ ] `src/services/SnsService.ts` の `createComment()` メソッド更新
- [ ] `src/services/SnsService.ts` の `getPostComments()` メソッド更新
- [ ] `src/services/SnsService.ts` の `deleteComment()` メソッド更新

#### ⏸️ 4.3 集計データの計算（AppView）
- [ ] `likeCount` の計算ロジック実装
- [ ] `commentCount` の計算ロジック実装
- [ ] AppView用のヘルパー関数実装

---

### Phase 5: API層の更新

#### ⏸️ 5.1 PostsControllerの更新
- [ ] `src/controllers/sns/PostsController.ts` の `createPost()` 更新
- [ ] `src/controllers/sns/PostsController.ts` の `getPosts()` 更新
- [ ] `src/controllers/sns/PostsController.ts` の `getPost()` 更新
- [ ] `src/controllers/sns/PostsController.ts` の `deletePost()` 更新
- [ ] `src/controllers/sns/PostsController.ts` の `getUserPosts()` 更新

#### ⏸️ 5.2 CommentsControllerの更新
- [ ] `src/controllers/sns/CommentsController.ts` の `createComment()` 更新
- [ ] `src/controllers/sns/CommentsController.ts` の `getPostComments()` 更新
- [ ] `src/controllers/sns/CommentsController.ts` の `deleteComment()` 更新

#### ⏸️ 5.3 UsersController.getUserPosts()の更新
- [ ] `src/controllers/sns/UsersController.ts` の `getUserPosts()` 更新
- **注意**: このエンドポイントは除外対象として指定されているが、実装の整合性のために更新が必要

---

### Phase 6: テストの実装

#### ⏸️ 6.1 単体テストの実装
- [ ] `tests/utils/rkeyGenerator.test.ts` 作成
- [ ] `tests/utils/atUri.test.ts` 更新
- [ ] `tests/services/SnsService.test.ts` 更新（Post/Comment操作）

#### ⏸️ 6.2 統合テストの実装
- [ ] `tests/controllers/PostsController.test.ts` 更新
- [ ] `tests/controllers/CommentsController.test.ts` 更新

---

### Phase 7: ドキュメント更新

#### ⏸️ 7.1 APIドキュメント更新
- [ ] `pnpm run tsoa:spec-and-routes` 実行
- [ ] `build/swagger.json` 確認
- [ ] Swagger UIでの動作確認

#### ⏸️ 7.2 開発者向けドキュメント作成
- [ ] AT Protocol対応の変更点をまとめたドキュメント作成
- [ ] マイグレーションガイド作成（既存データがある場合）

---

## 📋 残りのタスク一覧

### 高優先度（必須）

1. **Phase 3: DynamoDBスキーマの更新**
   - GSI定義の更新（serverless.yml）
   - GSI1, GSI2の削除と再作成
   - GSI13の追加

2. **Phase 4: データアクセス層の実装**
   - Post操作の実装（SnsService.ts）
   - Comment操作の実装（Reply Postとして）
   - 集計データの計算（AppView）

3. **Phase 5: API層の更新**
   - PostsControllerの更新
   - CommentsControllerの更新

### 中優先度（推奨）

4. **Phase 6: テストの実装**
   - 単体テストの実装
   - 統合テストの実装

5. **Phase 7: ドキュメント更新**
   - APIドキュメント更新（tsoa spec/routes生成）
   - 開発者向けドキュメント作成

---

## ⚠️ 注意事項

### 実装時の注意点

1. **GSIのデプロイ順序**
   - GSIは一度に1つずつデプロイする必要がある
   - 既存のGSI1, GSI2を削除してから、新しいGSIを追加

2. **後方互換性**
   - 既存の`postId`パラメータはサポートしない（AT URI/rkeyのみ）
   - 既存のAPIクライアントは更新が必要

3. **集計データ**
   - `likeCount`と`commentCount`はRepositoryに保存しない
   - AppViewで計算して返す

4. **Commentの扱い**
   - Commentは完全にReply Postとして扱う
   - 既存のコメントエンドポイントは変更が入る

---

## 📝 次のステップ

1. **Phase 3の実装開始**
   - `serverless.yml`のGSI定義を更新
   - GSI1, GSI2の削除と再作成
   - GSI13の追加

2. **Phase 4の実装開始**
   - `SnsService.ts`のPost操作メソッド更新
   - `SnsService.ts`のComment操作メソッド更新

3. **Phase 5の実装開始**
   - `PostsController.ts`の更新
   - `CommentsController.ts`の更新

---

**最終更新**: 2026-01-05

