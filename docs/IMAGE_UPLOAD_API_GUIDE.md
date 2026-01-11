# 画像アップロードAPI操作ガイド

## 概要

このドキュメントでは、ユーザーが画像ファイルをアップロードするための完全なAPI操作フローを説明します。

## アップロードフロー概要

```
1. 認証 (JWT Token取得)
   ↓
2. Presigned URL取得 (POST /sns/users/{did}/upload/{imageType})
   ↓
3. S3への直接アップロード (PUT request to presigned URL)
   ↓
4. S3イベントトリガー → imageProcessor Lambda起動
   ↓
5. 画像処理 (リサイズ、WebP変換)
   ↓
6. 処理済み画像をpublic/配下に保存
   ↓
7. アップロードステータス確認 (GET /sns/users/{did}/upload/status/{uploadId})
```

## ステップ1: 認証 (JWT Token取得)

画像アップロードにはJWT認証が必要です。まず、ログインエンドポイントでJWTトークンを取得してください。

### エンドポイント

```
POST /auth/email-login
```

### リクエスト例

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### レスポンス例

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "email": "user@example.com",
    "role": "user",
    "issuedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**重要**: JWTトークンの`sub`フィールドに`primaryDid`（`did:plc:...`形式）が含まれています。この値は次のステップで使用します。JWTトークンをデコードして`sub`フィールドを取得するか、ユーザープロフィール取得API（`GET /sns/users/{did}`）で`primaryDid`を確認してください。

## ステップ2: Presigned URL取得

### エンドポイント

```
POST /sns/users/{did}/upload/{imageType}
```

### パスパラメータ

- `did`: ユーザーのprimary DID（`did:plc:...`形式）
- `imageType`: 画像タイプ（`avatar`, `background`, `post`のいずれか）

### リクエストヘッダー

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### リクエストボディ

```json
{
  "fileType": "png",
  "fileSize": 1048576,
  "contentType": "image/png"
}
```

### リクエストパラメータ詳細

| パラメータ    | 型     | 必須 | 説明                                                            |
| ------------- | ------ | ---- | --------------------------------------------------------------- |
| `fileType`    | string | ✅   | ファイル拡張子（`png`, `jpg`, `jpeg`, `svg`, `webp`のいずれか） |
| `fileSize`    | number | ✅   | ファイルサイズ（バイト単位、最大10MB）                          |
| `contentType` | string | ✅   | MIMEタイプ（例: `image/png`, `image/jpeg`）                     |

### 制約事項

- **サポートされているファイルタイプ**: `png`, `jpg`, `jpeg`, `svg`, `webp`
- **最大ファイルサイズ**: 10MB (10,485,760 bytes)
- **レート制限**: 1時間あたり100回まで（画像タイプごと）
- **認証**: JWT認証必須
- **認可**: 自分のアカウントのみアップロード可能（`did`はJWTトークンの`sub`フィールドと一致する必要がある）

### レスポンス例（成功）

```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "presignedUrl": "https://heartland-api-v3-app-assets-dev-v6.s3.ap-northeast-1.amazonaws.com/uploads/did:plc:ihr56b42ogklehyuc3w5qmoi/avatar/550e8400-e29b-41d4-a716-446655440000.orig?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "bucketName": "heartland-api-v3-app-assets-dev-v6",
    "objectKey": "uploads/did:plc:ihr56b42ogklehyuc3w5qmoi/avatar/550e8400-e29b-41d4-a716-446655440000.orig",
    "expiresAt": "2024-01-01T00:05:00.000Z",
    "fields": {
      "Content-Type": "image/png"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### レスポンスフィールド詳細

| フィールド     | 型     | 説明                                                       |
| -------------- | ------ | ---------------------------------------------------------- |
| `uploadId`     | string | アップロード追跡用の一意ID                                 |
| `presignedUrl` | string | S3への直接アップロード用のpresigned URL（有効期限5分）     |
| `bucketName`   | string | S3バケット名                                               |
| `objectKey`    | string | S3オブジェクトキー（パス）                                 |
| `expiresAt`    | string | presigned URLの有効期限（ISO 8601形式）                    |
| `fields`       | object | フォームデータに含める追加フィールド（`Content-Type`など） |

### エラーレスポンス例

#### 認証エラー (401)

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication required",
    "details": "Valid JWT token is required for this operation"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 認可エラー (403)

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Not authorized to upload for this user",
    "details": "Users can only upload images for their own account"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### バリデーションエラー (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file type",
    "details": "fileType must be one of: png, jpg, jpeg, svg, webp"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### レート制限エラー (429)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Upload rate limit exceeded. Please try again later.",
    "details": "Rate limit exceeded. Retry after 3600 seconds"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## ステップ3: S3への直接アップロード

presigned URLを取得したら、そのURLに対してPUTリクエストで画像ファイルをアップロードします。

### HTTPリクエスト

```
PUT {presignedUrl}
Content-Type: {contentType}
```

### リクエストボディ

画像ファイルのバイナリデータをそのまま送信します。

### 重要事項

- **HTTPメソッド**: `PUT`（POSTではありません）
- **Content-Type**: リクエストボディで指定した`contentType`を使用
- **有効期限**: presigned URLは5分間のみ有効
- **直接アップロード**: API Gatewayを経由せず、クライアントからS3に直接アップロードします

### アップロード例（JavaScript/Fetch）

```javascript
async function uploadImage(presignedUrl, imageFile, contentType) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: imageFile, // File object or Blob
  });

  if (response.ok) {
    console.log('Upload successful');
    return true;
  } else {
    console.error('Upload failed:', response.status, response.statusText);
    return false;
  }
}
```

### アップロード例（cURL）

```bash
curl -X PUT \
  "https://heartland-api-v3-app-assets-dev-v6.s3.ap-northeast-1.amazonaws.com/uploads/..." \
  -H "Content-Type: image/png" \
  --data-binary @image.png
