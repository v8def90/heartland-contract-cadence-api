# データモデル最終確認事項

**作成日**: 2025-12-30  
**目的**: 提示された全データモデルの最終確認事項の整理  
**対象**: User, Post, Comment, Like, Follow

---

## 📋 データモデル一覧（確定版）

### ✅ 確定済み

1. **DynamoDBUserProfileItem** - ユーザープロフィール
2. **DynamoDBIdentityLinkItem** - IDリンク（認証情報）
3. **DynamoDBIdentityLookupItem** - 逆引きルックアップ
4. **DynamoDBBskyPostRecordItem** - Post（標準）
5. **DynamoDBPostMetaRecordItem** - Post拡張メタ
6. **DynamoDBBskyLikeRecordItem** - Like
7. **DynamoDBBskyFollowRecordItem** - Follow（修正済み）
8. **StrongRef / ReplyRef** - 共通型

---

## ⚠️ 確認が必要な項目

### 1. Followのsubject形式 ✅ **決定済み**

**決定事項**: AT Protocol標準の`subject: StrongRef`形式に修正

**実装**:
```typescript
subject: StrongRef; // { uri: string, cid?: string }
// subject.uri = at://{followedDid}/app.bsky.actor.profile/self
```

**確認事項**: `subject.uri`の形式選択

#### オプション1: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）

**メリット**:
- ✅ **AT Protocol標準準拠**: BlueSky公式実装と同じ形式で、完全な互換性
- ✅ **リソースの明確性**: プロファイルリソースを明示的に指定
- ✅ **将来の拡張性**: プロファイル以外のリソース（例: `app.bsky.actor.profile/avatar`）への拡張が容易
- ✅ **検証可能性**: プロファイルレコードの存在確認が可能
- ✅ **他のAT Protocolクライアントとの互換性**: 標準形式のため、他のクライアントでも解釈可能

**デメリット**:
- ⚠️ **プロファイル存在チェック**: プロファイルが存在しない場合の扱いが複雑
- ⚠️ **URIの長さ**: URIが長くなる（ストレージコストが若干増加）
- ⚠️ **実装の複雑さ**: プロファイルレコードの存在確認が必要な場合がある

**実装例**:
```typescript
subject: {
  uri: `at://${followedDid}/app.bsky.actor.profile/self`,
  cid?: string; // プロファイルレコードのCID（optional）
}
```

#### オプション2: `at://{followedDid}`（シンプル形式）

**メリット**:
- ✅ **シンプル**: URIが短く、実装が簡単
- ✅ **プロファイル非依存**: プロファイルが存在しなくても問題なし
- ✅ **ストレージ効率**: URIが短いため、ストレージコストが低い
- ✅ **高速処理**: URI解析が簡単で、処理が高速

**デメリット**:
- ⚠️ **AT Protocol標準からの逸脱**: BlueSky公式実装と異なる形式
- ⚠️ **リソースの不明確性**: どのリソースを指しているか不明確
- ⚠️ **将来の拡張性**: プロファイル以外のリソースへの拡張が困難
- ⚠️ **互換性リスク**: 他のAT Protocolクライアントで解釈できない可能性

**実装例**:
```typescript
subject: {
  uri: `at://${followedDid}`,
  cid?: string; // optional
}
```

#### 推奨事項

**🎯 推奨: オプション1 (`at://{followedDid}/app.bsky.actor.profile/self`)**

**理由**:
1. **AT Protocol標準準拠**: BlueSky公式実装と同じ形式で、完全な互換性を確保
2. **将来の拡張性**: プロファイル以外のリソースへの拡張が容易
3. **検証可能性**: プロファイルレコードの存在確認が可能
4. **他のクライアントとの互換性**: 標準形式のため、他のAT Protocolクライアントでも解釈可能

**実装時の注意点**:
- プロファイルが存在しない場合でも、Followレコードは作成可能（プロファイルは後から作成される可能性があるため）
- `cid`はoptionalのため、プロファイルレコードが存在しない場合は省略可能
- プロファイル存在チェックは任意（フォロー時には必須ではない）

---

