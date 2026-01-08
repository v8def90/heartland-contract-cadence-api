# AT Protocol対応: Post/Comment 実装作業計画

**作成日**: 2026-01-05  
**目的**: Post/CommentのAT Protocol対応実装の詳細作業計画  
**対象**: DynamoDBPostItem, DynamoDBCommentItem → AT Protocol準拠データモデル

---

## 📋 実装概要

### 実装範囲

1. **データモデルの変更**: AT Protocol準拠のRepository構造へ移行
2. **フィールド名の変更**: `content` → `text`, `images` → `embed.images`, `tags` → `facets`
3. **ID体系の変更**: `postId` → `uri`/`rkey`（AT URI体系）
4. **Commentの扱い変更**: Reply Postとして実装
5. **GSI設計の再設計**: 新しいRepository構造に合わせて最適化
6. **APIエンドポイントの更新**: AT URI/rkeyベースに変更
7. **集計データの扱い**: AppViewで計算（Repositoryには保存しない）

---

## 🎯 実装フェーズ

### Phase 1: 依存関係とユーティリティの準備

#### 1.1 パッケージのインストール

**タスク**:

- [ ] `@atproto/syntax`パッケージのインストール

**コマンド**:

```bash
pnpm add @atproto/syntax
```

**確認**:

- `package.json`に`@atproto/syntax`が追加されているか確認

---

#### 1.2 rkey生成ユーティリティの実装

**ファイル**: `src/utils/rkeyGenerator.ts`（新規作成）

**実装内容**:

```typescript
import { TID } from '@atproto/syntax';

export class RkeyGenerator {
  /**
   * Generate rkey for AT Protocol record
   * @returns rkey string (TID format)
   */
  static generate(): string {
    return TID.next();
  }

  /**
   * Validate rkey format
   * @param rkey - rkey string to validate
   * @returns true if valid, false otherwise
   */
  static validate(rkey: string): boolean {
    return TID.isValid(rkey);
  }

  /**
   * Get timestamp from rkey
   * @param rkey - rkey string
   * @returns Date object or null if invalid
   */
  static toTimestamp(rkey: string): Date | null {
    try {
      return TID.toTimestamp(rkey);
    } catch {
      return null;
    }
  }
}
```

**テスト**:

- [ ] `tests/utils/rkeyGenerator.test.ts`（新規作成）
  - `generate()`のテスト
  - `validate()`のテスト
  - `toTimestamp()`のテスト

---

#### 1.3 AT URIユーティリティの拡張

**ファイル**: `src/utils/atUri.ts`（既存ファイルを拡張）

**追加実装**:

- [ ] `generatePostAtUri(ownerDid: string, rkey: string): string`
- [ ] `parsePostAtUri(uri: string): { ownerDid: string, rkey: string } | null`
- [ ] `extractRkeyFromUri(uri: string): string | null`

**確認**:

- 既存の`generateAtUri()`, `parseAtUri()`, `validateAtUri()`が正しく動作するか確認

---

### Phase 2: データモデルの定義

#### 2.1 AT Protocol準拠のPostデータモデル定義

**ファイル**: `src/models/dynamodb/AtProtocolPostModels.ts`（新規作成）

**実装内容**:

