# AT Protocol対応: 既存エンドポイントへの影響分析

**作成日**: 2026-01-05  
**目的**: Post/CommentのAT Protocol対応実装が既存エンドポイントに与える影響の分析

---

## 📋 分析対象エンドポイント

### 1. `/sns/users/`から始まるエンドポイント（`GET /sns/users/{did}/posts`以外）

### 2. `/auth/`から始まるエンドポイント

### 3. `/tokens/`から始まるエンドポイント

### 4. `/sns/search/`から始まるエンドポイント

---

## 🔍 影響分析結果

### 1. `/sns/users/`から始まるエンドポイント

#### ✅ **影響なし**: `GET /sns/users/{did}`

**エンドポイント**: `GET /sns/users/{did}`

**実装**: `UsersController.getUserProfile()`

**使用データ**:

- `SnsService.getUserProfile()` → `DynamoDBUserProfileItem`のみ
- Post/Commentデータは使用しない

**結論**: **影響なし** ✅

---

#### ✅ **影響なし**: `POST /sns/users/{did}`

**エンドポイント**: `POST /sns/users/{did}`

**実装**: `UsersController.createUserProfile()`

**使用データ**:

- `SnsService.createUserProfile()` → `DynamoDBUserProfileItem`のみ
- Post/Commentデータは使用しない

**結論**: **影響なし** ✅

---

#### ✅ **影響なし**: `PUT /sns/users/{did}`

**エンドポイント**: `PUT /sns/users/{did}`

**実装**: `UsersController.updateUserProfile()`

**使用データ**:

- `SnsService.updateUserProfile()` → `DynamoDBUserProfileItem`のみ
- Post/Commentデータは使用しない

**結論**: **影響なし** ✅

---

#### ✅ **影響なし**: `DELETE /sns/users/{did}`

**エンドポイント**: `DELETE /sns/users/{did}`

**実装**: `UsersController.deleteUserProfile()`

**使用データ**:

- `SnsService.deleteUserProfile()` → `DynamoDBUserProfileItem`のみ
- Post/Commentデータは使用しない

**結論**: **影響なし** ✅

---

#### ⚠️ **影響あり**: `GET /sns/users/{did}/posts`

**エンドポイント**: `GET /sns/users/{did}/posts`

**実装**: `UsersController.getUserPosts()`

**使用データ**:

- `SnsService.getUserPosts()` → **Postデータを使用**
- `SnsService.getUserProfile()` → UserProfileデータ（影響なし）

**影響内容**:

- `SnsService.getUserPosts()`の実装が変更される
- レスポンス形式が変更される（`postId` → `uri`/`rkey`）
- パラメータが変更される可能性（`userId` → `ownerDid`）

**結論**: **影響あり** ⚠️（ただし、このエンドポイントは除外対象）

---

### 2. `/auth/`から始まるエンドポイント

#### ✅ **影響なし**: すべての`/auth/`エンドポイント

**エンドポイント一覧**:

- `POST /auth/login`
- `POST /auth/verify`
- `POST /auth/refresh`
- `POST /auth/blocto-login`
- `POST /auth/flow-login`
- `POST /auth/generate-nonce`
- `POST /auth/generate-test-signature`
- `POST /auth/register`
- `POST /auth/email-login`
- `POST /auth/verify-email`
- `POST /auth/resend-verification-email`
- `POST /auth/reset-password-request`
- `POST /auth/reset-password`
- `POST /auth/set-initial-password`
- `POST /auth/change-password`

**実装**: `AuthController`の各メソッド

**使用データ**:

- `UserAuthService` → 認証関連データのみ
- `PdsService` → PDSアカウント管理のみ
- Post/Commentデータは使用しない

**確認結果**:

- `AuthController`内で`SnsService.getPost()`や`SnsService.createPost()`を呼び出していない
- `AuthController`内で`PostData`や`CommentData`を使用していない

**結論**: **影響なし** ✅

---

### 3. `/tokens/`から始まるエンドポイント

#### ✅ **影響なし**: すべての`/tokens/`エンドポイント

**エンドポイント一覧**:

- `GET /tokens/balance/{did}`
- `POST /tokens/transfer`
- `GET /tokens/transactions/{did}`
- `GET /tokens/transactions/received/{did}`
- `GET /tokens/transactions/{senderDid}/to/{recipientDid}`

**実装**: `TokenController`の各メソッド

**使用データ**:

- `TokenService` → トークン残高・トランザクション履歴のみ
- `DynamoDBTokenBalanceItem`, `DynamoDBTokenTransactionItem`のみ
- Post/Commentデータは使用しない

**確認結果**:

- `TokenController`内で`SnsService.getPost()`や`SnsService.createPost()`を呼び出していない
- `TokenController`内で`PostData`や`CommentData`を使用していない
- `TokenService`は独立したサービス（Post/Commentとは無関係）

**結論**: **影響なし** ✅

---

### 4. `/sns/search/`から始まるエンドポイント

