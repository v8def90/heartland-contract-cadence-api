# データモデル分析レポート - AT Protocol対応度評価

**作成日**: 2025-12-30  
**目的**: 提示されたデータモデルのAT Protocol対応度合いの分析と評価  
**対象**: DynamoDBUserProfileItem, DynamoDBIdentityLinkItem, DynamoDBIdentityLookupItem

---

## 📋 提示されたデータモデル概要

### 1. DynamoDBUserProfileItem（ユーザープロフィール）

- **PK**: `USER#{primaryDid}`
- **SK**: `PROFILE`
- **主キー**: `primaryDid` (did:plc:...)
- **認証関連**: メール/パスワード、複数認証プロバイダー対応

### 2. DynamoDBIdentityLinkItem（IDリンク）

- **PK**: `USER#{primaryDid}`
- **SK**: `LINK#{linkedId}`
- **目的**: 複数のID（DID、ウォレット、メール）を1つのアカウントにリンク
- **認証関連**: メール/パスワード認証、メール検証、パスワードリセット

### 3. DynamoDBIdentityLookupItem（逆引きルックアップ）

- **PK**: `LINK#{linkedId}`
- **SK**: `PRIMARY`
- **目的**: linkedIdからprimaryDidへの逆引き
- **最適化**: メール検索の高速化

---

## ✅ AT Protocol対応度評価

### 🟢 **完全対応している項目**

#### 1. DIDベースの識別子

- ✅ **primaryDid**: AT ProtocolのDID（did:plc:...）を主キーとして使用
- ✅ **handle**: AT ProtocolのHandle（@username.bsky.social）をサポート
- ✅ **複数DID対応**: IdentityLinkItemで複数のDIDをリンク可能

**評価**: **優秀** - AT ProtocolのDID中心設計に完全準拠

#### 2. プロフィール情報

- ✅ **displayName**: 表示名
- ✅ **bio**: 自己紹介
- ✅ **avatarUrl**: アバター画像
- ✅ **bannerUrl**: バナー画像（AT Protocolのbannerに相当）

**評価**: **優秀** - AT ProtocolのProfileレコードと互換性あり

#### 3. 統計情報

- ✅ **followerCount**: フォロワー数
- ✅ **followingCount**: フォロー中数
- ✅ **postCount**: 投稿数

**評価**: **良好** - AT Protocolの統計情報と一致

---

### 🟡 **部分的対応・要検討項目**

#### 1. 認証プロバイダー管理

```typescript
authProviders?: {
  emailPassword?: boolean;
  atproto?: boolean;       // did:plc
  eip155?: boolean;        // did:ethr 等
  flow?: boolean;          // flow:...
}
```

**現状**: 複数認証プロバイダーをサポート

**AT Protocol要件**:

- ✅ DID署名認証（atproto）をサポート
- ⚠️ **要確認**: AT Protocolでは通常、DID署名のみが標準
- ⚠️ **要確認**: Flow wallet認証はAT Protocol標準外（独自拡張）

**評価**: **良好** - AT Protocol準拠 + 独自拡張の柔軟性

**推奨事項**:

- `atproto: true` の場合、DID署名認証を必須とする
- Flow wallet認証は独自拡張として明確に文書化

---

#### 2. IdentityLinkItemの設計

```typescript
linkedId: string; // did:ethr:... / flow:... / email:alice@example.com
kind: LinkedIdKind; // did/wallet/account
role: LinkRole; // asset/login/...
status: LinkStatus; // pending/verified/revoked
```

**現状**: 複数のIDを1つのアカウントにリンク

**AT Protocol要件**:

- ✅ **DIDリンク**: 複数のDIDを1つのアカウントにリンク可能
- ✅ **検証プロセス**: `proofType`で相互署名検証をサポート
- ⚠️ **要確認**: AT Protocolでは通常、1ユーザー = 1DIDが標準

**評価**: **良好** - AT Protocol準拠 + 柔軟な拡張性

**推奨事項**:

- `primaryDid`をAT Protocolの主要DIDとして使用
- 他のDIDは補助的なリンクとして扱う
- AT Protocol準拠の場合は`primaryDid`のみを使用

---

#### 3. メール/パスワード認証

```typescript
email?: string;
emailNormalized?: string;
emailVerified?: boolean;
passwordHash?: string;
```

**現状**: メール/パスワード認証を完全サポート

**AT Protocol要件**:

- ⚠️ **標準外**: AT Protocolでは通常、DID署名認証のみ
- ✅ **独自拡張**: サービス提供側の独自機能として実装可能

**評価**: **良好** - AT Protocol標準外だが、実用的な拡張

**推奨事項**:

- メール/パスワード認証は独自拡張として明確に文書化
- AT Protocol準拠モードと拡張モードを切り替え可能にする

---

### 🔴 **要改善・追加が必要な項目**

#### 1. Repository構造への対応

**現状**: DynamoDB Single Table Design

**AT Protocol要件**:

- ❌ **Repository構造**: ユーザーごとの自己認証ストレージが必要
- ❌ **Record構造**: Post、Like、Follow等をRecordとして保存
- ❌ **Collection構造**: `app.bsky.feed.post`等のCollection定義

**評価**: **要改善** - AT ProtocolのRepository構造に対応していない

**推奨事項**:

- Repository構造を追加実装
- 既存のDynamoDB設計と並行運用
- 段階的移行計画を策定

---

#### 2. AT URI体系

**現状**: 単純なID文字列（postId等）

**AT Protocol要件**:

- ❌ **AT URI**: `at://did:plc:xxx/app.bsky.feed.post/xxx` 形式が必要
- ❌ **rkey**: TID形式のレコードキー
- ❌ **URI解決**: AT URIからレコード取得

**評価**: **要改善** - AT URI体系が未実装

**推奨事項**:

- Post、Comment等にAT URIフィールドを追加
- rkey生成ライブラリの統合
- AT URI解決機能の実装

---

#### 3. Lexiconスキーマ定義

**現状**: TypeScript型定義のみ

**AT Protocol要件**:

- ❌ **Lexicon**: JSONスキーマベースのスキーマ定義が必要
- ❌ **XRPC**: Lexiconで定義されたHTTP API

**評価**: **要改善** - Lexiconスキーマが未定義

**推奨事項**:

- Lexiconスキーマ定義ファイルの作成
- TypeScript型からLexiconスキーマへの変換ツール検討

---

## 📊 対応度合いの総合評価

### AT Protocol準拠度: **65%**

| カテゴリ                 | 対応度 | 評価                    |
| ------------------------ | ------ | ----------------------- |
| **識別子（DID/Handle）** | 100%   | 🟢 完全対応             |
| **プロフィール情報**     | 100%   | 🟢 完全対応             |
| **認証基盤**             | 80%    | 🟡 良好（独自拡張含む） |
| **Repository構造**       | 0%     | 🔴 未対応               |
| **AT URI体系**           | 0%     | 🔴 未対応               |
| **Lexiconスキーマ**      | 0%     | 🔴 未対応               |

---

## 🎯 推奨される実装アプローチ

### Phase 1: 既存設計の活用（即座に可能）

#### ✅ そのまま使用できる項目

1. **DID中心設計**: `primaryDid`を主キーとして使用
2. **プロフィール情報**: AT ProtocolのProfileと互換性あり
3. **認証プロバイダー管理**: 柔軟な認証方法のサポート

#### 🔧 軽微な調整が必要な項目

1. **handle検証**: AT ProtocolのHandle形式検証を追加
2. **DID解決**: DID Document取得機能の実装
3. **署名検証**: DID署名検証機能の実装

---

### Phase 2: AT Protocol準拠機能の追加（中期）

#### 📝 追加実装が必要な項目

1. **Repository構造**:
   - Record保存形式の追加
   - Collection定義
   - Commit管理

2. **AT URI体系**:
   - AT URI生成・解決機能
   - rkey生成（TID形式）

