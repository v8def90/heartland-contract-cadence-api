# 実装準備チェックリスト

**作成日**: 2025-12-30  
**目的**: 実装開始前の最終確認事項チェックリスト  
**状態**: 実装準備中（実装はまだ行わない）

---

## ✅ 決定済み事項

### 1. Followのsubject形式 ✅

- **決定**: AT Protocol標準の`subject: StrongRef`形式に修正
- **実装**: `subjectDid`ではなく`subject: StrongRef`を使用

### 2. Commentの扱い ✅

- **決定**: Reply Postとして扱う
- **実装**: `app.bsky.feed.post`コレクションとして保存

### 3. PDS連携 ✅

- **決定**: アカウント作成時にPDSへ連携
- **実装**: ユーザー登録時にPDS APIを呼び出してDID生成

---

## ⚠️ 追加確認が必要な項目

### 1. Followのsubject.uri形式 ✅ **決定済み**

**決定事項**: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）

**決定理由**:

- ✅ AT Protocol標準準拠（BlueSky公式実装と同じ）
- ✅ 将来の拡張性（プロファイル以外のリソースへの拡張が容易）
- ✅ 他のAT Protocolクライアントとの互換性
- ✅ 検証可能性（プロファイルレコードの存在確認が可能）

**実装例**:

```typescript
subject: {
  uri: `at://${followedDid}/app.bsky.actor.profile/self`,
  cid?: string; // optional（プロファイルが存在する場合のみ設定）
}
```

**実装時の注意点**:

- プロファイル存在チェックは任意（エラーにはしない）
- `cid`はoptional（プロファイルが存在する場合のみ設定）
- URI生成・解析のユーティリティ関数を作成

**詳細**: `FOLLOW_SUBJECT_URI_ANALYSIS.md`を参照

---

### 2. PDS連携の詳細フロー ✅ **一部決定済み**

**決定事項**:

- ✅ アカウント作成時にPDSへ連携
- ✅ 開発環境用PDS API: `https://bsky.social`

**確認事項**:

- [ ] どのPDS APIを呼び出すか？
  - `com.atproto.server.createAccount`?（推奨）
  - `com.atproto.server.createSession`?
  - その他のAPI？

- [ ] DID生成のタイミング
  - ユーザー登録時（メール/パスワード登録時）？✅ 決定済み
  - Flow wallet認証時？⚠️ 要確認
  - 両方？⚠️ 要確認

- [x] PDS APIのエンドポイント
  - 開発環境: `https://bsky.social` ✅ 決定済み
  - 本番環境: 将来的に独自PDSまたは別のエンドポイントを検討

- [ ] エラーハンドリング
  - PDSが利用できない場合のフォールバック
  - リトライロジック（推奨: 3回、指数バックオフ）
  - タイムアウト設定（推奨: 30秒）

**推奨フロー**:

```
1. ユーザー登録（メール/パスワード or Flow wallet）
   ↓
2. PDS API呼び出し（com.atproto.server.createAccount）
   - エンドポイント: https://bsky.social/xrpc/com.atproto.server.createAccount
   - リトライ: 3回（指数バックオフ）
   - タイムアウト: 30秒
   ↓
3. DID取得（did:plc:xxx）
   ↓
4. primaryDidをデータベースに保存
   ↓
5. ユーザープロフィール作成
```

**実装時の注意点**:

- PDS APIの認証情報（API Key等）の管理
- レート制限の考慮
- エラーレスポンスの適切な処理
- 開発環境と本番環境のPDSエンドポイントの分離

---

### 3. rkey生成方法 ⚠️ **要確認**

**現状**: TID/ULID形式（時系列）

**確認事項**:

- [ ] どのライブラリを使用するか？
  - `@atproto/tid`（AT Protocol標準）
  - `ulid`（ULID形式）
  - その他？

- [ ] rkeyの形式
  - TID形式: `3k2abc123...`（AT Protocol標準）
  - ULID形式: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

**推奨**:

- AT Protocol準拠: `@atproto/tid`を使用
- または: `ulid`パッケージを使用

---

### 4. AT URI生成の実装 ⚠️ **要確認**

**確認事項**:

- [ ] AT URI生成ユーティリティの実装方法
- [ ] AT URI解決（逆引き）の実装
- [ ] AT URI検証の実装

**推奨**:

```typescript
function generateAtUri(
  ownerDid: string,
  collection: string,
  rkey: string
): string {
  return `at://${ownerDid}/${collection}/${rkey}`;
}