```typescript
/**
 * AT Protocol準拠のPost Record Item
 */
export interface DynamoDBBskyPostRecordItem {
  // Primary Key
  PK: string; // REPO#{ownerDid}
  SK: string; // REC#app.bsky.feed.post#{rkey}

  // AT Protocol標準フィールド
  ownerDid: string; // did:plc:...
  collection: 'app.bsky.feed.post';
  rkey: string; // TID形式
  uri: string; // at://{ownerDid}/app.bsky.feed.post/{rkey}
  cid?: string; // 将来的に実装（IPFS Content Identifier）

  // Lexicon準拠フィールド
  text: string; // content → text
  createdAt: string; // ISO 8601形式
  langs?: string[]; // 言語コード
  reply?: ReplyRef; // 返信構造（Commentの場合）
  embed?: {
    images?: EmbedImage[]; // images → embed.images
  };
  facets?: Facet[]; // tags → facets

  // タイムスタンプ
  createdAtIso: string; // ISO 8601形式（ソート用）
  updatedAtIso: string; // ISO 8601形式

  // TTL
  ttl?: number;

  // GSI Keys
  GSI1PK?: string; // REPO#{ownerDid}（ユーザーの投稿一覧取得用）
  GSI1SK?: string; // REC#app.bsky.feed.post#{rkey}
  GSI2PK?: string; // POST#ALL（フィード取得用）
  GSI2SK?: string; // REC#app.bsky.feed.post#{rkey}
  GSI3PK?: string; // REPLY#ROOT#{rootPostUri}（Reply Post取得用）
  GSI3SK?: string; // REC#app.bsky.feed.post#{rkey}
}

/**
 * Reply Reference（返信構造）
 */
export interface ReplyRef {
  root: StrongRef; // ルート投稿への参照
  parent: StrongRef; // 親投稿への参照
}

/**
 * Strong Reference（AT URIとCIDを含む参照型）
 */
export interface StrongRef {
  uri: string; // AT URI
  cid?: string; // 将来的に実装
}

/**
 * Embed Image（画像埋め込み）
 */
export interface EmbedImage {
  image: {
    ref: {
      $link: string; // 画像のCID参照
    };
    mimeType: string; // image/jpeg, image/png等
    size: number; // ファイルサイズ（バイト）
  };
  alt?: string; // 代替テキスト
}

/**
 * Facet（リッチテキスト表現）
 */
export interface Facet {
  index: {
    byteStart: number; // 開始バイト位置
    byteEnd: number; // 終了バイト位置
  };
  features: FacetFeature[];
}

/**
 * Facet Feature（メンション、リンク等）
 */
export interface FacetFeature {
  $type:
    | 'app.bsky.richtext.facet#mention'
    | 'app.bsky.richtext.facet#link'
    | 'app.bsky.richtext.facet#tag';
  did?: string; // メンションの場合
  uri?: string; // リンクの場合
  tag?: string; // タグの場合
}
```

**確認**:

- [ ] TypeScriptの型定義が正しいか確認
- [ ] AT Protocol標準仕様に準拠しているか確認

---

#### 2.2 レスポンスモデルの更新

**ファイル**: `src/models/responses/SnsResponses.ts`（既存ファイルを更新）

**変更内容**:

- [ ] `PostData`インターフェースの更新
  - `postId: string` → 削除
  - `uri: string` → 追加
  - `rkey: string` → 追加
  - `authorId: string` → `ownerDid: string`に変更
  - `content: string` → `text: string`に変更
  - `images?: string[]` → `embed?: { images?: EmbedImage[] }`に変更
  - `tags?: string[]` → `facets?: Facet[]`に変更
  - `likeCount: number` → 削除（AppViewで計算）
  - `commentCount: number` → 削除（AppViewで計算）

- [ ] `CommentData`インターフェースの更新
  - `commentId: string` → 削除
  - `uri: string` → 追加
  - `rkey: string` → 追加
  - `postId: string` → `rootPostUri: string`, `parentPostUri: string`に変更
  - `authorId: string` → `ownerDid: string`に変更
  - `content: string` → `text: string`に変更
  - `likeCount: number` → 削除（AppViewで計算）
  - `reply?: ReplyRef` → 追加

**確認**:

- [ ] 既存のAPIレスポンスとの互換性を確認（後方互換性は不要）

---

#### 2.3 リクエストモデルの更新

**ファイル**: `src/models/requests/SnsRequests.ts`（既存ファイルを更新）

**変更内容**:

- [ ] `CreatePostRequest`インターフェースの更新
  - `content: string` → `text: string`に変更
  - `images?: string[]` → `embed?: { images?: EmbedImage[] }`に変更
  - `tags?: string[]` → `facets?: Facet[]`に変更

- [ ] `CreateCommentRequest`インターフェースの更新
  - `content: string` → `text: string`に変更
  - `postId: string` → `parentPostUri: string`に変更（親投稿のAT URI）

