# AT Protocol Collection名について

**作成日**: 2026-01-05  
**目的**: AT ProtocolのCollection名の仕様と今回のプロジェクトでの使用方針

---

## 📋 AT Protocol Collectionとは

**Collection**は、AT ProtocolのRepository内でRecordの種類を識別するための名前空間です。

### 基本概念

- **Repository**: ユーザーごとのデータストア（`REPO#{ownerDid}`）
- **Collection**: Recordの種類（例: `app.bsky.feed.post`）
- **Record**: Collection内の個々のデータ（rkeyで識別）

### AT URIとの関係

```
at://{ownerDid}/{collection}/{rkey}
```

**例**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

- `did:plc:abc123`: ownerDid（Repositoryの所有者）
- `app.bsky.feed.post`: collection（Recordの種類）
- `3k2abc123def456`: rkey（Record Key）

---

## 🎯 AT Protocol標準Collection

### 1. Post（投稿）

**Collection名**: `app.bsky.feed.post`

**用途**:

- 通常の投稿（Post）
- 返信投稿（Reply Post、Commentとして扱う）

**特徴**:

- AT Protocol標準コレクション
- Blueskyで標準的に使用
- `reply`フィールドで親子関係を表現

**AT URI例**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

---

### 2. Like（いいね）

**Collection名**: `app.bsky.feed.like`

**用途**:

- Postへのいいね
- Commentへのいいね

**特徴**:

- AT Protocol標準コレクション
- `subject`フィールドで対象を参照

**AT URI例**:

```
at://did:plc:abc123/app.bsky.feed.like/3k2def456ghi789
```

---

### 3. Follow（フォロー）

**Collection名**: `app.bsky.graph.follow`

**用途**:

- ユーザー間のフォロー関係

**特徴**:

- AT Protocol標準コレクション
- `subject`フィールドでフォロー対象を参照

**AT URI例**:

```
at://did:plc:abc123/app.bsky.graph.follow/3k2ghi789jkl012
```

---

## 📝 今回のプロジェクトでのCollection使用方針

### 1. Post（投稿）

**Collection名**: `app.bsky.feed.post`

**使用箇所**:

- 通常の投稿（Post）
- 返信投稿（Comment、Reply Postとして扱う）

**実装例**:

```typescript
// 通常の投稿
const postAtUri = `at://${ownerDid}/app.bsky.feed.post/${rkey}`;

// 返信投稿（Comment）
const commentAtUri = `at://${ownerDid}/app.bsky.feed.post/${rkey}`;
// replyフィールドで親子関係を表現
const reply = {
  root: { uri: rootPostUri },
  parent: { uri: parentPostUri },
};
```

**DynamoDB構造**:

```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.feed.post#${rkey}`,
  collection: 'app.bsky.feed.post',
  rkey: '3k2abc123def456',
  uri: 'at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456',
  // ... その他のフィールド
}
```

---

### 2. Comment（コメント）

**Collection名**: `app.bsky.feed.post`（Postと同じ）

**使用箇所**:

- コメント（Reply Postとして扱う）

**実装例**:

```typescript
// CommentはPostと同じCollectionを使用
const commentAtUri = `at://${ownerDid}/app.bsky.feed.post/${rkey}`;

// replyフィールドで親子関係を表現
const reply = {
  root: { uri: rootPostUri }, // ルート投稿のAT URI
  parent: { uri: parentPostUri }, // 親投稿のAT URI
};
```

**DynamoDB構造**:

```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.feed.post#${rkey}`,
  collection: 'app.bsky.feed.post',
  rkey: '3k2def456ghi789',
  uri: 'at://did:plc:abc123/app.bsky.feed.post/3k2def456ghi789',
  reply: {
    root: {
      uri: 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456',
      cid: undefined, // 将来的に実装
    },
    parent: {
      uri: 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456',
      cid: undefined, // 将来的に実装
    },
  },
  // ... その他のフィールド
}
```

---

### 3. Like（いいね）

**Collection名**: `app.bsky.feed.like`

**使用箇所**:

- Postへのいいね
- Commentへのいいね

**実装例**:

```typescript
const likeAtUri = `at://${ownerDid}/app.bsky.feed.like/${rkey}`;

// subjectフィールドで対象を参照
const subject = {
  uri: 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456',
  cid: undefined, // 将来的に実装
};
```

**DynamoDB構造**:

```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.feed.like#${rkey}`,
  collection: 'app.bsky.feed.like',
  rkey: '3k2ghi789jkl012',
  uri: 'at://did:plc:abc123/app.bsky.feed.like/3k2ghi789jkl012',
  subject: {
    uri: 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456',
    cid: undefined, // 将来的に実装
  },
  // ... その他のフィールド
}
```

---

### 4. Follow（フォロー）

**Collection名**: `app.bsky.graph.follow`

**使用箇所**:

- ユーザー間のフォロー関係

**実装例**:

```typescript
const followAtUri = `at://${ownerDid}/app.bsky.graph.follow/${rkey}`;

