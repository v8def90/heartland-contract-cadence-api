# AT Protocol対応: Post/Comment 確認事項まとめ

**作成日**: 2026-01-05  
**目的**: 実装前に確認が必要な項目のまとめ

---

## ✅ 確認済み事項

### 1. 既存データの移行方法

- ✅ **回答**: 現状データはないので気にしなくていい
- ✅ **対応**: データ移行スクリプトは不要、新規実装のみ

### 2. rkeyについて

- ✅ **説明ドキュメント作成済み**: `docs/AT_PROTOCOL_RKEY_EXPLANATION.md`
- ✅ **推奨**: TID（Time-based ID）形式を使用
- ✅ **ライブラリ**: `@atproto/syntax` または既存の `ulid` パッケージ

### 3. Commentの実装方針

- ✅ **回答**: Commentは完全にReply Postとして扱う
- ✅ **回答**: 既存のコメントエンドポイントは変更が入っても大丈夫
- ✅ **対応**: Commentを`app.bsky.feed.post`として保存、`reply`フィールドで親子関係を表現

### 4. フィールド名の互換性

- ✅ **回答**: すぐに実行
- ✅ **対応**: `content` → `text`, `images` → `embed.images`, `tags` → `facets` への変更を実装

### 5. GSI設計

- ✅ **回答**: 新しいRepository構造に合わせてGSIを再設計
- ✅ **回答**: 既存のGSIは不要であれば削除しても大丈夫
- ✅ **回答**: 必要があれば新しいGSIを作成

---

## 🔍 追加確認事項

### 1. rkey生成ライブラリの選定

**現状**:

- `package.json`に`ulid`パッケージが既にインストール済み（`ulid: ^3.0.2`）

**選択肢**:

- **オプション1**: `@atproto/syntax`を使用（AT Protocol標準、TID形式）
- **オプション2**: 既存の`ulid`パッケージを使用（ULID形式）

**質問**:

- [ ] `@atproto/syntax`を使用しますか？（AT Protocol標準、推奨）
- [ ] 既存の`ulid`パッケージを使用しますか？（既にインストール済み）

**推奨**: `@atproto/syntax`を使用（AT Protocol標準準拠、TID形式、13文字で短い）

---

### 2. フィールド名変更の実装方針

**変更内容**:

- `content` → `text`
- `images` → `embed.images`（将来的な実装）
- `tags` → `facets`（将来的な実装）

**質問**:

- [ ] `content` → `text` への変更は、APIリクエスト/レスポンスの両方を変更しますか？
- [ ] `images` → `embed.images` への変換は、すぐに実装しますか？それとも将来的な実装として残しますか？
- [ ] `tags` → `facets` への変換は、すぐに実装しますか？それとも将来的な実装として残しますか？

**推奨**:

- `content` → `text`: すぐに実装（APIリクエスト/レスポンスの両方を変更）
- `images` → `embed.images`: 将来的な実装として残す（現時点では`images`を維持）
- `tags` → `facets`: 将来的な実装として残す（現時点では`tags`を維持）

---

### 3. GSI設計の詳細

**新しいRepository構造**:

- **PK**: `REPO#{ownerDid}`
- **SK**: `REC#app.bsky.feed.post#{rkey}`

**必要なクエリパターン**:

1. ユーザーの投稿一覧取得（時系列順）
2. 特定の投稿取得（AT URIから）
3. フィード取得（複数ユーザーの投稿、時系列順）
4. Reply Post（Comment）の取得（親投稿のReply一覧）

**質問**:

- [ ] どのGSIが必要ですか？
  - GSI1: ユーザーの投稿一覧取得用（`GSI1PK: REPO#{ownerDid}`, `GSI1SK: REC#app.bsky.feed.post#{rkey}`）
  - GSI2: フィード取得用（複数ユーザーの投稿、時系列順）
  - GSI3: Reply Post取得用（親投稿のReply一覧）
  - その他？

**推奨GSI設計**:

- **GSI1**: ユーザーの投稿一覧取得用
  - `GSI1PK: REPO#{ownerDid}`
  - `GSI1SK: REC#app.bsky.feed.post#{rkey}`
- **GSI2**: フィード取得用（全ユーザーの投稿、時系列順）
  - `GSI2PK: POST#ALL`（固定値）
  - `GSI2SK: REC#app.bsky.feed.post#{rkey}`