**確認**:

- [ ] 既存のAPIリクエストとの互換性を確認（後方互換性は不要）

---

### Phase 3: DynamoDBスキーマの更新

#### 3.1 GSI定義の更新

**ファイル**: `serverless.yml`（既存ファイルを更新）

**変更内容**:

- [ ] 既存のGSI1, GSI2の定義を削除（Post/Comment用）
- [ ] 新しいGSI1の定義を追加（ユーザーの投稿一覧取得用）
- [ ] 新しいGSI2の定義を追加（フィード取得用）
- [ ] 新しいGSI3の定義を追加（Reply Post取得用）

**GSI定義**:

```yaml
GlobalSecondaryIndexes:
  - IndexName: GSI1
    KeySchema:
      - AttributeName: GSI1PK
        KeyType: HASH
      - AttributeName: GSI1SK
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
  - IndexName: GSI2
    KeySchema:
      - AttributeName: GSI2PK
        KeyType: HASH
      - AttributeName: GSI2SK
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
  - IndexName: GSI3
    KeySchema:
      - AttributeName: GSI3PK
        KeyType: HASH
      - AttributeName: GSI3SK
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
```

**注意**:

- GSIは一度に1つずつデプロイする必要がある（DynamoDBの制限）
- 既存のGSI1, GSI2を削除してから、新しいGSIを追加

**確認**:

- [ ] `serverless.yml`の構文が正しいか確認
- [ ] GSIの属性定義が正しいか確認

---

### Phase 4: データアクセス層の実装

#### 4.1 Post操作の実装

**ファイル**: `src/services/SnsService.ts`（既存ファイルを更新）

**変更内容**:

##### 4.1.1 `createPost()`メソッドの更新

**変更前**:

```typescript
async createPost(
  postId: string,
  authorId: string,
  authorName: string,
  authorUsername: string,
  content: string,
  images?: string[],
  tags?: string[]
): Promise<void>
```

**変更後**:

```typescript
async createPost(
  ownerDid: string,
  text: string,
  embed?: { images?: EmbedImage[] },
  facets?: Facet[]
): Promise<{ uri: string; rkey: string }>
```

**実装内容**:

- [ ] rkey生成（`RkeyGenerator.generate()`）
- [ ] AT URI生成（`generatePostAtUri()`）
- [ ] DynamoDBへの保存（Repository構造）
- [ ] GSIキーの設定

##### 4.1.2 `getPost()`メソッドの更新

**変更前**:

```typescript
async getPost(postId: string): Promise<PostData | null>
```

**変更後**:

```typescript
async getPost(uriOrRkey: string): Promise<PostData | null>
```

**実装内容**:

- [ ] AT URIまたはrkeyからownerDidとrkeyを抽出
- [ ] DynamoDBから取得（Repository構造）
- [ ] `PostData`形式に変換

##### 4.1.3 `getAllPosts()`メソッドの更新

**変更前**:

```typescript
async getAllPosts(limit: number, cursor?: string): Promise<PaginatedData<PostData>>
```

**変更後**:

```typescript
async getAllPosts(limit: number, cursor?: string): Promise<PaginatedData<PostData>>
```

**実装内容**:

- [ ] GSI2を使用してフィード取得（`GSI2PK: POST#ALL`）
- [ ] rkeyで時系列ソート（新しい順）
- [ ] ページネーション対応

##### 4.1.4 `getUserPosts()`メソッドの更新

**変更前**:

```typescript
async getUserPosts(userId: string, limit: number, cursor?: string): Promise<PaginatedData<PostData>>
```

**変更後**:

```typescript
async getUserPosts(ownerDid: string, limit: number, cursor?: string): Promise<PaginatedData<PostData>>
```

**実装内容**:

- [ ] GSI1を使用してユーザーの投稿一覧取得（`GSI1PK: REPO#{ownerDid}`）
- [ ] rkeyで時系列ソート（新しい順）
- [ ] ページネーション対応

##### 4.1.5 `deletePost()`メソッドの更新

**変更前**:

