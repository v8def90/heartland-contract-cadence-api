# `/sns/users/{userId}/profile` エンドポイント使い分けガイド

## 概要

`/sns/users/{userId}/profile` エンドポイントは、ユーザープロフィールのCRUD操作を提供します。
各HTTPメソッドの役割と使い分けを以下に説明します。

---

## 1. GET `/sns/users/{userId}/profile`

### 用途
**既存のユーザープロフィールを取得する**

### 特徴
- **認証不要**: 誰でもアクセス可能（公開情報）
- **読み取り専用**: データの変更は行わない
- **存在確認**: ユーザーが存在するかどうかを確認できる

### リクエスト
```http
GET /sns/users/{userId}/profile
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "did": "did:plc:lld5wgybmddzz32guiotcpce",
    "displayName": "John Doe",
    "handle": "johndoe",
    "description": "Software developer passionate about blockchain technology",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/background.jpg",
    "followerCount": 150,
    "followingCount": 75,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "email": "john.doe@example.com",
    "walletAddress": "0x1234567890abcdef",
    "postCount": 42,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### エラーレスポンス
- `404`: ユーザーが見つからない場合
- `500`: サーバーエラー

### 使用例
- ユーザープロフィールページの表示
- 他のユーザーのプロフィール閲覧
- ユーザー存在確認

---

## 2. POST `/sns/users/{userId}/profile`

### 用途
**新しいユーザープロフィールを作成する**

### 特徴
- **認証必須**: JWTトークンが必要
- **自己のみ**: 自分のプロフィールのみ作成可能（`userId`と認証ユーザーIDが一致する必要がある）
- **新規作成**: 既存プロフィールがある場合はエラー（409 Conflict）
- **必須フィールド**: `displayName`, `username`, `email`, `walletAddress` が必須

### リクエスト
```http
POST /sns/users/{userId}/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "displayName": "John Doe",
  "username": "johndoe",
  "bio": "Software developer passionate about blockchain technology",
  "avatarUrl": "https://example.com/avatar.jpg",
  "backgroundImageUrl": "https://example.com/background.jpg",
  "email": "john.doe@example.com",
  "walletAddress": "0x1234567890abcdef"
}
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "did": "did:plc:lld5wgybmddzz32guiotcpce",
    "displayName": "John Doe",
    "handle": "johndoe",
    "description": "Software developer passionate about blockchain technology",
    "avatar": "https://example.com/avatar.jpg",
    "banner": "https://example.com/background.jpg",
    "followerCount": 0,
    "followingCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "email": "john.doe@example.com",
    "walletAddress": "0x1234567890abcdef",
    "postCount": 0,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### エラーレスポンス
- `400`: 必須フィールドが不足している場合
- `401`: 認証トークンが無効または欠如
- `403`: 他のユーザーのプロフィールを作成しようとした場合
- `409`: 既にプロフィールが存在する場合
- `500`: サーバーエラー

### 使用例
- 初回プロフィール作成
- ユーザー登録後のプロフィール初期設定

### 注意点
- **一度だけ**: プロフィールは1ユーザーにつき1つだけ作成可能
- **既存チェック**: 既にプロフィールが存在する場合は `PUT` を使用

---

## 3. PUT `/sns/users/{userId}/profile`

### 用途
**既存のユーザープロフィールを更新する**

### 特徴
- **認証必須**: JWTトークンが必要
- **自己のみ**: 自分のプロフィールのみ更新可能（`userId`と認証ユーザーIDが一致する必要がある）
- **部分更新**: 必要なフィールドのみ送信可能（すべてのフィールドは必須ではない）
- **存在確認**: プロフィールが存在しない場合はエラー（404 Not Found）