- **GSI3**: Reply Post取得用（親投稿のReply一覧）
  - `GSI3PK: REPLY#ROOT#{rootPostUri}`（ルート投稿のAT URI）
  - `GSI3SK: REC#app.bsky.feed.post#{rkey}`

---

### 4. 集計データ（likeCount, commentCount）の扱い

**現状**:

- `likeCount`, `commentCount`をRepositoryに保存

**AT Protocol要件**:

- AT Protocolでは集計データは通常AppViewで計算
- Repositoryには保存しない（計算可能なデータ）

**質問**:

- [ ] 集計データ（`likeCount`, `commentCount`）をRepositoryに保存しますか？（パフォーマンス向上のため）
- [ ] それとも、AppViewで計算しますか？（AT Protocol準拠）

**推奨**: パフォーマンス向上のため、キャッシュとしてRepositoryに保存（AT Protocol準拠モードでは計算可能なデータとして扱う）

---

### 5. CID（Content Identifier）の実装

**現状**:

- CIDは未実装

**AT Protocol要件**:

- CIDはIPFS Content Identifier
- Recordの不変性を保証するために使用
- 将来的には必須になる可能性

**質問**:

- [ ] CID生成・検証の実装タイミングは？（現時点ではoptionalでOK？）

**推奨**: 現時点ではoptionalで問題なし、将来的なCID生成機能の準備

---

### 6. メタデータの実装

**現状**:

- Post/Commentメタデータは未実装

**AT Protocol要件**:

- 標準Post: `app.bsky.feed.post`
- 拡張メタ: `jp.heartland.feed.post.meta`（独自拡張）

**質問**:

- [ ] Postメタデータ（`jp.heartland.feed.post.meta`）は必要ですか？
- [ ] Commentメタデータ（`jp.heartland.feed.comment.meta`）は必要ですか？

**推奨**: 最小実装ではメタデータは不要、将来的に必要になったら追加

---

### 7. 既存エンドポイントの互換性

**変更されるエンドポイント**:

- `GET /sns/posts/{postId}` → `GET /sns/posts/{atUri}` または `GET /sns/posts/{rkey}`
- `POST /sns/posts/{postId}/comments` → `POST /sns/posts/{atUri}/comments` または `POST /sns/posts/{rkey}/comments`

**質問**:

- [ ] 既存のエンドポイントパラメータ（`postId`）をAT URIまたはrkeyに変更しますか？
- [ ] それとも、`postId`とAT URI/rkeyの両方をサポートしますか？（マッピングレイヤー）

**推奨**: 段階的移行のため、`postId`とAT URI/rkeyの両方をサポート（マッピングレイヤーで変換）

---

### 8. レスポンス形式の変更

**現状**:

- `PostData.postId: string`（UUID形式）

**変更後**:

- `PostData.uri: string`（AT URI形式）
- `PostData.rkey: string`（rkey形式）

**質問**:

- [ ] レスポンスに`postId`（後方互換性のため）も含めますか？
- [ ] それとも、`uri`と`rkey`のみにしますか？

**推奨**: 段階的移行のため、`postId`（後方互換性）と`uri`/`rkey`の両方を含める

---

## 📝 実装前の最終確認

### 必須確認事項

1. **rkey生成ライブラリの選定**
   - [ ] `@atproto/syntax`を使用（推奨）
   - [ ] 既存の`ulid`パッケージを使用

2. **フィールド名変更の実装方針**
   - [ ] `content` → `text` への変更をすぐに実装
   - [ ] `images` → `embed.images` への変換タイミング
   - [ ] `tags` → `facets` への変換タイミング

3. **GSI設計の詳細**
   - [ ] 必要なGSIのリスト
   - [ ] 既存GSIの削除対象

4. **集計データの扱い**
   - [ ] Repositoryに保存（パフォーマンス向上）
   - [ ] AppViewで計算（AT Protocol準拠）

### 推奨確認事項

5. **CID実装タイミング**
   - [ ] 現時点ではoptionalでOK

6. **メタデータの実装**
   - [ ] 最小実装では不要

7. **既存エンドポイントの互換性**
   - [ ] 段階的移行のため、`postId`とAT URI/rkeyの両方をサポート

8. **レスポンス形式の変更**
   - [ ] 段階的移行のため、`postId`（後方互換性）と`uri`/`rkey`の両方を含める

---

**最終更新**: 2026-01-05  
**次回**: 確認事項への回答後、実装開始