#### ✅ **影響なし**: `GET /sns/search/users`

**エンドポイント**: `GET /sns/search/users`

**実装**: `SearchController.searchUsersGet()`

**使用データ**:

- `SnsService.searchUsers()` → `DynamoDBUserProfileItem`のみ
- Post/Commentデータは使用しない

**確認結果**:

- `SearchController`内で`SnsService.getPost()`や`SnsService.createPost()`を呼び出していない
- `SearchController`内で`PostData`や`CommentData`を使用していない
- `SnsService.searchUsers()`は`DynamoDBUserProfileItem`のみを検索

**結論**: **影響なし** ✅

---

## 📊 影響分析まとめ

| エンドポイントグループ           | 影響            | 理由                                                       |
| -------------------------------- | --------------- | ---------------------------------------------------------- |
| **`/sns/users/{did}`**           | ✅ **影響なし** | UserProfileデータのみ使用、Post/Commentデータは使用しない  |
| **`POST /sns/users/{did}`**      | ✅ **影響なし** | UserProfileデータのみ使用、Post/Commentデータは使用しない  |
| **`PUT /sns/users/{did}`**       | ✅ **影響なし** | UserProfileデータのみ使用、Post/Commentデータは使用しない  |
| **`DELETE /sns/users/{did}`**    | ✅ **影響なし** | UserProfileデータのみ使用、Post/Commentデータは使用しない  |
| **`GET /sns/users/{did}/posts`** | ⚠️ **影響あり** | Postデータを使用（ただし除外対象）                         |
| **`/auth/*`**                    | ✅ **影響なし** | 認証関連データのみ使用、Post/Commentデータは使用しない     |
| **`/tokens/*`**                  | ✅ **影響なし** | トークン管理データのみ使用、Post/Commentデータは使用しない |
| **`/sns/search/users`**          | ✅ **影響なし** | UserProfileデータのみ使用、Post/Commentデータは使用しない  |

---

## ✅ 結論

### 影響なしのエンドポイント

以下のエンドポイントは、Post/CommentのAT Protocol対応実装の影響を受けません：

1. ✅ **`/sns/users/{did}`**（`GET /sns/users/{did}/posts`以外）
   - `GET /sns/users/{did}` - UserProfile取得
   - `POST /sns/users/{did}` - UserProfile作成
   - `PUT /sns/users/{did}` - UserProfile更新
   - `DELETE /sns/users/{did}` - UserProfile削除

2. ✅ **`/auth/*`**（すべてのエンドポイント）
   - 認証関連のエンドポイントすべて
   - Post/Commentデータを使用しない

3. ✅ **`/tokens/*`**（すべてのエンドポイント）
   - トークン管理のエンドポイントすべて
   - Post/Commentデータを使用しない

4. ✅ **`/sns/search/users`**
   - ユーザー検索エンドポイント
   - Post/Commentデータを使用しない

---

### 影響ありのエンドポイント

以下のエンドポイントは、Post/CommentのAT Protocol対応実装の影響を受けます：

1. ⚠️ **`GET /sns/users/{did}/posts`**
   - **理由**: `SnsService.getUserPosts()`を使用してPostデータを取得
   - **影響**: レスポンス形式の変更（`postId` → `uri`/`rkey`）
   - **注意**: このエンドポイントは除外対象として指定されているため、今回の実装では対応不要

---

## 🎯 実装時の注意事項

### 1. 影響なしのエンドポイント

**対応**: **変更不要**

これらのエンドポイントは、Post/Commentデータモデルの変更の影響を受けないため、実装時に変更する必要はありません。

---

### 2. 影響ありのエンドポイント（除外対象）

**対応**: **今回の実装では対応不要**

`GET /sns/users/{did}/posts`は除外対象として指定されているため、今回の実装では対応しません。

**将来的な対応**:

- 必要に応じて、別途実装を検討

---

## 📝 実装チェックリスト

### 影響なしのエンドポイント（確認のみ）

- [ ] `/sns/users/{did}`（`GET /sns/users/{did}/posts`以外）の動作確認
- [ ] `/auth/*`の動作確認
- [ ] `/tokens/*`の動作確認
- [ ] `/sns/search/users`の動作確認

### 影響ありのエンドポイント（除外対象）

- [ ] `GET /sns/users/{did}/posts`は除外対象として、今回の実装では対応しないことを確認

---

## ✅ 最終結論

**今回のAT Protocol対応（Post/Comment）の実装は、以下のエンドポイントに影響を与えません：**

1. ✅ `/sns/users/`から始まるエンドポイント（`GET /sns/users/{did}/posts`以外）
2. ✅ `/auth/`から始まるエンドポイント
3. ✅ `/tokens/`から始まるエンドポイント
4. ✅ `/sns/search/`から始まるエンドポイント

**これらのエンドポイントは、Post/Commentデータモデルの変更の影響を受けないため、実装時に変更する必要はありません。**

---

**最終更新**: 2026-01-05