// subjectフィールドでフォロー対象を参照
const subject = {
  uri: 'at://did:plc:xyz789/app.bsky.actor.profile/self',
  cid: undefined, // 将来的に実装
};
```

**DynamoDB構造**:

```typescript
{
  PK: `REPO#${ownerDid}`,
  SK: `REC#app.bsky.graph.follow#${rkey}`,
  collection: 'app.bsky.graph.follow',
  rkey: '3k2jkl012mno345',
  uri: 'at://did:plc:abc123/app.bsky.graph.follow/3k2jkl012mno345',
  subject: {
    uri: 'at://did:plc:xyz789/app.bsky.actor.profile/self',
    cid: undefined, // 将来的に実装
  },
  // ... その他のフィールド
}
```

---

## 🔍 Collection名の命名規則

### AT Protocol標準Collection

**形式**: `app.bsky.{category}.{type}`

**例**:

- `app.bsky.feed.post` - 投稿
- `app.bsky.feed.like` - いいね
- `app.bsky.graph.follow` - フォロー
- `app.bsky.actor.profile` - プロフィール

### 独自拡張Collection（将来的に必要になったら）

**形式**: `jp.heartland.{category}.{type}`

**例**:

- `jp.heartland.feed.post.meta` - Postメタデータ（将来的に必要になったら）
- `jp.heartland.feed.comment.meta` - Commentメタデータ（将来的に必要になったら）

**注意**: 独自拡張Collectionは、標準Collectionを汚染しないように分離して使用

---

## 📊 今回のプロジェクトでのCollection一覧

| 用途                    | Collection名                     | AT Protocol標準 | 実装状況    |
| ----------------------- | -------------------------------- | --------------- | ----------- |
| **Post（投稿）**        | `app.bsky.feed.post`             | ✅ 標準         | 🚧 実装予定 |
| **Comment（コメント）** | `app.bsky.feed.post`             | ✅ 標準         | 🚧 実装予定 |
| **Like（いいね）**      | `app.bsky.feed.like`             | ✅ 標準         | 📝 将来実装 |
| **Follow（フォロー）**  | `app.bsky.graph.follow`          | ✅ 標準         | 📝 将来実装 |
| **Postメタデータ**      | `jp.heartland.feed.post.meta`    | ⚠️ 独自拡張     | 📝 将来実装 |
| **Commentメタデータ**   | `jp.heartland.feed.comment.meta` | ⚠️ 独自拡張     | 📝 将来実装 |

---

## 🎯 実装方針

### 1. PostとCommentのCollection

**決定事項**:

- ✅ Post: `app.bsky.feed.post`
- ✅ Comment: `app.bsky.feed.post`（Reply Postとして扱う）

**理由**:

- AT Protocol標準に準拠
- CommentをReply Postとして扱うことで、標準的な実装が可能
- `reply`フィールドで親子関係を表現

### 2. 独自拡張Collection

**決定事項**:

- ⚠️ 最小実装では不要
- 📝 将来的に必要になったら追加

**理由**:

- 標準Collectionを汚染しない
- 必要に応じて柔軟に拡張可能

---

## 📝 実装例

### Post作成時

```typescript
import { TID } from '@atproto/syntax';
import { generateAtUri } from '../utils/atUri';

const ownerDid = 'did:plc:abc123';
const collection = 'app.bsky.feed.post'; // ← これがCollection名
const rkey = TID.next();
const atUri = generateAtUri(ownerDid, collection, rkey);
// "at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456"

const item = {
  PK: `REPO#${ownerDid}`,
  SK: `REC#${collection}#${rkey}`,
  ownerDid,
  collection, // 'app.bsky.feed.post'
  rkey,
  uri: atUri,
  text: 'Hello, world!',
  // ... その他のフィールド
};
```

### Comment作成時（Reply Post）

```typescript
import { TID } from '@atproto/syntax';
import { generateAtUri } from '../utils/atUri';

const ownerDid = 'did:plc:abc123';
const collection = 'app.bsky.feed.post'; // ← Postと同じCollection
const rkey = TID.next();
const atUri = generateAtUri(ownerDid, collection, rkey);
// "at://did:plc:abc123/app.bsky.feed.post/3k2def456ghi789"

const parentPostUri = 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456';
const rootPostUri = parentPostUri; // ルートPost（通常は親と同じ）

const item = {
  PK: `REPO#${ownerDid}`,
  SK: `REC#${collection}#${rkey}`,
  ownerDid,
  collection, // 'app.bsky.feed.post'
  rkey,
  uri: atUri,
  text: 'Great post!',
  reply: {
    root: {
      uri: rootPostUri,
      cid: undefined, // 将来的に実装
    },
    parent: {
      uri: parentPostUri,
      cid: undefined, // 将来的に実装
    },
  },
  // ... その他のフィールド
};
```

---

## ✅ まとめ

### 今回のプロジェクトでのCollection名

1. **Post（投稿）**: `app.bsky.feed.post`
2. **Comment（コメント）**: `app.bsky.feed.post`（Reply Postとして扱う）
3. **Like（いいね）**: `app.bsky.feed.like`（将来実装）
4. **Follow（フォロー）**: `app.bsky.graph.follow`（将来実装）

### 重要なポイント

- ✅ AT Protocol標準Collectionを使用
- ✅ CommentはPostと同じCollection（Reply Postとして扱う）
- ✅ `reply`フィールドで親子関係を表現
- ⚠️ 独自拡張Collectionは将来的に必要になったら追加

---

**最終更新**: 2026-01-05