### リクエスト
```http
PUT /sns/users/{userId}/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "displayName": "John Doe Updated",
  "bio": "Senior Software developer passionate about blockchain technology",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "did": "did:plc:lld5wgybmddzz32guiotcpce",
    "displayName": "John Doe Updated",
    "handle": "johndoe",
    "description": "Senior Software developer passionate about blockchain technology",
    "avatar": "https://example.com/new-avatar.jpg",
    "banner": "https://example.com/background.jpg",
    "followerCount": 150,
    "followingCount": 75,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "email": "john.doe@example.com",
    "walletAddress": "0x1234567890abcdef",
    "postCount": 42,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

### エラーレスポンス
- `400`: 更新するフィールドが1つも提供されていない場合
- `401`: 認証トークンが無効または欠如
- `403`: 他のユーザーのプロフィールを更新しようとした場合
- `404`: プロフィールが存在しない場合
- `500`: サーバーエラー

### 使用例
- プロフィール情報の変更（表示名、bio、アバターなど）
- メールアドレスやウォレットアドレスの更新

### 注意点
- **部分更新**: 送信したフィールドのみが更新される
- **必須フィールドなし**: すべてのフィールドがオプショナル（ただし、少なくとも1つは必須）

---

## 4. DELETE `/sns/users/{userId}/profile`

### 用途
**ユーザープロフィールを削除する**

### 特徴
- **認証必須**: JWTトークンが必要
- **自己のみ**: 自分のプロフィールのみ削除可能（`userId`と認証ユーザーIDが一致する必要がある）
- **不可逆操作**: 削除は取り消せない（警告あり）
- **完全削除**: プロフィールと関連データが削除される

### リクエスト
```http
DELETE /sns/users/{userId}/profile
Authorization: Bearer <JWT_TOKEN>
```

### レスポンス
```json
{
  "success": true,
  "data": null,
  "timestamp": "2024-01-15T11:30:00.000Z"
}
```

### エラーレスポンス
- `401`: 認証トークンが無効または欠如
- `403`: 他のユーザーのプロフィールを削除しようとした場合
- `404`: プロフィールが存在しない場合
- `500`: サーバーエラー

### 使用例
- アカウント削除
- データ削除リクエスト（GDPR対応など）

### 注意点
- **不可逆**: 削除されたデータは復元できない
- **関連データ**: プロフィールに関連するすべてのデータが削除される可能性がある

---

## 使い分けのまとめ

| メソッド | 認証 | 用途 | 既存プロフィール | 必須フィールド |
|---------|------|------|----------------|---------------|
| **GET** | 不要 | プロフィール取得 | 存在必須 | なし |
| **POST** | 必須 | プロフィール作成 | 存在してはいけない | `displayName`, `username`, `email`, `walletAddress` |
| **PUT** | 必須 | プロフィール更新 | 存在必須 | 少なくとも1つ |
| **DELETE** | 必須 | プロフィール削除 | 存在必須 | なし |

## 典型的な使用フロー

### 1. 新規ユーザーの場合
```
1. POST /sns/users/{userId}/profile  (プロフィール作成)
   ↓
2. GET /sns/users/{userId}/profile   (作成確認)
```

### 2. 既存ユーザーの場合
```
1. GET /sns/users/{userId}/profile   (現在のプロフィール確認)
   ↓
2. PUT /sns/users/{userId}/profile   (プロフィール更新)
   ↓
3. GET /sns/users/{userId}/profile   (更新確認)
```

### 3. アカウント削除の場合
```
1. DELETE /sns/users/{userId}/profile  (プロフィール削除)
```

## 実装の詳細

### 認証チェック
- **POST/PUT/DELETE**: すべて認証が必要
- **認証ユーザーID**: JWTトークンから取得した `user.id` と `userId` パラメータが一致する必要がある
- **GET**: 認証不要（公開情報）

### データマッピング
- **リクエスト**: `username` → `handle` (AT Protocol標準)
- **リクエスト**: `bio` → `description` (AT Protocol標準)
- **リクエスト**: `avatarUrl` → `avatar` (AT Protocol標準)
- **リクエスト**: `backgroundImageUrl` → `banner` (AT Protocol標準)
- **レスポンス**: AT Protocol Lexicon規則に準拠した形式で返却

### エラーハンドリング
- **400 Bad Request**: バリデーションエラー
- **401 Unauthorized**: 認証エラー
- **403 Forbidden**: 権限エラー（他のユーザーのプロフィール操作）
- **404 Not Found**: リソースが見つからない
- **409 Conflict**: リソースが既に存在する（POSTのみ）
- **500 Internal Server Error**: サーバーエラー

## 注意事項

1. **POSTとPUTの違い**
   - POST: 新規作成（既存プロフィールがあるとエラー）
   - PUT: 更新（既存プロフィールがないとエラー）

2. **認証と権限**
   - すべての書き込み操作（POST/PUT/DELETE）は認証が必要
   - 自分のプロフィールのみ操作可能

3. **データ整合性**
   - プロフィールは1ユーザーにつき1つだけ存在
   - 削除は不可逆操作

4. **AT Protocol準拠**
   - レスポンスはAT Protocol Lexicon規則に準拠
   - カスタム拡張フィールド（email, walletAddress等）も含まれる