### 2. Commentメタデータの必要性 ✅ **決定済み**

**決定事項**:
- ✅ CommentはReply Postとして扱う（確定）

**確認事項**:
- [ ] Commentメタデータ（DynamoDBCommentMetaRecordItem）は必要か？
- [ ] Comment専用の機能要件があるか？
- [ ] メタデータなしで運用可能か？

**推奨**:
- **最小実装**: まずはReply Postのみで実装
- **拡張実装**: 必要に応じてメタデータを追加
- **段階的**: 機能要件が明確になってからメタデータを追加

**実装方針**:
- Commentは`app.bsky.feed.post`コレクションとして保存
- `reply`フィールド（ReplyRef）で親子関係を表現
- メタデータは将来的に必要になったら追加

---

### 3. Postのimages/tagsの将来的な変換

**現状**:
```typescript
images?: string[]; // ※将来 Lexicon embed.images へ変換可
tags?: string[];   // ※将来 facets へ変換可
```

**AT Protocol標準**:
- `embed.images`: Lexicon準拠の画像埋め込み
- `facets`: リッチテキスト表現（メンション、リンク等）

**確認事項**:
- [ ] 現時点で`images`/`tags`形式で問題ないか？
- [ ] 将来的な変換タイミングは？
- [ ] 両方の形式を並行して保持するか？

**推奨**:
- **現時点**: `images`/`tags`形式で実装
- **将来的**: Lexicon準拠形式への変換機能を準備
- **段階的移行**: 両方の形式を並行保持して段階的移行

---

### 4. 集計データ（likeCount, replyCount）の更新タイミング

**現状**:
```typescript
likeCount?: number;
replyCount?: number;
```

**確認事項**:
- [ ] 集計データの更新タイミング（リアルタイム？バッチ？）
- [ ] 集計データの整合性保証方法
- [ ] 集計データが不一致になった場合の対処

**推奨**:
- **リアルタイム更新**: Like/Reply作成時に即座に更新
- **整合性チェック**: 定期的な整合性チェック機能
- **再計算機能**: 不一致時の再計算機能

---

### 5. PDS（公式Bluesky PDS）連携の詳細 ✅ **決定済み**

**決定事項**: 開発環境用PDS APIとして`https://bsky.social`を使用

**PDS API情報**:
- **開発環境**: `https://bsky.social`（公式Bluesky PDS）
- **本番環境**: 将来的に独自PDSまたは別のPDSを検討

**確認事項**:
- [x] PDS APIエンドポイント: `https://bsky.social`（決定済み）
- [ ] DID生成のフロー（ユーザー登録時にPDS経由でDID生成？）
- [ ] PDS APIの呼び出し方法（`com.atproto.server.createAccount`等）
- [ ] Repository同期の必要性（PDSのRepositoryと同期するか？）
- [ ] エラーハンドリング（PDSが利用できない場合）

**推奨**:
- **DID生成**: ユーザー登録時にPDS APIを呼び出してDID生成
- **APIエンドポイント**: `https://bsky.social/xrpc/com.atproto.server.createAccount`
- **Repository同期**: 初期段階では同期不要、将来的に検討
- **フォールバック**: PDSが利用できない場合の代替手段（リトライ、エラーハンドリング）

**実装時の注意点**:
- PDS APIの認証情報（API Key等）の管理
- レート制限の考慮
- タイムアウト設定（30秒程度）
- エラーレスポンスの適切な処理

---

### 6. GSI設計の詳細確認

**現状**:
- GSI1: フィード用インデックス
- GSI2: 逆引き用インデックス

**確認事項**:
- [ ] 各GSIの具体的な使用目的
- [ ] クエリパターンに応じた最適化
- [ ] GSIのコスト最適化（必要最小限のGSI）

**推奨**:
- **GSI1**: フィード生成（時系列ソート）
- **GSI2**: 逆引き（特定PostのLike一覧等）
- **最適化**: クエリパターンに応じてGSIを最適化

---

### 7. TTL（Time To Live）の設定

**現状**:
```typescript
ttl?: number;
```