```typescript
async deletePost(postId: string): Promise<void>
```

**変更後**:

```typescript
async deletePost(uriOrRkey: string): Promise<void>
```

**実装内容**:

- [ ] AT URIまたはrkeyからownerDidとrkeyを抽出
- [ ] DynamoDBから削除（Repository構造）
- [ ] 関連するLikeレコードの削除（将来的に実装）

---

#### 4.2 Comment操作の実装（Reply Postとして）

**ファイル**: `src/services/SnsService.ts`（既存ファイルを更新）

**変更内容**:

##### 4.2.1 `createComment()`メソッドの更新

**変更前**:

```typescript
async createComment(
  commentId: string,
  postId: string,
  authorId: string,
  content: string
): Promise<void>
```

**変更後**:

```typescript
async createComment(
  ownerDid: string,
  parentPostUri: string,
  text: string
): Promise<{ uri: string; rkey: string }>
```

**実装内容**:

- [ ] rkey生成（`RkeyGenerator.generate()`）
- [ ] AT URI生成（`generatePostAtUri()`）
- [ ] 親投稿のAT URIからrootPostUriを取得
- [ ] ReplyRef構造の作成
- [ ] DynamoDBへの保存（Repository構造、Reply Postとして）
- [ ] GSIキーの設定（GSI3: `REPLY#ROOT#{rootPostUri}`）

##### 4.2.2 `getPostComments()`メソッドの更新

**変更前**:

```typescript
async getPostComments(
  postId: string,
  limit: number,
  cursor?: string
): Promise<PaginatedData<CommentData>>
```

**変更後**:

```typescript
async getPostComments(
  rootPostUri: string,
  limit: number,
  cursor?: string
): Promise<PaginatedData<CommentData>>
```

**実装内容**:

- [ ] GSI3を使用してReply Post取得（`GSI3PK: REPLY#ROOT#{rootPostUri}`）
- [ ] rkeyで時系列ソート（新しい順）
- [ ] ページネーション対応
- [ ] `CommentData`形式に変換

##### 4.2.3 `deleteComment()`メソッドの更新

**変更前**:

```typescript
async deleteComment(postId: string, commentId: string): Promise<void>
```

**変更後**:

```typescript
async deleteComment(uriOrRkey: string): Promise<void>
```

**実装内容**:

- [ ] AT URIまたはrkeyからownerDidとrkeyを抽出
- [ ] DynamoDBから削除（Repository構造）
- [ ] 関連するLikeレコードの削除（将来的に実装）

---

#### 4.3 集計データの計算（AppView）

**ファイル**: `src/services/SnsService.ts`（既存ファイルを更新）

**変更内容**:

- [ ] `getPostLikeCount()`メソッドの実装（AppViewで計算）
- [ ] `getPostCommentCount()`メソッドの実装（AppViewで計算）
- [ ] `getCommentLikeCount()`メソッドの実装（AppViewで計算）

**実装内容**:

- [ ] Likeレコードをクエリしてカウント
- [ ] Reply Postをクエリしてカウント
- [ ] キャッシュの検討（将来的に実装）

**注意**:

- Repositoryには集計データを保存しない
- AppViewで計算（必要に応じてキャッシュ）

---

### Phase 5: API層の更新

#### 5.1 PostsControllerの更新

**ファイル**: `src/controllers/sns/PostsController.ts`（既存ファイルを更新）

**変更内容**:

##### 5.1.1 `createPost()`メソッドの更新

**変更前**:

```typescript
@Post()
public async createPost(@Body() request: CreatePostRequest): Promise<PostResponse>
```

**変更後**:

```typescript
@Post()
@Security('jwt')
public async createPost(@Body() request: CreatePostRequest): Promise<PostResponse>
```

**実装内容**:

- [ ] JWTからownerDidを取得
- [ ] `SnsService.createPost()`を呼び出し
- [ ] レスポンス形式の更新（`uri`, `rkey`を含む）

##### 5.1.2 `getPost()`メソッドの更新

**変更前**:

```typescript
@Get('{postId}')
public async getPost(@Path() postId: string): Promise<PostResponse>
```

**変更後**:

```typescript
@Get('{uriOrRkey}')
public async getPost(@Path() uriOrRkey: string): Promise<PostResponse>
```

**実装内容**:

- [ ] AT URIまたはrkeyをパラメータとして受け取る
- [ ] `SnsService.getPost()`を呼び出し
- [ ] レスポンス形式の更新（`uri`, `rkey`を含む）

##### 5.1.3 `getPosts()`メソッドの更新

**変更前**:

```typescript
@Get()
public async getPosts(@Query() query: GetPostsQuery): Promise<PostListResponse>
```

**変更後**:

```typescript
@Get()
public async getPosts(@Query() limit?: number, @Query() cursor?: string): Promise<PostListResponse>
```

**実装内容**:

- [ ] `SnsService.getAllPosts()`を呼び出し
- [ ] レスポンス形式の更新（`uri`, `rkey`を含む）

##### 5.1.4 `deletePost()`メソッドの更新

**変更前**:

```typescript
@Delete('{postId}')
public async deletePost(@Path() postId: string): Promise<EmptyResponse>
```

**変更後**:

```typescript
@Delete('{uriOrRkey}')
@Security('jwt')
public async deletePost(@Path() uriOrRkey: string): Promise<EmptyResponse>
```

**実装内容**:

- [ ] JWTからownerDidを取得
- [ ] 所有者の確認
- [ ] `SnsService.deletePost()`を呼び出し

---

#### 5.2 CommentsControllerの更新

**ファイル**: `src/controllers/sns/CommentsController.ts`（既存ファイルを更新）

**変更内容**:

##### 5.2.1 `createComment()`メソッドの更新

**変更前**:

```typescript
@Post()
public async createComment(
  @Path() postId: string,
  @Body() request: CreateCommentRequest
): Promise<CommentResponse>
```

**変更後**:

```typescript
@Post()
@Security('jwt')
public async createComment(
  @Path() parentPostUri: string,
  @Body() request: CreateCommentRequest
): Promise<CommentResponse>
```

**実装内容**:

- [ ] JWTからownerDidを取得
- [ ] `parentPostUri`をパラメータとして受け取る
- [ ] `SnsService.createComment()`を呼び出し
- [ ] レスポンス形式の更新（`uri`, `rkey`を含む）

##### 5.2.2 `getPostComments()`メソッドの更新

**変更前**:

```typescript
@Get()
public async getPostComments(
  @Path() postId: string,
  @Query() query: GetCommentsQuery
): Promise<CommentListResponse>
```

**変更後**:

```typescript
@Get()
public async getPostComments(
  @Path() rootPostUri: string,
  @Query() limit?: number,
  @Query() cursor?: string
): Promise<CommentListResponse>
```

**実装内容**:

- [ ] `rootPostUri`をパラメータとして受け取る
- [ ] `SnsService.getPostComments()`を呼び出し
- [ ] レスポンス形式の更新（`uri`, `rkey`を含む）

##### 5.2.3 `deleteComment()`メソッドの更新

**変更前**:

```typescript
@Delete('{commentId}')
public async deleteComment(
  @Path() postId: string,
  @Path() commentId: string
): Promise<EmptyResponse>
```

**変更後**:

```typescript
@Delete('{uriOrRkey}')
@Security('jwt')
public async deleteComment(
  @Path() uriOrRkey: string
): Promise<EmptyResponse>
```

**実装内容**:

- [ ] JWTからownerDidを取得
- [ ] 所有者の確認
- [ ] `SnsService.deleteComment()`を呼び出し

---

#### 5.3 UsersControllerの更新

**ファイル**: `src/controllers/sns/UsersController.ts`（既存ファイルを更新）

**変更内容**:

- [ ] `getUserPosts()`メソッドの更新
  - `userId: string` → `did: string`に変更
  - レスポンス形式の更新（`uri`, `rkey`を含む）

---

### Phase 6: テストの実装

#### 6.1 単体テスト

**ファイル**: `tests/utils/rkeyGenerator.test.ts`（新規作成）

