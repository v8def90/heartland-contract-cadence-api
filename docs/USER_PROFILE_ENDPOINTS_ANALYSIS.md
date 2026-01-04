# `/sns/users/{userId}/profile` エンドポイント分析レポート

## 質問への回答

### 1. POST `/sns/users/{userId}/profile` と `/auth/register` の違い

#### `/auth/register` (POST)
**目的**: 新規ユーザーアカウントの完全な初期化

**処理内容**:
1. **PDSサーバーでアカウント作成**
   - DID (did:plc:...) の生成
   - Handleの登録
   - PDSサーバーへのアカウント登録

2. **認証情報の作成**
   - パスワードハッシュの生成
   - メール検証トークンの生成
   - `DynamoDBIdentityLinkItem` の作成（email:xxx へのリンク）
   - `DynamoDBIdentityLookupItem` の作成（email:xxx → primaryDid のルックアップ）

3. **プロフィールの作成**
   - `DynamoDBUserProfileItem` の作成
   - 初期値設定（followerCount: 0, followingCount: 0, postCount: 0）

4. **メール送信**
   - 検証メールの送信

**必須フィールド**: `email`, `password`, `displayName`, `handle` (オプショナル)

**認証**: 不要（新規登録のため）

---

#### POST `/sns/users/{userId}/profile`
**目的**: 既存ユーザーに対するプロフィール情報の追加作成

**処理内容**:
1. **認証チェック**
   - JWTトークンから認証ユーザーIDを取得
   - `userId` と認証ユーザーIDが一致することを確認

2. **既存プロフィールチェック**
   - 既にプロフィールが存在する場合は409 Conflictエラー

3. **プロフィールの作成**
   - `SnsService.createUserProfile()` を呼び出し
   - `DynamoDBUserProfileItem` の作成
   - `DynamoDBIdentityLinkItem` の作成（email, walletAddress用）

**必須フィールド**: `displayName`, `username`, `email`, `walletAddress`

**認証**: 必須（JWT）

---

#### 主な違い

| 項目 | `/auth/register` | POST `/sns/users/{userId}/profile` |
|------|------------------|-----------------------------------|
| **目的** | 新規アカウント作成 | 既存ユーザーのプロフィール追加 |
| **PDS登録** | ✅ 実行される | ❌ 実行されない |
| **DID生成** | ✅ 実行される | ❌ 実行されない |
| **認証情報作成** | ✅ 実行される | ❌ 実行されない |
| **認証** | 不要 | 必須 |
| **既存チェック** | アカウント存在チェック | プロフィール存在チェック |
| **使用ケース** | 初回登録 | 既存ユーザーがプロフィールを追加 |

---

### 2. `{userId}` の後ろに `/profile` がついている理由

#### RESTful API設計の観点

`/sns/users/{userId}/profile` というパス構造は、RESTful API設計のベストプラクティスに従っています。

**理由**:
1. **リソースの階層構造**
   - `/sns/users/{userId}` - ユーザーリソース
   - `/sns/users/{userId}/profile` - ユーザーのプロフィールサブリソース
   - `/sns/users/{userId}/posts` - ユーザーの投稿サブリソース

2. **将来の拡張性**
   - 同じユーザーに対して複数のサブリソースを定義可能
   - 例: `/sns/users/{userId}/settings`, `/sns/users/{userId}/preferences` など

3. **明確なリソース識別**
   - `profile` がつくことで、プロフィール操作であることが明確
   - 他のユーザー関連操作（posts, follows等）と区別

4. **HTTPメソッドの使い分け**
   - 同じパスでGET/POST/PUT/DELETEを区別
   - リソース指向の設計

**実装上の確認**:
```typescript
@Route('sns/users')
@Get('{userId}/profile')    // GET /sns/users/{userId}/profile
@Post('{userId}/profile')    // POST /sns/users/{userId}/profile
@Put('{userId}/profile')     // PUT /sns/users/{userId}/profile
@Delete('{userId}/profile')  // DELETE /sns/users/{userId}/profile
@Get('{userId}/posts')       // GET /sns/users/{userId}/posts
```

---

### 3. DELETEでアカウント削除時に関連レコードがすべて削除されるか？

#### 現在の実装状況

**❌ 完全には削除されていません**

#### 実装コード
```typescript:src/services/SnsService.ts
async deleteUserProfile(userId: string): Promise<void> {
  // Delete the user profile (DynamoDBUserProfileItem)
  const command = new DeleteCommand({
    TableName: this.tableName,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
  });

  await this.client.send(command);

  // Note: Identity links are kept for audit purposes
  // If you want to delete all identity links, you would need to query and delete them separately
}
```

#### 削除されるもの
- ✅ `DynamoDBUserProfileItem` (PK: `USER#{userId}`, SK: `PROFILE`)