**確認事項**:
- [ ] 各レコードのTTL設定値
- [ ] TTLの用途（データ削除？アーカイブ？）
- [ ] 永続化が必要なデータのTTL設定

**推奨**:
- **Post/Comment**: 永続化（TTLなしまたは長期間）
- **Like/Follow**: 永続化（TTLなしまたは長期間）
- **一時データ**: メタデータ等は適切なTTL設定

---

### 8. createdAtとcreatedAtIsoの使い分け

**現状**:
```typescript
createdAt: string;
createdAtIso: string;
```

**確認事項**:
- [ ] 両方のフィールドが必要か？
- [ ] 使い分けの基準は？
- [ ] どちらを優先的に使用するか？

**推奨**:
- **createdAtIso**: ISO 8601形式（推奨）
- **createdAt**: 後方互換性のため保持（段階的に削除）
- **統一**: 将来的には`createdAtIso`のみに統一

---

### 9. CID（Content Identifier）の実装方針

**現状**:
```typescript
cid?: string; // 将来互換のため（今はoptionalでOK）
```

**確認事項**:
- [ ] CID生成の実装タイミング
- [ ] IPFS統合の必要性
- [ ] CID検証の実装

**推奨**:
- **現時点**: optionalで問題なし
- **将来的**: IPFS統合を検討
- **段階的**: CID生成機能を準備

---

### 10. エラーハンドリングとデータ整合性

**確認事項**:
- [ ] データ整合性チェックの実装
- [ ] エラー時のロールバック処理
- [ ] データ移行時の整合性保証

**推奨**:
- **整合性チェック**: 定期的な整合性チェック機能
- **トランザクション**: DynamoDB TransactWriteItemsの活用
- **監査ログ**: データ変更の監査ログ

---

## 📊 確認事項の優先度

### 🔴 高優先度（実装前に必須）

1. **Followのsubject形式** - AT Protocol準拠度に影響
2. **Commentメタデータの必要性** - 実装範囲の決定
3. **PDS連携の詳細** - DID生成フローの決定

### 🟡 中優先度（実装中に検討）

4. **Postのimages/tags変換** - 将来的な対応
5. **集計データの更新タイミング** - パフォーマンスに影響
6. **GSI設計の詳細** - クエリパフォーマンスに影響

### 🟢 低優先度（実装後に最適化）

7. **TTL設定** - データ管理方針
8. **createdAt/createdAtIso統一** - コード整理
9. **CID実装** - 将来的な対応
10. **エラーハンドリング強化** - 運用改善

---

## 🎯 推奨される確認フロー

### Step 1: 高優先度項目の確認
1. Followのsubject形式の決定
2. Commentメタデータの必要性確認
3. PDS連携方法の決定

### Step 2: 中優先度項目の検討
4. Postのimages/tags変換方針
5. 集計データの更新戦略
6. GSI設計の最適化

### Step 3: 低優先度項目の計画
7. TTL設定方針
8. フィールド統一計画
9. CID実装計画
10. エラーハンドリング強化

---

## 📝 次のステップ

### 実装開始前の最終確認

1. **Followのsubject形式** - 決定が必要
2. **Commentメタデータ** - 必要性の確認
3. **PDS連携** - 実装方法の決定

### 実装開始可能な条件

- ✅ 高優先度項目の確認完了
- ✅ データモデルの最終確定
- ✅ 実装方針の明確化

---

**最終更新**: 2025-12-30  
**次回**: 確認事項への回答後、実装開始

---

## 📌 最新の決定事項（2025-12-30更新）

### ✅ Followのsubject.uri形式

**決定**: `at://{followedDid}/app.bsky.actor.profile/self`（AT Protocol標準形式）を推奨

**理由**:
- AT Protocol標準準拠（BlueSky公式実装と同じ）
- 将来の拡張性
- 他のAT Protocolクライアントとの互換性

### ✅ PDS API情報

**決定**: 開発環境用PDS APIとして`https://bsky.social`を使用

**実装**:
- エンドポイント: `https://bsky.social/xrpc/com.atproto.server.createAccount`
- ユーザー登録時にDID生成

