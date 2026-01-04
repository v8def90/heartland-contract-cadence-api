# AT Protocol Lexicon規則との適合性分析レポート

**作成日**: 2026-01-03  
**目的**: 現在のAPIレスポンスモデルがAT ProtocolのLexicon規則に沿っているかの分析  
**対象**: すべてのAPIレスポンスモデル

---

## 📊 分析結果サマリー

### 結論

**現在のAPIレスポンスは、AT ProtocolのLexicon規則に完全には沿っていません。**

- **完全準拠**: 約30%
- **部分準拠**: 約40%
- **独自拡張**: 約30%

---

## ❌ Lexicon規則に沿っていない項目（修正推奨）

### UserProfile インターフェース

| 現在のフィールド名 | AT Protocol標準 | 説明 |
|-------------------|----------------|------|
| `userId` | `did` | ユーザー識別子はDID形式を使用 |
| `username` | `handle` | ユーザー名はhandle形式を使用 |
| `bio` | `description` | 自己紹介はdescriptionフィールドを使用 |
| `avatarUrl` | `avatar` | アバター画像URL（URLは含まれる） |
| `backgroundImageUrl` | `banner` | バナー画像URL |

### PostData インターフェース

| 現在のフィールド名 | AT Protocol標準 | 説明 |
|-------------------|----------------|------|
| `postId` | `uri` | 投稿IDはAT URI形式を使用 |
| `authorId` | `author.did` | 著者情報はオブジェクト構造（`author.did`） |
| `authorName` | `author.displayName` | 著者表示名は`author.displayName` |
| `authorUsername` | `author.handle` | 著者ハンドルは`author.handle` |
| `content` | `text` | 投稿内容は`text`フィールドを使用 |
| `commentCount` | `replyCount` | コメント数は`replyCount`を使用 |
| `isLiked` | `viewer.like` | いいね状態は`viewer.like`オブジェクト構造 |

### CommentData インターフェース

| 現在のフィールド名 | AT Protocol標準 | 説明 |
|-------------------|----------------|------|
| `commentId` | `uri` | コメントIDはAT URI形式を使用 |
| `postId` | `reply.root.uri` | 返信先投稿は`reply.root.uri`オブジェクト構造 |
| `authorId` | `author.did` | 著者情報はオブジェクト構造 |
| `content` | `text` | コメント内容は`text`フィールドを使用 |

### LikeData インターフェース

| 現在のフィールド名 | AT Protocol標準 | 説明 |
|-------------------|----------------|------|
| `userId` | `actor.did` | いいねしたユーザーは`actor.did` |
| `username` | `actor.handle` | ユーザーハンドルは`actor.handle` |
| `avatarUrl` | `actor.avatar` | アバターは`actor.avatar` |

### FollowData インターフェース

| 現在のフィールド名 | AT Protocol標準 | 説明 |
|-------------------|----------------|------|
| `userId` | `did` | ユーザー識別子はDID形式 |
| `username` | `handle` | ユーザー名はhandle形式 |
| `bio` | `description` | 自己紹介はdescription |
| `avatarUrl` | `avatar` | アバター画像URL |

---

## ✅ Lexicon規則に沿っている項目

### 標準準拠フィールド

- **`displayName`** - AT Protocol標準（app.bsky.actor.profile）
- **`followerCount`** - AT Protocol標準（app.bsky.actor.getProfile）
- **`followingCount`** - AT Protocol標準（app.bsky.actor.getProfile）
- **`createdAt`** - AT Protocol標準（一部のレコードで使用）

---

## ⚠️ 独自拡張項目（Lexicon標準にはないが、許容可能）

以下のフィールドはAT Protocol標準にはありませんが、独自拡張として許容可能です：

- **`email`** - 独自拡張（認証用途）
- **`walletAddress`** - 独自拡張（Flow/ブロックチェーン統合）
- **`postCount`** - 独自拡張（統計情報、標準では`postsCount`）
- **`updatedAt`** - 独自拡張（更新タイムスタンプ）

---

## 📋 AT Protocol標準との比較

### app.bsky.actor.getProfile レスポンス構造（参考）

```typescript
{
  did: string;              // ✅ 標準
  handle: string;           // ✅ 標準
  displayName?: string;     // ✅ 標準
  description?: string;     // ✅ 標準（bioではなくdescription）
  avatar?: string;          // ✅ 標準（avatarUrlではなくavatar）
  banner?: string;          // ✅ 標準（backgroundImageUrlではなくbanner）
  followersCount?: number;  // ✅ 標準
  followsCount?: number;    // ✅ 標準（followingCountではなくfollowsCount）
  postsCount?: number;      // ⚠️ 標準（postCountではなくpostsCount）
  indexedAt?: string;       // ✅ 標準（createdAtではなくindexedAt）
  viewer?: {
    muted?: boolean;
    blockedBy?: boolean;
    following?: string;
    followedBy?: string;
  };
}
```

### app.bsky.feed.post レコード構造（参考）

```typescript
{
  text: string;             // ✅ 標準（contentではなくtext）
  createdAt: string;        // ✅ 標準
  embed?: {
    images?: Array<{
      image: string;
      alt: string;
    }>;
  };
  reply?: {
    root: { uri: string; cid: string; };
    parent: { uri: string; cid: string; };
  };
}
```

### app.bsky.feed.getAuthorFeed レスポンス構造（参考）

