# AT Protocol rkey（Record Key）について

**作成日**: 2026-01-05  
**目的**: AT Protocolのrkey（Record Key）の仕様と実装方法についての説明

---

## 📋 rkeyとは

**rkey（Record Key）**は、AT ProtocolのRepository内でRecordを一意に識別するためのキーです。

### 基本概念

- **Repository**: ユーザーごとのデータストア（`REPO#{ownerDid}`）
- **Collection**: Recordの種類（例: `app.bsky.feed.post`）
- **rkey**: Collection内でのRecordの一意キー

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

## 🎯 rkeyの要件

### 1. 一意性

- **Collection内で一意**: 同じCollection内でrkeyは一意でなければならない
- **Repository内で一意**: 同じRepository内でrkeyは一意でなければならない（通常、Collectionが異なれば同じrkeyでも問題ないが、推奨は一意）

### 2. 時系列ソート

- **時系列順**: rkeyは時系列でソート可能であることが推奨される
- **新しい順**: 新しいRecordが後ろに来るように設計される

### 3. 文字列形式

- **Base32形式**: TID（Time-based ID）はBase32エンコードされた文字列
- **長さ**: 通常13文字（TIDの場合）
- **文字セット**: `234567abcdefghijklmnopqrstuvwxyz`（Base32）

---

## 📚 rkeyの生成方法

### 1. TID（Time-based ID）【推奨】

**TID**は、AT Protocolで標準的に使用されるrkey形式です。

#### 特徴

- ✅ **時系列ソート可能**: タイムスタンプベースで時系列順にソート可能
- ✅ **一意性保証**: タイムスタンプ + ランダム部分で一意性を保証
- ✅ **短い**: 13文字のBase32エンコード文字列
- ✅ **AT Protocol標準**: Blueskyなどで標準的に使用

#### 形式

```
3k2abc123def456
```

- **長さ**: 13文字
- **エンコード**: Base32
- **構造**: タイムスタンプ（10ビット） + ランダム部分（80ビット）

#### 生成方法

**ライブラリ**: `@atproto/syntax` または `tid` パッケージ

```typescript
import { TID } from '@atproto/syntax';

// TID生成
const rkey = TID.next(); // 例: "3k2abc123def456"

// TID検証
const isValid = TID.isValid(rkey); // true/false

// TIDからタイムスタンプ取得
const timestamp = TID.toTimestamp(rkey); // Dateオブジェクト
```

#### 実装例

```typescript
import { TID } from '@atproto/syntax';

// Post作成時のrkey生成
const rkey = TID.next();
const atUri = `at://${ownerDid}/app.bsky.feed.post/${rkey}`;
```

---

### 2. ULID（Universally Unique Lexicographically Sortable Identifier）

**ULID**は、TIDの代替として使用可能な形式です。

#### 特徴

- ✅ **時系列ソート可能**: タイムスタンプベースで時系列順にソート可能
- ✅ **一意性保証**: タイムスタンプ + ランダム部分で一意性を保証
- ✅ **標準規格**: ULIDは標準規格（RFC準拠）
- ⚠️ **長い**: 26文字（TIDより長い）

#### 形式

```
01ARZ3NDEKTSV4RRFFQ69G5FAV
```

- **長さ**: 26文字
- **エンコード**: Base32
- **構造**: タイムスタンプ（48ビット） + ランダム部分（80ビット）

#### 生成方法

**ライブラリ**: `ulid` パッケージ

```typescript
import { ulid } from 'ulid';

// ULID生成
const rkey = ulid(); // 例: "01ARZ3NDEKTSV4RRFFQ69G5FAV"

// ULID検証
const isValid = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(rkey);
```

---

### 3. カスタム形式

独自のrkey形式を実装することも可能ですが、**AT Protocol標準に準拠するためにはTIDを推奨**します。

---

## 🔍 TID vs ULID の比較

| 項目                | TID               | ULID    |
| ------------------- | ----------------- | ------- |
| **長さ**            | 13文字            | 26文字  |
| **AT Protocol標準** | ✅ 標準           | ⚠️ 代替 |
| **時系列ソート**    | ✅ 可能           | ✅ 可能 |
| **一意性保証**      | ✅ 高い           | ✅ 高い |
| **ライブラリ**      | `@atproto/syntax` | `ulid`  |
| **推奨度**          | ⭐⭐⭐⭐⭐        | ⭐⭐⭐  |

**推奨**: **TID**を使用（AT Protocol標準、短い、Blueskyで使用）

---

## 📝 rkeyの実装方針

### 推奨実装

1. **ライブラリ選定**: `@atproto/syntax` を使用してTIDを生成
2. **生成タイミング**: Post/Comment作成時に`TID.next()`で生成
3. **検証**: `TID.isValid()`でrkeyの妥当性を検証
4. **ソート**: rkeyで時系列ソート（新しい順）

### 実装例

```typescript
import { TID } from '@atproto/syntax';