```

## ステップ4-6: バックグラウンド処理

画像がS3にアップロードされると、以下の処理が自動的に実行されます：

1. **S3イベントトリガー**: `uploads/{did}/{imageType}/{uploadId}.orig`ファイルが作成されると、S3イベントが発火
2. **imageProcessor Lambda起動**: S3イベントにより、`imageProcessor` Lambda関数が自動的に起動
3. **画像処理**:
   - リサイズ（small: 200x200, medium: 800x800, large: 1920x1920）
   - WebP形式への変換
   - メタデータの抽出
4. **処理済み画像の保存**: `public/users/{did}/{imageType}/{version}@{size}.webp`形式で保存
5. **元ファイルの削除**: 処理完了後、元の`.orig`ファイルは削除されます

## ステップ7: アップロードステータス確認

### エンドポイント

```
GET /sns/users/{did}/upload/status/{uploadId}
```

### パスパラメータ

- `did`: ユーザーのprimary DID（`did:plc:...`形式）
- `uploadId`: ステップ2で取得した`uploadId`

### リクエストヘッダー

```
Authorization: Bearer {JWT_TOKEN}
```

### レスポンス例（処理中）

```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "imageType": "avatar",
    "userId": "did:plc:ihr56b42ogklehyuc3w5qmoi",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z"
  },
  "timestamp": "2024-01-01T00:01:00.000Z"
}
```

### レスポンス例（完了）

```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "imageType": "avatar",
    "userId": "did:plc:ihr56b42ogklehyuc3w5qmoi",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:02:00.000Z",
    "processedUrls": {
      "small": "https://heartland-api-v3-app-assets-dev-v6.s3.ap-northeast-1.amazonaws.com/public/users/did:plc:ihr56b42ogklehyuc3w5qmoi/avatar/v20240101_000000@small.webp",
      "medium": "https://heartland-api-v3-app-assets-dev-v6.s3.ap-northeast-1.amazonaws.com/public/users/did:plc:ihr56b42ogklehyuc3w5qmoi/avatar/v20240101_000000@medium.webp",
      "large": "https://heartland-api-v3-app-assets-dev-v6.s3.ap-northeast-1.amazonaws.com/public/users/did:plc:ihr56b42ogklehyuc3w5qmoi/avatar/v20240101_000000@large.webp"
    }
  },
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

### ステータス値

| ステータス   | 説明             |
| ------------ | ---------------- |
| `pending`    | アップロード待ち |
| `uploading`  | アップロード中   |
| `processing` | 画像処理中       |
| `completed`  | 処理完了         |
| `failed`     | 処理失敗         |

## 完全な実装例（JavaScript）