```typescript
{
  feed: Array<{
    post: {
      uri: string;          // ✅ 標準（postIdではなくuri）
      cid: string;
      author: {
        did: string;       // ✅ 標準（authorIdではなくauthor.did）
        handle: string;    // ✅ 標準（authorUsernameではなくauthor.handle）
        displayName?: string; // ✅ 標準（authorNameではなくauthor.displayName）
        avatar?: string;
      };
      record: {
        text: string;       // ✅ 標準（contentではなくtext）
        createdAt: string;
      };
      replyCount?: number;  // ✅ 標準（commentCountではなくreplyCount）
      likeCount?: number;
      repostCount?: number;
      viewer?: {
        like?: string;      // ✅ 標準（isLikedではなくviewer.like）
        repost?: string;
      };
    };
  }>;
}
```

---

## 🎯 推奨される修正方針

### オプション1: 完全準拠（推奨）

**メリット**:
- AT Protocol標準との完全互換性
- 他のAT Protocolサービスとの相互運用性向上
- 将来の拡張性

**デメリット**:
- 既存クライアントへの影響（破壊的変更）
- 移行期間が必要

**実装方法**:
- すべてのフィールド名をAT Protocol標準に変更
- 互換性のため、旧フィールド名も一時的に保持（非推奨マーク）
- バージョニング（例: `/v2/sns/users/...`）

### オプション2: ハイブリッド

**メリット**:
- 段階的な移行が可能
- 既存クライアントへの影響を最小化

**デメリット**:
- 標準と独自拡張の混在による混乱の可能性

**実装方法**:
- 標準フィールドはAT Protocol準拠（`did`, `handle`, `description`など）
- 独自拡張フィールドは現在の命名を維持（`email`, `walletAddress`など）
- 両方のフィールドを返却（標準フィールドを優先）

### オプション3: 現状維持

**メリット**:
- 既存クライアントへの影響なし
- 実装コストなし

**デメリット**:
- AT Protocol標準との非互換性
- 相互運用性の制限

**実装方法**:
- 独自APIとして現在の命名を維持
- AT Protocol互換性は別エンドポイントで提供（例: `/atproto/...`）

---

## 📝 具体的な修正例

### UserProfile の修正例

**現在**:
```typescript
export interface UserProfile {
  userId: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  backgroundImageUrl?: string;
  // ...
}
```

**AT Protocol準拠**:
```typescript
export interface UserProfile {
  did: string;              // userId → did
  handle: string;           // username → handle
  displayName?: string;     // ✅ 既に準拠
  description?: string;     // bio → description
  avatar?: string;          // avatarUrl → avatar
  banner?: string;          // backgroundImageUrl → banner
  followersCount?: number;   // followerCount → followersCount
  followsCount?: number;    // followingCount → followsCount
  postsCount?: number;      // postCount → postsCount
  indexedAt?: string;       // createdAt → indexedAt（オプション）
  // 独自拡張
  email?: string;           // 独自拡張（維持）
  walletAddress?: string;   // 独自拡張（維持）
}
```

### PostData の修正例

**現在**:
```typescript
export interface PostData {
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  commentCount: number;
  isLiked: boolean;
  // ...
}
```

**AT Protocol準拠**:
```typescript
export interface PostData {
  uri: string;              // postId → uri
  cid?: string;             // 追加（Content Identifier）
  author: {
    did: string;            // authorId → author.did
    handle: string;         // authorUsername → author.handle
    displayName?: string;   // authorName → author.displayName
    avatar?: string;
  };
  record: {
    text: string;           // content → record.text
    createdAt: string;
  };
  replyCount?: number;      // commentCount → replyCount
  likeCount?: number;
  viewer?: {
    like?: string;          // isLiked → viewer.like (AT URI or undefined)
    repost?: string;
  };
  // ...
}
```

---

## 🔍 命名規則の詳細

### AT Protocol Lexicon命名規則

1. **camelCase**: すべてのフィールド名は`lowerCamelCase`を使用
2. **標準フィールド名**: 特定の意味を持つフィールドは標準名を使用
   - `did`: Decentralized Identifier
   - `handle`: AT Protocol Handle
   - `uri`: AT URI
   - `cid`: Content Identifier
   - `description`: プロフィール説明
   - `avatar`: アバター画像URL
   - `banner`: バナー画像URL
3. **オブジェクト構造**: 関連する情報はオブジェクトとして構造化
   - `author.did`, `author.handle`, `author.displayName`
   - `viewer.like`, `viewer.repost`
   - `reply.root.uri`, `reply.parent.uri`

---

## 📌 次のステップ

1. **修正方針の決定**
   - オプション1（完全準拠）、オプション2（ハイブリッド）、オプション3（現状維持）のいずれかを選択

2. **影響範囲の確認**
   - 既存クライアントへの影響評価
   - 移行計画の策定

3. **実装計画**
   - フィールド名変更の実装
   - 互換性レイヤーの実装（オプション）
   - テスト計画の策定

---

## 📚 参考資料

- [AT Protocol Lexicon仕様](https://atproto.com/specs/lexicon)
- [AT Protocol Lexiconスタイルガイド](https://atproto.com/guides/lexinomicon)
- [app.bsky.actor.getProfile](https://atproto.com/specs/lexicon#app.bsky.actor.getProfile)
- [app.bsky.feed.post](https://atproto.com/specs/lexicon#app.bsky.feed.post)