// rkey生成ユーティリティ
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

---

## 🎯 rkeyの使用例

### Post作成時

```typescript
import { TID } from '@atproto/syntax';
import { generateAtUri } from '../utils/atUri';

// Post作成
const ownerDid = 'did:plc:abc123';
const collection = 'app.bsky.feed.post';
const rkey = TID.next(); // "3k2abc123def456"
const atUri = generateAtUri(ownerDid, collection, rkey);
// "at://did:plc:abc123/app.bsky.feed.post/3k2abc123def456"

// DynamoDBに保存
const item = {
  PK: `REPO#${ownerDid}`,
  SK: `REC#${collection}#${rkey}`,
  ownerDid,
  collection,
  rkey,
  uri: atUri,
  // ... その他のフィールド
};
```

### Comment作成時（Reply Post）

```typescript
import { TID } from '@atproto/syntax';
import { generateAtUri } from '../utils/atUri';

// Comment作成（Reply Postとして）
const ownerDid = 'did:plc:abc123';
const collection = 'app.bsky.feed.post';
const rkey = TID.next(); // "3k2def456ghi789"
const atUri = generateAtUri(ownerDid, collection, rkey);

// 親Postへの参照
const parentPostUri = 'at://did:plc:xyz789/app.bsky.feed.post/3k2abc123def456';
const rootPostUri = parentPostUri; // ルートPost（通常は親と同じ）

// DynamoDBに保存
const item = {
  PK: `REPO#${ownerDid}`,
  SK: `REC#${collection}#${rkey}`,
  ownerDid,
  collection,
  rkey,
  uri: atUri,
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

### クエリ時（時系列ソート）

```typescript
// rkeyで時系列ソート（新しい順）
const command = new QueryCommand({
  TableName: this.tableName,
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `REPO#${ownerDid}`,
    ':sk': `REC#app.bsky.feed.post#`,
  },
  ScanIndexForward: false, // 降順（新しい順）
  Limit: limit,
});
```

---

## ⚠️ 注意事項

### 1. rkeyの一意性保証

- **同じRepository内で一意**: 同じownerDid、同じCollection内でrkeyは一意でなければならない
- **衝突の可能性**: TIDは非常に低い確率で衝突する可能性がある（実用的には問題なし）
- **検証**: Post作成時に既存のrkeyが存在しないか確認（オプション）

### 2. rkeyの変更不可

- **不変性**: rkeyは一度生成されたら変更できない
- **AT URIの不変性**: AT URIはrkeyを含むため、rkeyが変わるとAT URIも変わる
- **削除と再作成**: Recordを削除して新しいrkeyで再作成する必要がある

### 3. 時系列ソートの精度

- **TIDの精度**: ミリ秒単位の精度
- **同時作成**: 同じミリ秒内に複数のRecordを作成した場合、rkeyの順序が保証されない可能性がある（実用的には問題なし）

---

## 📚 参考資料

### AT Protocol公式ドキュメント

- [AT Protocol Specification](https://atproto.com/specs/atp)
- [Repository Specification](https://atproto.com/specs/repository)
- [Record Specification](https://atproto.com/specs/record)

### ライブラリ

- **@atproto/syntax**: AT Protocolの構文解析・生成ライブラリ
  - GitHub: https://github.com/bluesky-social/atproto
  - npm: `npm install @atproto/syntax`

- **ulid**: ULID生成ライブラリ（代替）
  - GitHub: https://github.com/ulid/javascript
  - npm: `npm install ulid`

---

## 🎯 実装推奨事項

### 1. ライブラリ選定

**推奨**: `@atproto/syntax` を使用してTIDを生成

```bash
pnpm add @atproto/syntax
```

### 2. rkey生成ユーティリティの作成

`src/utils/rkeyGenerator.ts` を新規作成し、以下の機能を実装：

- `generateRkey()`: rkey生成
- `validateRkey()`: rkey検証
- `rkeyToTimestamp()`: rkeyからタイムスタンプ取得

### 3. 既存コードへの統合

- Post作成時に`TID.next()`でrkey生成
- Comment作成時（Reply Post）にも`TID.next()`でrkey生成
- AT URI生成時にrkeyを使用

---

**最終更新**: 2026-01-05