#### 削除されないもの
- ❌ `DynamoDBIdentityLinkItem` (PK: `USER#{userId}`, SK: `LINK#email:xxx`)
- ❌ `DynamoDBIdentityLinkItem` (PK: `USER#{userId}`, SK: `LINK#flow:xxx`)
- ❌ `DynamoDBIdentityLinkItem` (PK: `USER#{userId}`, SK: `LINK#eip155:xxx`)
- ❌ `DynamoDBIdentityLookupItem` (PK: `LOOKUP#email:xxx`, SK: `primaryDid`)
- ❌ ユーザーの投稿 (`POST#{postId}`)
- ❌ ユーザーのコメント (`COMMENT#{commentId}`)
- ❌ ユーザーのいいね (`LIKE#{likeId}`)
- ❌ フォロー関係 (`FOLLOW#{followerId}#{followingId}`)

#### 問題点
1. **データの不整合**: プロフィールは削除されるが、関連データが残る
2. **プライバシー**: 認証情報（IdentityLink）が残る可能性
3. **参照整合性**: 他のリソースから削除されたユーザーへの参照が残る

#### 改善提案
完全なアカウント削除を実装する場合、以下の処理が必要：

```typescript
async deleteUserProfile(userId: string): Promise<void> {
  // 1. プロフィール削除
  await this.deleteProfileItem(userId);
  
  // 2. Identity Links削除
  const identityLinks = await this.queryIdentityLinks(userId);
  for (const link of identityLinks) {
    await this.deleteIdentityLink(userId, link.linkedId);
  }
  
  // 3. Identity Lookups削除
  for (const link of identityLinks) {
    if (link.linkedId.startsWith('email:')) {
      await this.deleteIdentityLookup(link.linkedId);
    }
  }
  
  // 4. 投稿削除（オプション）
  // 5. コメント削除（オプション）
  // 6. いいね削除（オプション）
  // 7. フォロー関係削除（オプション）
}
```

---

### 4. `{userId}` は `did` のことですか？

#### 回答: **はい、`{userId}` は `primaryDid` (DID) です**

#### 実装上の確認

**1. SnsService.getUserProfile() の実装**
```typescript:src/services/SnsService.ts
async getUserProfile(userId: string): Promise<UserProfile | null> {
  // userId は primaryDid として扱われる
  const profileItem = await this.getUserProfileItem(userId);
  // ...
}
```

**2. DynamoDBのキー構造**
```typescript
PK: `USER#${primaryDid}`  // userId = primaryDid
SK: 'PROFILE'
```

**3. UserAuthService.registerWithEmailPassword() での使用**
```typescript
const primaryDid = pdsResult.did; // did:plc:...
await this.snsService.createUserProfileItem(primaryDid, { ... });
```

**4. UsersControllerでの使用例**
```typescript
@Get('{userId}/profile')
public async getUserProfile(@Path() userId: string) {
  // userId は did:plc:... 形式のDID
  const profile = await this.snsService.getUserProfile(userId);
}
```

#### DID形式
- **形式**: `did:plc:...` (AT Protocol DID)
- **例**: `did:plc:lld5wgybmddzz32guiotcpce`

#### 注意点
1. **命名の一貫性**: パラメータ名は `userId` だが、実際は `primaryDid` (DID)
2. **ドキュメント**: コメントやドキュメントでは `primaryDid` と記載されている場合がある
3. **型安全性**: TypeScriptの型定義では `string` だが、実際はDID形式の文字列

#### 改善提案
命名の一貫性を保つため、以下のいずれかが推奨：

1. **パラメータ名を変更**: `{userId}` → `{did}` または `{primaryDid}`
2. **ドキュメントの明確化**: `userId` は実際には `primaryDid` (DID) であることを明記

---

## まとめ

### 1. `/auth/register` vs POST `/sns/users/{userId}/profile`
- `/auth/register`: 新規アカウント完全初期化（PDS登録、DID生成、認証情報作成含む）
- POST `/sns/users/{userId}/profile`: 既存ユーザーのプロフィール追加作成

### 2. `/profile` がつく理由
- RESTful API設計のベストプラクティス
- リソースの階層構造と将来の拡張性
- 明確なリソース識別

### 3. DELETEの関連レコード削除
- **現状**: プロフィールのみ削除（不完全）
- **問題**: Identity Links、投稿、コメント等が残る
- **改善必要**: 完全なアカウント削除機能の実装が必要

### 4. `{userId}` は `did`
- **はい**: `{userId}` は実際には `primaryDid` (DID: `did:plc:...`)
- **命名**: パラメータ名と実体の不一致に注意
- **改善提案**: 命名の一貫性向上またはドキュメントの明確化