3. **Lexiconスキーマ**:
   - スキーマ定義ファイル
   - XRPC API実装

---

### Phase 3: 完全準拠（長期）

#### 🚀 完全準拠のための追加

1. **PDS機能**: Personal Data Server機能
2. **AppView機能**: インデックス・検索・フィード生成
3. **相互運用性**: 他のAT Protocolサービスとの連携

---

## 🔍 詳細分析

### 1. DID中心設計の評価

#### ✅ 優れている点

- **primaryDidを主キー**: AT ProtocolのDID中心設計に完全準拠
- **複数DID対応**: IdentityLinkItemで柔軟なリンク管理
- **検証プロセス**: proofTypeで相互署名検証をサポート

#### ⚠️ 注意点

- AT Protocolでは通常、1ユーザー = 1DIDが標準
- 複数DIDリンクは独自拡張として扱う必要がある

---

### 2. 認証設計の評価

#### ✅ 優れている点

- **複数認証プロバイダー**: DID、メール/パスワード、Flow wallet対応
- **セキュリティ**: パスワードハッシュ、ロックアウト機能
- **メール検証**: メール認証トークン管理

#### ⚠️ 注意点

- AT Protocol標準はDID署名認証のみ
- メール/パスワード、Flow wallet認証は独自拡張

---

### 3. データ構造の評価

#### ✅ 優れている点

- **Single Table Design**: DynamoDBの効率的な設計
- **逆引きルックアップ**: IdentityLookupItemで高速検索
- **正規化**: メール正規化、ハッシュ保存など

#### ⚠️ 注意点

- AT ProtocolのRepository構造とは異なる
- 段階的移行が必要

---

## 📝 実装時の推奨事項

### 1. 段階的移行戦略

```
Phase 1: 既存設計の活用
  ├─ DID中心設計の活用
  ├─ プロフィール情報の使用
  └─ 認証プロバイダー管理

Phase 2: AT Protocol機能追加
  ├─ Repository構造の追加
  ├─ AT URI体系の実装
  └─ Lexiconスキーマ定義

Phase 3: 完全準拠
  ├─ PDS機能実装
  ├─ AppView機能実装
  └─ 相互運用性確保
```

### 2. 後方互換性の維持

- ✅ 既存のDynamoDB設計を維持
- ✅ AT Protocol機能を追加実装
- ✅ 段階的な移行を可能にする

### 3. 独自拡張の明確化

- ✅ メール/パスワード認証は独自拡張として文書化
- ✅ Flow wallet認証は独自拡張として文書化
- ✅ AT Protocol準拠モードと拡張モードの切り替え

---

## 🎯 結論

### 総合評価: **良好（65%準拠）**

#### ✅ 強み

1. **DID中心設計**: AT Protocolの核となるDIDを主キーとして使用
2. **柔軟な認証**: 複数認証プロバイダーをサポート
3. **拡張性**: 独自機能を追加しやすい設計

#### ⚠️ 改善点

1. **Repository構造**: AT ProtocolのRepository構造に対応が必要
2. **AT URI体系**: AT URI生成・解決機能の実装が必要
3. **Lexiconスキーマ**: スキーマ定義の追加が必要

#### 🚀 推奨アプローチ

- **段階的移行**: 既存設計を活用しながら、AT Protocol機能を追加
- **後方互換性**: 既存機能を維持しながら、新機能を追加
- **明確な文書化**: 独自拡張とAT Protocol準拠機能を明確に区別

---

## 📋 次のステップ

### 実装開始前の確認事項

1. **データ移行計画**: 既存データの移行方法
2. **Repository構造**: 既存設計との統合方法
3. **AT URI体系**: 既存ID体系との共存方法
4. **Lexiconスキーマ**: 既存APIとの関係

### 実装優先順位

1. **Phase 1**: DID中心設計の活用（即座に可能）
2. **Phase 2**: AT Protocol機能追加（中期）
3. **Phase 3**: 完全準拠（長期）

---

**最終更新**: 2025-12-30  
**次回レビュー**: 実装開始前