function parseAtUri(uri: string): {
  did: string;
  collection: string;
  rkey: string;
} | null {
  // at://did:plc:xxx/app.bsky.feed.post/xxx をパース
}
```

---

### 5. データ移行計画 ⚠️ **要確認**

**確認事項**:

- [ ] 既存データ（userIdベース）の移行方法
- [ ] 移行スクリプトの実装
- [ ] 移行時のダウンタイム
- [ ] 後方互換性の維持期間

**推奨**:

- 段階的移行: 既存データと新データの並行運用
- 移行スクリプト: 既存userId → primaryDidへのマッピング
- 後方互換性: 一定期間は両方のID体系をサポート

---

### 6. 既存APIとの互換性 ⚠️ **要確認**

**確認事項**:

- [ ] 既存APIエンドポイントの変更
- [ ] 既存クライアントへの影響
- [ ] APIバージョニングの必要性

**推奨**:

- APIバージョニング: `/api/v1/`と`/api/v2/`の並行運用
- 段階的移行: 既存APIを維持しながら新APIを追加

---

### 7. 認証フローの統合 ⚠️ **要確認**

**確認事項**:

- [ ] メール/パスワード認証時のDID生成タイミング
- [ ] Flow wallet認証時のDID生成タイミング
- [ ] 既存ユーザーのDID生成方法

**推奨**:

- 新規ユーザー: 登録時にPDS経由でDID生成
- 既存ユーザー: 初回ログイン時にDID生成（遅延生成）

---

### 8. Repository構造の実装詳細 ⚠️ **要確認**

**確認事項**:

- [ ] Repository構造の実装方法
- [ ] Commit管理の実装
- [ ] 既存DynamoDB設計との統合

**推奨**:

- 段階的実装: まずはRecord構造のみ実装
- Commit管理: 将来的に実装
- 既存設計との統合: 並行運用可能な設計

---

### 9. テストデータの準備 ⚠️ **要確認**

**確認事項**:

- [ ] テスト用DIDの生成方法
- [ ] モックPDSの必要性
- [ ] 統合テストの実装方針

**推奨**:

- テスト用DID: `did:key:xxx`形式を使用（簡単に生成可能）
- モックPDS: 開発環境ではモックを使用
- 統合テスト: 実際のPDSを使用（テスト環境）

---

### 10. 環境変数と設定 ⚠️ **要確認**

**確認事項**:

- [ ] PDS APIエンドポイントの設定
- [ ] DID解決サービスの設定
- [ ] その他の環境変数

**推奨**:

```env
# PDS Configuration
PDS_ENDPOINT=https://bsky.social
PDS_API_KEY=xxx  # 必要に応じて

# DID Resolution
DID_RESOLVER_ENDPOINT=https://plc.directory
DID_RESOLVER_CACHE_TTL=3600

# AT Protocol
AT_PROTO_NAMESPACE=jp.yourapp
```

---

## 📊 確認事項の優先度

### 🔴 高優先度（実装前に必須）

1. **Followのsubject.uri形式** ✅ **決定済み** - `at://{followedDid}/app.bsky.actor.profile/self`
2. **PDS連携の詳細フロー** 🟡 **一部決定済み** - エンドポイント決定、API詳細は要確認
3. **rkey生成方法** - 実装ライブラリの決定

### 🟡 中優先度（実装中に検討）

4. **AT URI生成の実装** - ユーティリティ実装
5. **データ移行計画** - 既存データの移行方法
6. **既存APIとの互換性** - APIバージョニング

### 🟢 低優先度（実装後に最適化）

7. **認証フローの統合** - 段階的実装
8. **Repository構造の詳細** - 将来的な実装
9. **テストデータの準備** - テスト環境構築
10. **環境変数と設定** - 設定管理

---

## 🎯 実装開始前の最終チェック

### 必須確認事項（実装前に決定）

- [ ] Followのsubject.uri形式の決定
- [ ] PDS連携の詳細フロー（API、エンドポイント、エラーハンドリング）
- [ ] rkey生成方法（ライブラリ選択）
- [ ] AT URI生成ユーティリティの実装方針
- [ ] データ移行計画の策定

### 推奨確認事項（実装中に検討）

- [ ] 既存APIとの互換性方針
- [ ] 認証フローの統合方法
- [ ] Repository構造の実装詳細
- [ ] テスト環境の準備

---

## 📝 次のステップ

### 実装開始可能な条件

1. ✅ Followのsubject形式: AT Protocol標準（`subject: StrongRef`）に決定
2. ✅ Followのsubject.uri形式: `at://{followedDid}/app.bsky.actor.profile/self`に決定
3. ✅ PDS連携: アカウント作成時にPDSへ連携に決定
4. ✅ PDS APIエンドポイント: 開発環境用`https://bsky.social`に決定
5. ⚠️ **要確認**: PDS連携の詳細フロー（API詳細、エラーハンドリング）
6. ⚠️ **要確認**: rkey生成方法（ライブラリ選択）

### 実装開始前の最終確認

上記の確認事項（特に高優先度項目）への回答があれば、実装を開始できます。

---

**最終更新**: 2025-12-30  
**状態**: 実装準備中（一部決定済み、残りの確認事項への回答待ち）

---

## 📌 最新の決定事項（2025-12-30更新）

### ✅ Followのsubject.uri形式

- **決定**: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）
- **詳細**: `FOLLOW_SUBJECT_URI_ANALYSIS.md`を参照

### ✅ PDS API情報

- **決定**: 開発環境用PDS APIとして`https://bsky.social`を使用
- **実装**: ユーザー登録時に`com.atproto.server.createAccount`を呼び出してDID生成

### ✅ メール/パスワード認証実装計画

- **決定**: AT Protocol対応を踏まえた包括的な実装計画を作成
- **詳細**: `EMAIL_PASSWORD_AUTH_IMPLEMENTATION_PLAN.md`を参照
- **実装フェーズ**: Phase 1（基盤実装）から順次実装
- **統合**: 既存のFlow wallet認証と並行運用、AT Protocol DID生成と統合
