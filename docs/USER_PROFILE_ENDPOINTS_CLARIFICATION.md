# ユーザープロフィールエンドポイントの明確化

## 質問1: `/auth/register` と POST `/sns/users/{did}` の関係

### 回答

**はい、認識は正しいです。**

`/auth/register` で登録した後、POST `/sns/users/{did}` は実行できません（409 Conflictエラーが返されます）。

### 詳細

#### `/auth/register` の処理内容

`/auth/register` エンドポイントは、以下の処理を実行します：

1. **PDSサーバーでアカウント作成**
   - DID (did:plc:...) の生成
   - Handleの登録

2. **認証情報の作成**
   - パスワードハッシュの生成
   - メール検証トークンの生成
   - `DynamoDBIdentityLinkItem` の作成
   - `DynamoDBIdentityLookupItem` の作成

3. **プロフィールの作成** ✅
   - `DynamoDBUserProfileItem` の作成（`createUserProfileItem` を呼び出し）
   - 初期値設定（followerCount: 0, followingCount: 0, postCount: 0）

4. **メール送信**
   - 検証メールの送信

**つまり、`/auth/register` で登録すると、既にプロフィールが作成されています。**

#### POST `/sns/users/{did}` の動作

POST `/sns/users/{did}` エンドポイントは、以下のチェックを行います：

```typescript
// Check if user profile already exists
const existingProfile = await this.snsService.getUserProfile(did);
if (existingProfile) {
  this.setStatus(409);
  return {
    success: false,
    error: {
      code: 'PROFILE_EXISTS',
      message: 'User profile already exists',
      details: `Profile for user ${did} already exists. Use PUT /sns/users/${did} to update the profile.`,
    },
  };
}
```

**既にプロフィールが存在する場合、409 Conflictエラーが返されます。**

### POST と PUT の違い

| 項目 | POST `/sns/users/{did}` | PUT `/sns/users/{did}` |
|------|------------------------|------------------------|
| **用途** | 新規プロフィール作成 | 既存プロフィール更新 |
| **既存プロフィール** | 存在してはいけない（409エラー） | 存在必須（404エラー） |
| **必須フィールド** | `displayName`, `username`, `email`, `walletAddress` | 少なくとも1つ |
| **使用ケース** | `/auth/register`以外の方法で登録したユーザー | プロフィール情報の変更 |

### 使用フロー

#### ケース1: `/auth/register` で登録した場合

```
1. POST /auth/register
   ↓ (プロフィールも作成される)
2. PUT /sns/users/{did}  (プロフィール更新)
```

**POST `/sns/users/{did}` は使用しない**

#### ケース2: 他の方法（Blocto/Flow wallet）で登録した場合

```
1. POST /auth/blocto-login または POST /auth/flow-login
   ↓ (プロフィールは作成されない)
2. POST /sns/users/{did}  (プロフィール作成)
   ↓
3. PUT /sns/users/{did}  (プロフィール更新)
```

### まとめ

- **`/auth/register`**: プロフィールも含めて完全なアカウント初期化
- **POST `/sns/users/{did}`**: `/auth/register`以外で登録したユーザーがプロフィールを作成する場合のみ使用
- **PUT `/sns/users/{did}`**: 既存プロフィールの更新（`/auth/register`で登録したユーザーも使用可能）

---

## 修正内容

### 1. エンドポイントパスの変更

- **変更前**: `/sns/users/{userId}/profile`
- **変更後**: `/sns/users/{did}`

### 2. パラメータ名の変更

- **変更前**: `{userId}`
- **変更後**: `{did}`

### 3. エラーメッセージの改善

- POST: 既にプロフィールが存在する場合、PUTを使用するよう案内
- PUT: プロフィールが存在しない場合、POSTを使用するよう案内

### 4. ユーザー削除の改善

- 論理削除（Soft Delete）を実装
- ベストプラクティスに基づいた実装方針を追加