**テスト内容**:

- [ ] `generate()`のテスト
- [ ] `validate()`のテスト
- [ ] `toTimestamp()`のテスト

**ファイル**: `tests/services/SnsService.post.test.ts`（更新）

**テスト内容**:

- [ ] `createPost()`のテスト
- [ ] `getPost()`のテスト
- [ ] `getAllPosts()`のテスト
- [ ] `getUserPosts()`のテスト
- [ ] `deletePost()`のテスト

**ファイル**: `tests/services/SnsService.comment.test.ts`（更新）

**テスト内容**:

- [ ] `createComment()`のテスト（Reply Postとして）
- [ ] `getPostComments()`のテスト
- [ ] `deleteComment()`のテスト

---

#### 6.2 統合テスト

**ファイル**: `tests/controllers/PostsController.test.ts`（更新）

**テスト内容**:

- [ ] `POST /sns/posts`のテスト
- [ ] `GET /sns/posts/{uriOrRkey}`のテスト
- [ ] `GET /sns/posts`のテスト
- [ ] `DELETE /sns/posts/{uriOrRkey}`のテスト

**ファイル**: `tests/controllers/CommentsController.test.ts`（更新）

**テスト内容**:

- [ ] `POST /sns/posts/{parentPostUri}/comments`のテスト
- [ ] `GET /sns/posts/{rootPostUri}/comments`のテスト
- [ ] `DELETE /sns/posts/{uriOrRkey}/comments/{uriOrRkey}`のテスト

---

### Phase 7: ドキュメント更新

#### 7.1 APIドキュメント更新

**ファイル**: `build/swagger.json`（自動生成）

**手順**:

- [ ] `pnpm run tsoa:spec-and-routes`を実行
- [ ] Swagger UIで確認
- [ ] エンドポイントの説明を更新

---

#### 7.2 開発者向けドキュメント

**ファイル**: `docs/AT_PROTOCOL_POST_COMMENT_GUIDE.md`（新規作成）

**内容**:

- [ ] AT Protocol対応の説明
- [ ] データモデル変更の説明
- [ ] APIエンドポイントの変更点
- [ ] 移行ガイド

---

## 📅 実装スケジュール（推奨）

### Week 1: Phase 1-2（準備とデータモデル定義）

**Day 1-2**: Phase 1（依存関係とユーティリティの準備）

- `@atproto/syntax`パッケージのインストール
- rkey生成ユーティリティの実装
- AT URIユーティリティの拡張

**Day 3-5**: Phase 2（データモデルの定義）

- AT Protocol準拠のPostデータモデル定義
- レスポンスモデルの更新
- リクエストモデルの更新

---

### Week 2: Phase 3-4（DynamoDBスキーマとデータアクセス層）

**Day 1-2**: Phase 3（DynamoDBスキーマの更新）

- GSI定義の更新
- 既存GSIの削除
- 新しいGSIの追加（1つずつデプロイ）

**Day 3-5**: Phase 4（データアクセス層の実装）

- Post操作の実装
- Comment操作の実装（Reply Postとして）
- 集計データの計算（AppView）

---

### Week 3: Phase 5-6（API層とテスト）

**Day 1-3**: Phase 5（API層の更新）

- PostsControllerの更新
- CommentsControllerの更新
- UsersControllerの更新

**Day 4-5**: Phase 6（テストの実装）

- 単体テストの実装
- 統合テストの実装

---

### Week 4: Phase 7（ドキュメントと最終確認）

**Day 1-2**: Phase 7（ドキュメント更新）

- APIドキュメント更新
- 開発者向けドキュメント作成

**Day 3-5**: 最終確認とデプロイ

- 全テストの実行
- コードレビュー
- デプロイ

---

## ⚠️ 注意事項

### 1. GSIのデプロイ順序

**重要**: DynamoDBの制限により、GSIは一度に1つずつデプロイする必要があります。

**手順**:

1. 既存のGSI1, GSI2を削除
2. 新しいGSI1を追加
3. GSI1がアクティブになるまで待機
4. 新しいGSI2を追加
5. GSI2がアクティブになるまで待機
6. 新しいGSI3を追加
7. GSI3がアクティブになるまで待機

---

### 2. 後方互換性

**重要**: 既存の`postId`パラメータはサポートしません。

**影響**:

- 既存のAPIクライアントは更新が必要
- フロントエンドの更新が必要

---

### 3. 集計データの計算

**重要**: `likeCount`, `commentCount`はRepositoryに保存しません。

**影響**:

- パフォーマンスへの影響を考慮
- 必要に応じてキャッシュを実装

---

### 4. テストカバレッジ

**目標**: 80%以上のテストカバレッジ

**確認**:

- [ ] 単体テストのカバレッジ確認
- [ ] 統合テストのカバレッジ確認

---

## 🔍 実装チェックリスト

### Phase 1: 依存関係とユーティリティの準備

- [ ] `@atproto/syntax`パッケージのインストール
- [ ] `src/utils/rkeyGenerator.ts`の実装
- [ ] `tests/utils/rkeyGenerator.test.ts`の実装
- [ ] `src/utils/atUri.ts`の拡張

### Phase 2: データモデルの定義

- [ ] `src/models/dynamodb/AtProtocolPostModels.ts`の実装
- [ ] `src/models/responses/SnsResponses.ts`の更新
- [ ] `src/models/requests/SnsRequests.ts`の更新

### Phase 3: DynamoDBスキーマの更新

- [ ] `serverless.yml`のGSI定義更新
- [ ] 既存GSIの削除
- [ ] 新しいGSIの追加（1つずつデプロイ）

### Phase 4: データアクセス層の実装

- [ ] `SnsService.createPost()`の更新
- [ ] `SnsService.getPost()`の更新
- [ ] `SnsService.getAllPosts()`の更新
- [ ] `SnsService.getUserPosts()`の更新
- [ ] `SnsService.deletePost()`の更新
- [ ] `SnsService.createComment()`の更新
- [ ] `SnsService.getPostComments()`の更新
- [ ] `SnsService.deleteComment()`の更新
- [ ] 集計データの計算（AppView）

### Phase 5: API層の更新

- [ ] `PostsController.createPost()`の更新
- [ ] `PostsController.getPost()`の更新
- [ ] `PostsController.getPosts()`の更新
- [ ] `PostsController.deletePost()`の更新
- [ ] `CommentsController.createComment()`の更新
- [ ] `CommentsController.getPostComments()`の更新
- [ ] `CommentsController.deleteComment()`の更新
- [ ] `UsersController.getUserPosts()`の更新

### Phase 6: テストの実装

- [ ] `tests/utils/rkeyGenerator.test.ts`の実装
- [ ] `tests/services/SnsService.post.test.ts`の更新
- [ ] `tests/services/SnsService.comment.test.ts`の更新
- [ ] `tests/controllers/PostsController.test.ts`の更新
- [ ] `tests/controllers/CommentsController.test.ts`の更新

### Phase 7: ドキュメント更新

- [ ] `pnpm run tsoa:spec-and-routes`の実行
- [ ] Swagger UIの確認
- [ ] `docs/AT_PROTOCOL_POST_COMMENT_GUIDE.md`の作成

---

## 🎯 実装開始前の最終確認

### 必須確認事項

1. ✅ **rkey生成ライブラリ**: `@atproto/syntax`を使用
2. ✅ **フィールド名変更**: 全部すぐに実装
3. ✅ **GSI設計**: 新しいRepository構造に合わせて再設計
4. ✅ **集計データ**: AT Protocol準拠（AppViewで計算）
5. ✅ **既存エンドポイント**: 変更する（`postId`はサポートしない）
6. ✅ **レスポンス形式**: `postId`は不要（`uri`と`rkey`のみ）
7. ✅ **Collection名**: `app.bsky.feed.post`（PostとComment共通）

### 実装準備完了

すべての確認事項が完了しました。実装を開始できます。

---

**最終更新**: 2026-01-05  
**実装開始**: 準備完了
