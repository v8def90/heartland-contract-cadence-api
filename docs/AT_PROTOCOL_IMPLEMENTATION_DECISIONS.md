# AT Protocol対応: Post/Comment 実装決定事項

**作成日**: 2026-01-05  
**目的**: 実装前に決定した事項のまとめ

---

## ✅ 決定事項まとめ

### 1. rkey生成ライブラリ

**決定**: `@atproto/syntax`を使用（AT Protocol標準、TID形式）

**理由**:
- AT Protocol標準準拠
- 13文字で短い
- Blueskyで標準的に使用

**実装**:
```typescript
import { TID } from '@atproto/syntax';
const rkey = TID.next();
```

---

### 2. フィールド名変更

**決定**: 全部すぐに実装

**変更内容**:
- `content` → `text` ✅ すぐに実装
- `images` → `embed.images` ✅ すぐに実装
- `tags` → `facets` ✅ すぐに実装

**実装方針**:
- APIリクエスト/レスポンスの両方を変更
- 後方互換性は不要（`postId`もサポートしない）

---

### 3. GSI設計

**決定**: 今回の変更に伴って適切なGSI設定

**新しいRepository構造**:
- **PK**: `REPO#{ownerDid}`
- **SK**: `REC#app.bsky.feed.post#{rkey}`

**必要なGSI**:
- **GSI1**: ユーザーの投稿一覧取得用
  - `GSI1PK: REPO#{ownerDid}`
  - `GSI1SK: REC#app.bsky.feed.post#{rkey}`
- **GSI2**: フィード取得用（全ユーザーの投稿、時系列順）
  - `GSI2PK: POST#ALL`（固定値）
  - `GSI2SK: REC#app.bsky.feed.post#{rkey}`
- **GSI3**: Reply Post取得用（親投稿のReply一覧）
  - `GSI3PK: REPLY#ROOT#{rootPostUri}`（ルート投稿のAT URI）
  - `GSI3SK: REC#app.bsky.feed.post#{rkey}`

**既存GSI**:
- 既存のGSI（GSI1, GSI2）は削除して問題ない

---

### 4. 集計データの扱い

**決定**: AT Protocol準拠（AppViewで計算、Repositoryには保存しない）

**実装方針**:
- `likeCount`, `commentCount`をRepositoryに保存しない
- AppViewで計算（必要に応じてキャッシュ）

**注意**:
- パフォーマンス向上のため、将来的にキャッシュを検討する可能性あり

---

### 5. 既存エンドポイントの互換性

**決定**: 変更する（`postId`はサポートしなくていい）

**変更内容**:
- `GET /sns/posts/{postId}` → `GET /sns/posts/{atUri}` または `GET /sns/posts/{rkey}`
- `POST /sns/posts/{postId}/comments` → `POST /sns/posts/{atUri}/comments` または `POST /sns/posts/{rkey}/comments`

**実装方針**:
- `postId`パラメータはサポートしない
- AT URIまたはrkeyのみをサポート

---

### 6. レスポンス形式の変更

**決定**: `postId`は不要（`uri`と`rkey`のみ）

**変更内容**:
- `PostData.postId: string` → 削除
- `PostData.uri: string` → 追加（AT URI形式）
- `PostData.rkey: string` → 追加（rkey形式）

**実装方針**:
- レスポンスに`postId`を含めない
- `uri`と`rkey`のみを含める

---

### 7. AT URIのCollection名

**決定**: 
- **Post（投稿）**: `app.bsky.feed.post`
- **Comment（コメント）**: `app.bsky.feed.post`（Reply Postとして扱う）

**理由**:
- AT Protocol標準Collectionを使用
- CommentはPostと同じCollection（Reply Postとして扱う）
- `reply`フィールドで親子関係を表現

