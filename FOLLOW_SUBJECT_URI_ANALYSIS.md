# Followのsubject.uri形式比較分析

**作成日**: 2025-12-30  
**目的**: Followレコードの`subject.uri`形式の選択肢比較と推奨事項  
**対象**: `DynamoDBBskyFollowRecordItem`の`subject: StrongRef`実装

---

## 📋 比較対象

### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

**AT Protocol標準形式**（BlueSky公式実装と同じ）

### オプション2: `at://{followedDid}`

**シンプル形式**（DIDのみ）

---

## 🔍 詳細比較

### 1. AT Protocol標準準拠度

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- ✅ **完全準拠**: BlueSky公式実装と同じ形式
- ✅ **Lexicon準拠**: AT ProtocolのLexiconスキーマに準拠
- ✅ **標準仕様**: AT Protocol公式ドキュメントに記載されている形式

#### オプション2: `at://{followedDid}`

- ⚠️ **準拠度不明**: AT Protocol標準仕様に明示的な記載なし
- ⚠️ **実装依存**: 一部の実装で使用されている可能性があるが、標準ではない
- ⚠️ **互換性リスク**: 他のAT Protocolクライアントで解釈できない可能性

**評価**: オプション1が明確に優位

---

### 2. 実装の複雑さ

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

```typescript
// URI生成
const subjectUri = `at://${followedDid}/app.bsky.actor.profile/self`;

// プロファイル存在チェック（任意）
const profileExists = await checkProfileExists(followedDid);
if (!profileExists) {
  // プロファイルが存在しない場合の処理（警告のみ、エラーではない）
  console.warn(`Profile not found for ${followedDid}`);
}

// Followレコード作成
const followRecord = {
  subject: {
    uri: subjectUri,
    cid: profileCid, // optional
  },
};
```

**複雑さ**: 中程度

- URI生成は簡単
- プロファイル存在チェックは任意（必須ではない）

#### オプション2: `at://{followedDid}`

```typescript
// URI生成
const subjectUri = `at://${followedDid}`;

// Followレコード作成
const followRecord = {
  subject: {
    uri: subjectUri,
  },
};
```

**複雑さ**: 低

- URI生成が非常に簡単
- 追加のチェック不要

**評価**: オプション2が若干簡単だが、差は大きくない

---

### 3. ストレージコスト

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- **URI長**: 約60-80文字（DID長による）
- **例**: `at://did:plc:abcdefghijklmnopqrstuvwx/app.bsky.actor.profile/self` (約60文字)

#### オプション2: `at://{followedDid}`

- **URI長**: 約30-40文字（DID長による）
- **例**: `at://did:plc:abcdefghijklmnopqrstuvwx` (約35文字)

**差**: 約25-40文字/レコード

**コスト計算例**（100万件のFollowレコード）:

- オプション1: 約60MB（60文字 × 1,000,000）
- オプション2: 約35MB（35文字 × 1,000,000）
- **差**: 約25MB（約40%の増加）

**評価**: オプション2が若干優位だが、差は許容範囲内

---

### 4. 将来の拡張性

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- ✅ **リソース指定**: プロファイルリソースを明示的に指定
- ✅ **拡張可能**: 他のリソースへの拡張が容易
  - `at://{did}/app.bsky.actor.profile/avatar`
  - `at://{did}/app.bsky.actor.profile/banner`
  - `at://{did}/app.bsky.feed.post/{rkey}`（投稿へのフォロー）
- ✅ **柔軟性**: 将来的にプロファイル以外のリソースへのフォローが可能

#### オプション2: `at://{followedDid}`

- ⚠️ **リソース不明**: どのリソースを指しているか不明確
- ⚠️ **拡張困難**: プロファイル以外のリソースへの拡張が困難
- ⚠️ **制約**: DIDのみのため、リソースレベルのフォローができない

**評価**: オプション1が明確に優位

---

### 5. 検証可能性

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- ✅ **プロファイル存在チェック**: プロファイルレコードの存在確認が可能
- ✅ **CID検証**: プロファイルレコードのCID検証が可能
- ✅ **整合性チェック**: フォロー対象のプロファイルが存在するか確認可能

```typescript
// プロファイル存在チェック例
async function validateFollowSubject(subjectUri: string): Promise<boolean> {
  const parsed = parseAtUri(subjectUri);
  if (parsed.collection === 'app.bsky.actor.profile') {
    const profile = await getProfileRecord(parsed.did);
    return profile !== null;
  }
  return false;
}
```

#### オプション2: `at://{followedDid}`

- ⚠️ **検証困難**: DIDの存在確認のみ可能（プロファイルの存在確認不可）
- ⚠️ **整合性チェック**: フォロー対象のプロファイルが存在するか確認できない

**評価**: オプション1が明確に優位

---

### 6. 他のAT Protocolクライアントとの互換性

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- ✅ **標準形式**: 他のAT Protocolクライアントでも解釈可能
- ✅ **BlueSky互換**: BlueSky公式クライアントと完全互換
- ✅ **将来の互換性**: 新しいAT Protocolクライアントでも解釈可能

#### オプション2: `at://{followedDid}`

- ⚠️ **互換性不明**: 他のAT Protocolクライアントで解釈できない可能性
- ⚠️ **BlueSky非互換**: BlueSky公式クライアントで解釈できない可能性
- ⚠️ **将来のリスク**: 新しいAT Protocolクライアントで問題が発生する可能性