```javascript
class ImageUploadClient {
  constructor(apiBaseUrl, jwtToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.jwtToken = jwtToken;
  }

  async uploadImage(did, imageType, imageFile) {
    try {
      // ステップ1: Presigned URL取得
      const presignedUrlResponse = await this.getPresignedUrl(
        did,
        imageType,
        imageFile
      );

      if (!presignedUrlResponse.success) {
        throw new Error(presignedUrlResponse.error.message);
      }

      const { uploadId, presignedUrl, fields } = presignedUrlResponse.data;

      // ステップ2: S3への直接アップロード
      const uploadSuccess = await this.uploadToS3(
        presignedUrl,
        imageFile,
        fields['Content-Type']
      );

      if (!uploadSuccess) {
        throw new Error('Failed to upload image to S3');
      }

      // ステップ3: ステータス確認（ポーリング）
      const processedUrls = await this.waitForProcessing(did, uploadId);

      return {
        success: true,
        uploadId,
        processedUrls,
      };
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPresignedUrl(did, imageType, imageFile) {
    const fileType = imageFile.name.split('.').pop().toLowerCase();
    const fileSize = imageFile.size;
    const contentType = imageFile.type;

    const response = await fetch(
      `${this.apiBaseUrl}/sns/users/${did}/upload/${imageType}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileType,
          fileSize,
          contentType,
        }),
      }
    );

    return await response.json();
  }

  async uploadToS3(presignedUrl, imageFile, contentType) {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: imageFile,
    });

    return response.ok;
  }

  async waitForProcessing(did, uploadId, maxAttempts = 30, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(
        `${this.apiBaseUrl}/sns/users/${did}/upload/status/${uploadId}`,
        {
          headers: {
            Authorization: `Bearer ${this.jwtToken}`,
          },
        }
      );

      const statusData = await statusResponse.json();

      if (statusData.success && statusData.data.status === 'completed') {
        return statusData.data.processedUrls;
      }

      if (statusData.success && statusData.data.status === 'failed') {
        throw new Error(statusData.data.error || 'Image processing failed');
      }

      // 処理中の場合は待機
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Image processing timeout');
  }
}

// 使用例
const client = new ImageUploadClient(
  'https://api.example.com',
  'your-jwt-token'
);

const fileInput = document.querySelector('input[type="file"]');
const imageFile = fileInput.files[0];
const did = 'did:plc:ihr56b42ogklehyuc3w5qmoi';

const result = await client.uploadImage(did, 'avatar', imageFile);

if (result.success) {
  console.log('Upload successful!', result.processedUrls);
} else {
  console.error('Upload failed:', result.error);
}
```

## 画像タイプ別の用途

| 画像タイプ   | 用途                         | 保存先                           |
| ------------ | ---------------------------- | -------------------------------- |
| `avatar`     | ユーザーアバター画像         | `public/users/{did}/avatar/`     |
| `background` | ユーザープロフィール背景画像 | `public/users/{did}/background/` |
| `post`       | 投稿・コメント用画像         | `public/users/{did}/post/`       |

## 処理済み画像へのアクセス

処理完了後、以下のURL形式で画像にアクセスできます：

```
https://{bucketName}.s3.ap-northeast-1.amazonaws.com/public/users/{did}/{imageType}/{version}@{size}.webp
```

または、CloudFrontが設定されている場合：

```
https://{cloudfrontDomain}/public/users/{did}/{imageType}/{version}@{size}.webp
```

### 利用可能なサイズ

- `small`: 200x200px（サムネイル用）
- `medium`: 800x800px（標準表示用）
- `large`: 1920x1920px（高解像度表示用）

## エラーハンドリング

### よくあるエラーと対処法

1. **認証エラー (401)**
   - JWTトークンが無効または期限切れ
   - 対処: 再ログインして新しいトークンを取得

2. **認可エラー (403)**
   - 他のユーザーのアカウントにアップロードしようとしている
   - 対処: `did`がJWTトークンの`sub`フィールドと一致することを確認

3. **バリデーションエラー (400)**
   - ファイルタイプがサポートされていない、またはファイルサイズが大きすぎる
   - 対処: サポートされているファイルタイプ（png, jpg, jpeg, svg, webp）で、10MB以下であることを確認

4. **レート制限エラー (429)**
   - 1時間あたり100回のアップロード制限を超えた
   - 対処: 時間をおいてから再試行

5. **アップロード失敗**
   - presigned URLの有効期限切れ、またはネットワークエラー
   - 対処: 新しいpresigned URLを取得して再試行

## 注意事項

1. **presigned URLの有効期限**: 5分間のみ有効です。取得後は速やかにアップロードしてください。
2. **直接アップロード**: presigned URLはPUTリクエスト専用です。GETリクエストでは使用できません。
3. **処理時間**: 画像処理には数秒から数十秒かかる場合があります。ステータス確認APIでポーリングしてください。
4. **元ファイルの削除**: 処理完了後、元の`.orig`ファイルは自動的に削除されます。
5. **レート制限**: 画像タイプごとに1時間あたり100回のアップロード制限があります。

## 関連ドキュメント

- [API仕様書 (Swagger)](./swagger.json)
- [認証ガイド](./AUTHENTICATION.md)
- [エラーハンドリングガイド](./ERROR_HANDLING.md)