**AT URI例**:
```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

---

## 📋 実装方針まとめ

### 1. データモデル

**Post（投稿）**:
```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.feed.post#${rkey}`,
  ownerDid: string,
  collection: 'app.bsky.feed.post',
  rkey: string,
  uri: string, // at://{ownerDid}/app.bsky.feed.post/{rkey}
  text: string, // content → text
  embed?: {
    images?: string[], // images → embed.images
  },
  facets?: Facet[], // tags → facets
  createdAt: string,
  // likeCount, commentCountは保存しない（AppViewで計算）
}
```

**Comment（コメント、Reply Post）**:
```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.feed.post#${rkey}`,
  ownerDid: string,
  collection: 'app.bsky.feed.post', // Postと同じCollection
  rkey: string,
  uri: string, // at://{ownerDid}/app.bsky.feed.post/{rkey}
  text: string,
  reply: {
    root: {
      uri: string, // ルート投稿のAT URI
      cid?: string, // 将来的に実装
    },
    parent: {
      uri: string, // 親投稿のAT URI
      cid?: string, // 将来的に実装
    },
  },
  createdAt: string,
  // likeCountは保存しない（AppViewで計算）
}
```

---

### 2. APIエンドポイント

**変更前**:
- `GET /sns/posts/{postId}`
- `POST /sns/posts/{postId}/comments`

**変更後**:
- `GET /sns/posts/{atUri}` または `GET /sns/posts/{rkey}`
- `POST /sns/posts/{atUri}/comments` または `POST /sns/posts/{rkey}/comments`

**実装方針**:
- AT URIまたはrkeyをパラメータとして受け取る
- `postId`はサポートしない

---

### 3. レスポンス形式

**変更前**:
```typescript
{
  postId: string,
  authorId: string,
  content: string,
  images?: string[],
  tags?: string[],
  likeCount: number,
  commentCount: number,
}
```

**変更後**:
```typescript
{
  uri: string, // AT URI
  rkey: string, // rkey
  ownerDid: string, // authorId → ownerDid
  text: string, // content → text
  embed?: {
    images?: string[], // images → embed.images
  },
  facets?: Facet[], // tags → facets
  // likeCount, commentCountはレスポンスに含めない（AppViewで計算）
}
```

---

### 4. GSI設計

**GSI1**: ユーザーの投稿一覧取得用
```typescript
{
  GSI1PK: `REPO#${ownerDid}`,
  GSI1SK: `REC#app.bsky.feed.post#${rkey}`,
}
```

**GSI2**: フィード取得用（全ユーザーの投稿、時系列順）
```typescript
{
  GSI2PK: 'POST#ALL', // 固定値
  GSI2SK: `REC#app.bsky.feed.post#${rkey}`,
}
```

**GSI3**: Reply Post取得用（親投稿のReply一覧）
```typescript
{
  GSI3PK: `REPLY#ROOT#${rootPostUri}`, // ルート投稿のAT URI
  GSI3SK: `REC#app.bsky.feed.post#${rkey}`,
}
```

---

## 🎯 実装チェックリスト

### Phase 1: データモデル設計

- [ ] `@atproto/syntax`パッケージのインストール
- [ ] `DynamoDBBskyPostRecordItem`インターフェースの定義
- [ ] Repository構造（PK: `REPO#{ownerDid}`, SK: `REC#app.bsky.feed.post#{rkey}`）の実装
- [ ] AT URI生成・管理機能の実装
- [ ] rkey生成ユーティリティ（TID）の実装

### Phase 2: データアクセス層の実装

- [ ] `SnsService.createPost()`をAT Protocol準拠に変更
- [ ] `SnsService.getPost()`をAT Protocol準拠に変更
- [ ] `SnsService.getAllPosts()`をAT Protocol準拠に変更
- [ ] `SnsService.getUserPosts()`をAT Protocol準拠に変更
- [ ] `SnsService.deletePost()`をAT Protocol準拠に変更
- [ ] `SnsService.createComment()`をReply Postとして実装
- [ ] `SnsService.getPostComments()`をReply Postクエリに変更
- [ ] `SnsService.deleteComment()`をReply Post削除に変更
- [ ] GSI設計と実装

### Phase 3: API層の更新

- [ ] `PostsController`の全メソッドをAT Protocol準拠に更新
- [ ] `CommentsController`の全メソッドをReply Postとして更新
- [ ] リクエスト/レスポンスモデルの更新
- [ ] AT URIをパラメータとして受け取るように変更
- [ ] `postId`パラメータの削除

### Phase 4: フィールド名変更

- [ ] `content` → `text` への変更
- [ ] `images` → `embed.images` への変換
- [ ] `tags` → `facets` への変換

### Phase 5: 集計データの扱い

- [ ] `likeCount`, `commentCount`をRepositoryから削除
- [ ] AppViewで計算するロジックの実装

### Phase 6: テストと検証

- [ ] Post操作の単体テスト作成
- [ ] Comment操作の単体テスト作成
- [ ] AT URI生成・解析のテスト作成
- [ ] rkey生成のテスト作成
- [ ] APIエンドポイントの統合テスト

### Phase 7: ドキュメント更新

- [ ] Swagger/OpenAPI仕様書の更新
- [ ] エンドポイントの説明更新
- [ ] リクエスト/レスポンス例の更新

---

## 📝 実装前の最終確認

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

