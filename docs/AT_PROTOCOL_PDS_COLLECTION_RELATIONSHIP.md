# AT Protocol: PDSサーバーとCollection名の関係

**作成日**: 2026-01-05  
**目的**: PDSサーバーのURLとCollection名の関係についての説明

---

## 📋 質問

**Q**: AT URIは、PDSサーバーを別に立てたとして（`pds-dev.heart-land.io`）も、Collection名としては`app.bsky.feed.post`を使うのでしょうか？

**A**: **はい、Collection名は`app.bsky.feed.post`を使用します。**

PDSサーバーのURLとCollection名は**独立した概念**です。

---

## 🎯 AT URIの構造

### AT URIの形式

```
at://{authority}/{collection}/{rkey}
```

**例**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

### 各要素の説明

1. **`{authority}`**: Repositoryの所有者を識別
   - **DID形式**: `did:plc:abc123`（推奨）
   - **Handle形式**: `@user.bsky.social`（オプション）
   - **PDSサーバーのURLではない**: `pds-dev.heart-land.io`は直接使用しない

2. **`{collection}`**: Recordの種類を識別
   - **AT Protocol標準Collection**: `app.bsky.feed.post`（標準仕様）
   - **独自拡張Collection**: `jp.heartland.feed.post.meta`（独自拡張）
   - **PDSサーバーのURLとは無関係**: Collection名は標準仕様に従う

3. **`{rkey}`**: Record Key（TID/ULID形式）
   - **例**: `3k2abc123def456`

---

## 🔍 PDSサーバーとCollection名の関係

### 重要なポイント

**PDSサーバーのURLとCollection名は独立しています。**

- ✅ **Collection名**: AT Protocolの標準仕様に基づく（`app.bsky.feed.post`）
- ✅ **PDSサーバーURL**: Repositoryのホストとして機能（`pds-dev.heart-land.io`）
- ❌ **混同しない**: PDSサーバーのURLがCollection名になるわけではない

### 具体例

#### ケース1: 標準Bluesky PDSを使用

**PDSサーバー**: `https://bsky.social`（Bluesky公式PDS）

**AT URI**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

**Collection名**: `app.bsky.feed.post`（標準）

---

#### ケース2: 独自PDSサーバーを使用

**PDSサーバー**: `https://pds-dev.heart-land.io`（独自PDS）

**AT URI**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

**Collection名**: `app.bsky.feed.post`（標準、**PDSサーバーのURLとは無関係**）

---

#### ケース3: 独自拡張Collectionを使用

**PDSサーバー**: `https://pds-dev.heart-land.io`（独自PDS）

**AT URI（標準Post）**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

**AT URI（独自拡張メタデータ）**:

```
at://did:plc:abc123/jp.heartland.feed.post.meta/3k2def456ghi789
```

**Collection名**:

- 標準: `app.bsky.feed.post`（AT Protocol標準）
- 独自拡張: `jp.heartland.feed.post.meta`（独自名前空間）

---

## 📊 PDSサーバーとCollection名の関係図

```
┌─────────────────────────────────────────────────────────┐
│                    AT URI構造                            │
├─────────────────────────────────────────────────────────┤
│  at://{authority}/{collection}/{rkey}                   │
│                                                          │
│  authority: did:plc:abc123  (Repositoryの所有者)         │
│  collection: app.bsky.feed.post  (Recordの種類)         │
│  rkey: 3k2abc123def456  (Record Key)                    │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  PDSサーバーURL   │              │   Collection名    │
│  (Repository)    │              │   (Record Type)   │
├──────────────────┤              ├──────────────────┤
│ pds-dev.heart-   │              │ app.bsky.feed.   │
│ land.io          │              │ post             │
│                  │              │                  │
│ ・Repositoryの   │              │ ・AT Protocol     │
│   ホスト         │              │   標準仕様        │
│ ・データの保存   │              │ ・PDSサーバーと   │
│   場所           │              │   無関係          │
│ ・DID解決の      │              │ ・標準Collection │
│   エンドポイント │              │   を使用          │
└──────────────────┘              └──────────────────┘
```

---

## 🎯 今回のプロジェクトでの実装方針

### 1. PDSサーバー

**開発環境**: `https://pds-dev.heart-land.io`（独自PDS）

**役割**:

- Repositoryのホストとして機能
- DID解決のエンドポイント
- データの保存場所

---

### 2. Collection名

**標準Collection**: `app.bsky.feed.post`

**使用箇所**:

- Post（投稿）
- Comment（コメント、Reply Postとして扱う）

**理由**:

- AT Protocol標準仕様に準拠
- PDSサーバーのURLとは無関係
- 相互運用性を維持

---

### 3. AT URIの生成

**実装例**:

```typescript
import { TID } from '@atproto/syntax';
import { generateAtUri } from '../utils/atUri';

// PDSサーバーURL（開発環境）
const pdsUrl = 'https://pds-dev.heart-land.io';

// ユーザーのDID（Repositoryの所有者）
const ownerDid = 'did:plc:abc123';

// Collection名（AT Protocol標準）
const collection = 'app.bsky.feed.post'; // ← PDSサーバーのURLとは無関係

// rkey生成
const rkey = TID.next();

// AT URI生成
const atUri = generateAtUri(ownerDid, collection, rkey);
// "at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456"
// ↑ PDSサーバーのURLは含まれない
```

---

## 🔍 よくある誤解

### 誤解1: PDSサーバーのURLがCollection名になる

**誤解**:

```
at://pds-dev.heart-land.io/app.bsky.feed.post/3k2abc123def456
```

**正解**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

**理由**:

- AT URIの`{authority}`はDIDまたはHandle
- PDSサーバーのURLは直接使用しない
- Collection名はAT Protocol標準仕様に従う

---

### 誤解2: 独自PDSサーバーを使うと独自Collection名が必要

**誤解**: 独自PDSサーバー（`pds-dev.heart-land.io`）を使う場合、独自Collection名（例: `jp.heartland.feed.post`）が必要

**正解**: 独自PDSサーバーを使っても、標準Collection名（`app.bsky.feed.post`）を使用できる

**理由**:

- Collection名はAT Protocol標準仕様に基づく
- PDSサーバーのURLとは独立
- 独自拡張が必要な場合のみ、独自Collection名を使用

---

## 📝 まとめ

### 重要なポイント

1. **Collection名はAT Protocol標準仕様に従う**
   - `app.bsky.feed.post`（標準）
   - PDSサーバーのURLとは無関係

2. **PDSサーバーのURLはRepositoryのホスト**
   - `pds-dev.heart-land.io`（開発環境）
   - AT URIには直接含まれない

3. **AT URIの`{authority}`はDIDまたはHandle**
   - `did:plc:abc123`（推奨）
   - `@user.bsky.social`（オプション）

4. **独自拡張が必要な場合のみ独自Collection名を使用**
   - `jp.heartland.feed.post.meta`（独自拡張）
   - 標準Collectionを汚染しない

---

### 今回のプロジェクトでの実装

**PDSサーバー**: `https://pds-dev.heart-land.io`（開発環境）

**Collection名**: `app.bsky.feed.post`（AT Protocol標準）

**AT URI例**:

```
at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456
```

**結論**: **PDSサーバーを別に立てたとしても、Collection名は`app.bsky.feed.post`を使用します。**

---

**最終更新**: 2026-01-05