**評価**: オプション1が明確に優位

---

### 7. パフォーマンス

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`

- **URI解析**: 若干複雑（パス解析が必要）
- **プロファイル存在チェック**: 任意のため、パフォーマンスへの影響は最小限

#### オプション2: `at://{followedDid}`

- **URI解析**: 非常に簡単（DIDのみ）
- **追加チェック**: 不要

**評価**: オプション2が若干優位だが、差は微々たるもの

---

## 📊 総合評価

| 評価項目                  | オプション1<br/>`at://{did}/app.bsky.actor.profile/self` | オプション2<br/>`at://{did}` | 勝者        |
| ------------------------- | -------------------------------------------------------- | ---------------------------- | ----------- |
| **AT Protocol標準準拠度** | ✅ 完全準拠                                              | ⚠️ 準拠度不明                | オプション1 |
| **実装の複雑さ**          | 🟡 中程度                                                | ✅ 簡単                      | オプション2 |
| **ストレージコスト**      | 🟡 約60MB/100万件                                        | ✅ 約35MB/100万件            | オプション2 |
| **将来の拡張性**          | ✅ 高い                                                  | ⚠️ 低い                      | オプション1 |
| **検証可能性**            | ✅ 高い                                                  | ⚠️ 低い                      | オプション1 |
| **互換性**                | ✅ 高い                                                  | ⚠️ 低い                      | オプション1 |
| **パフォーマンス**        | 🟡 良好                                                  | ✅ 優秀                      | オプション2 |

---

## 🎯 推奨事項

### **推奨: オプション1 (`at://{followedDid}/app.bsky.actor.profile/self`)**

**理由**:

1. **AT Protocol標準準拠**: BlueSky公式実装と同じ形式で、完全な互換性を確保
2. **将来の拡張性**: プロファイル以外のリソースへの拡張が容易
3. **検証可能性**: プロファイルレコードの存在確認が可能
4. **他のクライアントとの互換性**: 標準形式のため、他のAT Protocolクライアントでも解釈可能

**デメリットの許容**:

- **ストレージコスト**: 約25MB/100万件の増加は許容範囲内
- **実装の複雑さ**: プロファイル存在チェックは任意のため、実装は簡単

---

## 💡 実装時の推奨事項

### 1. プロファイル存在チェックは任意

```typescript
// 推奨実装: プロファイル存在チェックは任意
async function createFollowRecord(
  followerDid: string,
  followedDid: string
): Promise<DynamoDBBskyFollowRecordItem> {
  const subjectUri = `at://${followedDid}/app.bsky.actor.profile/self`;

  // プロファイル存在チェック（任意、エラーにはしない）
  try {
    const profile = await getProfileRecord(followedDid);
    if (profile) {
      // プロファイルが存在する場合、CIDを含める
      return {
        subject: {
          uri: subjectUri,
          cid: profile.cid,
        },
      };
    }
  } catch (error) {
    // プロファイルが存在しない場合でも、Followレコードは作成可能
    console.warn(`Profile not found for ${followedDid}:`, error);
  }

  // プロファイルが存在しない場合でも、Followレコードは作成
  return {
    subject: {
      uri: subjectUri,
      // cidは省略可能
    },
  };
}
```

### 2. URI生成ユーティリティ

```typescript
// 推奨: URI生成ユーティリティ関数
export function generateProfileAtUri(did: string): string {
  return `at://${did}/app.bsky.actor.profile/self`;
}

export function parseAtUri(uri: string): {
  did: string;
  collection?: string;
  rkey?: string;
} {
  const match = uri.match(/^at:\/\/([^\/]+)(?:\/([^\/]+)(?:\/(.+))?)?$/);
  if (!match) {
    throw new Error(`Invalid AT URI: ${uri}`);
  }

  return {
    did: match[1],
    collection: match[2],
    rkey: match[3],
  };
}
```

### 3. エラーハンドリング

```typescript
// 推奨: エラーハンドリング
async function validateFollowSubject(subjectUri: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const parsed = parseAtUri(subjectUri);

    // DID形式の検証
    if (!parsed.did.startsWith('did:')) {
      return { valid: false, error: 'Invalid DID format' };
    }

    // プロファイルURIの検証
    if (
      parsed.collection === 'app.bsky.actor.profile' &&
      parsed.rkey === 'self'
    ) {
      return { valid: true };
    }

    return { valid: false, error: 'Invalid profile URI format' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

---

## 📝 結論

**推奨形式**: `at://{followedDid}/app.bsky.actor.profile/self`

**実装方針**:

1. AT Protocol標準形式を使用
2. プロファイル存在チェックは任意（エラーにはしない）
3. `cid`はoptional（プロファイルが存在する場合のみ設定）
4. URI生成・解析のユーティリティ関数を作成

**メリット**:

- AT Protocol標準準拠
- 将来の拡張性
- 他のクライアントとの互換性
- 検証可能性

**デメリット（許容可能）**:

- ストレージコストが若干増加（約25MB/100万件）
- 実装が若干複雑（ただし、プロファイル存在チェックは任意）

---

**最終更新**: 2025-12-30  
**次回**: 実装開始時にこの形式を採用
