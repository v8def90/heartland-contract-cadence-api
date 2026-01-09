# LINEアカウント連携 実装計画

**作成日**: 2025-01-09  
**参照URL**: https://developers.line.biz/ja/docs/messaging-api/linking-accounts/  
**目的**: LINEアプリとこのアプリを連携するためのエンドポイント実装計画

---

## 📋 実装概要

LINE Messaging APIを使用して、LINEアカウントと自社サービスのアカウント（primaryDidベース）をセキュアに連携する機能を実装します。

### システム構成

- **Botサーバー**: 別途実装予定（連携トークン発行、連携URL送信、Webhook受信）
- **Webサーバー（API）**: 今回実装対象（ログイン、nonce生成、リダイレクト、連携処理）
- **フロントエンド**: 別途実装予定（ログイン画面）

### 連携フロー概要

```
【Botサーバー側（別途実装）】
1. ボットサーバー → LINE API: 連携トークン発行
2. ボットサーバー → ユーザー: 連携URL送信（Messaging API）

【Webサーバー側（今回実装）】
3. ユーザー → フロントエンド: 連携URLにアクセス（https://dev-app.heart-land.io/line/link?linkToken=xxx）
4. フロントエンド: ログイン画面表示
5. ユーザー: 自社サービスの認証情報入力（email/password または JWT）
6. フロントエンド → Webサーバー（API）: ログイン認証
7. Webサーバー（API）: nonce生成 + LINEプラットフォームにリダイレクト
   → https://access.line.me/dialog/bot/accountLink?linkToken={linkToken}&nonce={nonce}

【Botサーバー側（別途実装）】
8. LINEプラットフォーム → Botサーバー: Webhookイベント送信（アカウント連携イベント）
9. Botサーバー → Webサーバー（API）: 連携完了通知（オプション、API呼び出し）
   → または、Botサーバーが直接DynamoDBに連携情報を保存

【Webサーバー側（今回実装）】
10. Webサーバー（API）: 連携ステータス確認、連携解除などの管理機能
```

---

## 🎯 実装フェーズ

### Phase 1: データモデル設計

#### 1.1 DynamoDBスキーマ設計

**LINE連携情報テーブル（既存のSnsTableを使用）**

```typescript
// LINE連携情報アイテム
interface DynamoDBLineLinkItem {
  PK: string; // LINE_LINK#{lineUserId}
  SK: string; // META
  lineUserId: string; // LINEのユーザーID
  primaryDid: string; // 自社サービスのprimaryDid（did:plc:...）
  linkedAt: string; // 連携日時（ISO 8601）
  unlinkedAt?: string; // 連携解除日時
  status: 'linked' | 'unlinked'; // 連携ステータス
  createdAt: string;
  updatedAt: string;

  // GSI Keys
  GSI1PK?: string; // USER#{primaryDid}
  GSI1SK?: string; // LINE_LINK#{lineUserId}
}

// LINE連携用nonceアイテム（既存のNonceServiceを拡張または新規作成）
interface DynamoDBLineLinkNonceItem {
  PK: string; // LINE_NONCE#{nonce}
  SK: string; // META
  nonce: string; // nonce（10文字以上255文字以下、128ビット以上推奨）
  primaryDid: string; // 自社サービスのユーザーID（primaryDid）
  linkToken: string; // 連携トークン
  createdAt: string;
  expiresAt: number; // nonce有効期限（10分）
  status: 'active' | 'used' | 'expired';
  ttl?: number; // TTL（24時間後）

  // GSI Keys
  GSI1PK?: string; // LINE_NONCE_STATUS#{status}
  GSI1SK?: string; // LINE_NONCE#{nonce}
}
```

**既存のDynamoDBUserProfileItemへの拡張**

```typescript
// DynamoDBUserProfileItemに追加
interface DynamoDBUserProfileItem {
  // ... 既存フィールド ...
  authProviders?: {
    emailPassword?: boolean;
    atproto?: boolean;
    eip155?: boolean;
    flow?: boolean;
    line?: boolean; // 追加
  };
  lineUserId?: string; // LINEユーザーID（検索用）
}
```

#### 1.2 レスポンスモデル定義

**`src/models/responses/LineResponses.ts`** を新規作成

```typescript
// アカウント連携レスポンス（nonce生成成功、リダイレクトURL返却）
export interface LineLinkResponse {
  success: boolean;
  redirectUrl: string; // LINEプラットフォームへのリダイレクトURL
  nonce: string; // 生成されたnonce（デバッグ用、本番環境では返却しない）
  expiresAt: string; // nonce有効期限（ISO 8601）
}

// アカウント連携完了レスポンス（Botサーバーから呼び出し時）
export interface LineCompleteLinkResponse {
  success: boolean;
  lineUserId: string;
  primaryDid: string;
  linkedAt: string; // ISO 8601
}

// アカウント連携ステータス
export interface LineLinkStatus {
  isLinked: boolean;
  lineUserId?: string;
  linkedAt?: string;
  primaryDid?: string;
}

// アカウント連携解除レスポンス
export interface LineUnlinkResponse {
  success: boolean;
  unlinkedAt: string;
}
```

#### 1.3 リクエストモデル定義

**`src/models/requests/LineRequests.ts`** を新規作成

```typescript
// アカウント連携リクエスト（ログイン情報）
export interface LineLinkRequest {
  // 認証方法A: email/password認証
  email?: string;
  password?: string;
  // 認証方法B: JWT認証（リクエストヘッダーに`Authorization: Bearer {jwtToken}`を含める）
  // jwtTokenはリクエストボディには含めない
}

// アカウント連携完了リクエスト（Botサーバーから呼び出し）
export interface LineCompleteLinkRequest {
  lineUserId: string; // LINEのユーザーID
  nonce: string; // nonce
}

// アカウント連携ステータス取得リクエスト
export interface LineLinkStatusRequest {
  lineUserId?: string; // LINEユーザーIDで検索
  primaryDid?: string; // primaryDidで検索
}
```

---

### Phase 2: LINE Messaging API統合サービス（スキップ）

#### 2.1 LineMessagingService実装

**`src/services/LineMessagingService.ts`** - **Botサーバー側で実装予定のため、今回は実装不要**

**Botサーバー側で実装される機能**:

1. **連携トークン発行**: `POST /v2/bot/user/{userId}/linkToken`
2. **メッセージ送信**: `POST /v2/bot/message/push`（連携URL送信用）
3. **Webhook署名検証**: LINE Webhookイベントの署名検証

**注意**: 今回のWebサーバー（API）実装では、LINE Messaging APIを直接呼び出す必要はありません。

---

### Phase 3: LINE連携サービス実装

#### 3.1 LineLinkService実装

**`src/services/LineLinkService.ts`** を新規作成

**主な機能**:

1. **nonce管理**: LINE連携用nonceの生成・検証・削除
2. **アカウント連携**: LINEユーザーIDとprimaryDidの紐付け
3. **アカウント連携解除**: 連携の解除
4. **連携ステータス取得**: 連携状態の確認
5. **既存連携確認**: 既に連携済みかどうかの確認

**実装内容**:

- DynamoDBへの連携情報保存・取得
- nonceとprimaryDidの紐付け管理（DynamoDBLineLinkNonceItem）
- nonceの有効期限管理（10分）
- 既存連携の確認（LINEユーザーIDまたはprimaryDidで検索）
- ユーザープロフィールの`authProviders.line`更新

---

### Phase 4: コントローラー実装

#### 4.1 LineController実装

**`src/controllers/line/LineController.ts`** を新規作成

**エンドポイント**:

1. ~~**`POST /line/link-token`**~~ - **Botサーバー側で実装（今回は実装不要）**
   - Botサーバー側で実装される機能

2. ~~**`POST /line/send-link-url`**~~ - **Botサーバー側で実装（今回は実装不要）**
   - Botサーバー側で実装される機能

3. **`POST /line/link`** - nonce生成とリダイレクト（**今回実装**）
   - リクエスト: ログイン情報（email/password または JWT）
     - **認証方法A（JWT）**: リクエストヘッダーに`Authorization: Bearer {jwtToken}`を含める
     - **認証方法B（email/password）**: リクエストボディに`{ email: string, password: string }`を含める
   - クエリパラメータ: `linkToken`（必須、Botサーバー側で管理、検証は行わない）
   - 説明:
     - ユーザー認証（email/password または JWT）
     - 既存連携の確認（既に連携済みの場合はエラー）
     - nonce生成（128ビット以上、Base64エンコード）
     - nonceとprimaryDidをDynamoDBに紐付け保存
     - レスポンスにリダイレクトURLを返却: `https://access.line.me/dialog/bot/accountLink?linkToken={linkToken}&nonce={nonce}`
   - **注意**: フロントエンドから呼び出されるAPIエンドポイント

4. **`POST /line/complete-link`** - アカウント連携完了処理（**今回実装**）
   - リクエスト: `{ lineUserId: string, nonce: string }`
   - 認証: Botサーバーからの呼び出しのため、APIキーまたはJWT認証を検討
   - 説明:
     - Botサーバーから呼び出される（Webhook受信後）
     - nonceからprimaryDidを取得（DynamoDBから検索）
     - 既存連携の確認（既に連携済みの場合はエラー）
     - LINEユーザーIDとprimaryDidをDynamoDBに紐付け保存
     - nonceを無効化（status: 'used'に更新）
     - ユーザープロフィールの`authProviders.line`を`true`に更新
   - **注意**: Botサーバーから呼び出されるため、認証が必要（APIキーまたはJWT）

5. ~~**`POST /line/webhook`**~~ - **Botサーバー側で実装（今回は実装不要）**
   - Botサーバー側でWebhookを受信し、必要に応じて`/line/complete-link`を呼び出す

6. **`GET /line/link-status`** - 連携ステータス取得（**今回実装**）
   - クエリパラメータ: `lineUserId` または `primaryDid`
   - レスポンス: `LineLinkStatus`
   - 説明: 連携状態を確認

7. **`DELETE /line/unlink`** - アカウント連携解除（**今回実装**）
   - クエリパラメータ: `lineUserId` または `primaryDid`
   - レスポンス: `LineUnlinkResponse`
   - 説明: アカウント連携を解除

---

### Phase 5: Webhookハンドラー実装（スキップ）

#### 5.1 LINE Webhookハンドラー実装

**`src/handlers/lineWebhook.ts`** - **Botサーバー側で実装予定のため、今回は実装不要**

**Botサーバー側で実装される機能**:

- LINE Webhookイベントの署名検証
- イベントタイプの判定（`accountLink`）
- 必要に応じて`/line/complete-link`エンドポイントを呼び出し
- または、Botサーバーが直接DynamoDBに連携情報を保存

**注意**:

- WebhookはBotサーバー側で受信します
- BotサーバーがWebhookを受信した後、必要に応じてWebサーバー（API）の`/line/complete-link`を呼び出すか、直接DynamoDBに保存するかを選択できます

---

### Phase 6: セキュリティ実装

#### 6.1 nonce生成のセキュリティ要件

- **長さ**: 10文字以上255文字以下
- **推奨**: 128ビット（16バイト）以上
- **エンコード**: Base64エンコード
- **生成方法**: セキュアなランダム生成関数（`crypto.randomBytes`）

#### 6.2 Webhook署名検証

- LINE Webhookイベントの署名を検証
- `X-Line-Signature`ヘッダーを使用
- HMAC-SHA256による署名検証

#### 6.3 連携トークンの有効期限管理

- 連携トークンは10分間有効
- 1回のみ使用可能
- 使用後は即座に無効化

---

### Phase 7: 環境変数設定

#### 7.1 必要な環境変数

**`serverless.yml`に追加**:

```yaml
environment:
  # フロントエンドURL（連携URL生成用、リダイレクト先URL生成用）
  FRONTEND_URL: ${env:FRONTEND_URL, 'https://dev-app.heart-land.io'}
```

**注意**:

- `LINE_CHANNEL_ACCESS_TOKEN`と`LINE_CHANNEL_SECRET`はBotサーバー側で使用するため、Webサーバー（API）側では不要です
- Botサーバーから`POST /line/complete-link`を呼び出す際の認証方法は、実装時に決定（APIキーまたはJWT）

---

### Phase 8: DynamoDB GSI追加（必要に応じて）

#### 8.1 GSI追加検討

既存のGSIで対応可能か確認:

- **GSI1**: `USER#{primaryDid}` → `LINE_LINK#{lineUserId}` で連携情報取得
- 必要に応じて新しいGSIを追加

**serverless.ymlへの追加（必要に応じて）**:

```yaml
# GSI14: LINE連携情報検索（USER#{primaryDid} → LINE_LINK#{lineUserId}）
- IndexName: GSI14
  KeySchema:
    - AttributeName: GSI14PK
      KeyType: HASH
    - AttributeName: GSI14SK
      KeyType: RANGE
  Projection:
    ProjectionType: ALL
```

---

## 📝 実装時の注意点

### 1. セキュリティ

- **nonceの予測不可能性**: 自社サービスのユーザーIDなどの予測可能な値は使用しない
- **連携トークンの有効期限**: 10分を超えた連携トークンは無効化
- **Webhook署名検証**: すべてのWebhookイベントで署名を検証
- **TTL設定**: 未使用のlinkTokenとnonceはTTLで自動削除

### 2. エラーハンドリング

- 既存連携エラー: `400 Bad Request` + `{ code: 'ALREADY_LINKED', message: 'Account is already linked' }`
- 認証エラー: `401 Unauthorized` + `{ code: 'UNAUTHORIZED', message: 'Authentication required' }`
- 無効なnonce: `400 Bad Request` + `{ code: 'INVALID_NONCE', message: 'Invalid or expired nonce' }`
- ユーザー未登録: `404 Not Found` + `{ code: 'USER_NOT_FOUND', message: 'User not found' }`
- 認証方法の指定エラー: `400 Bad Request` + `{ code: 'INVALID_AUTH_METHOD', message: 'Either email/password or JWT token is required' }`

### 3. ログ出力

- nonce生成ログ（nonce、primaryDid、linkToken）
- アカウント連携成功/失敗ログ（lineUserId、primaryDid）
- 認証ログ（email/password、JWT）
- 既存連携確認ログ
- Botサーバーからの`/line/complete-link`呼び出しログ

### 4. フロントエンド連携

- ログイン画面の実装（フロントエンド側）
- 連携URL: `https://dev-app.heart-land.io/line/link?linkToken=xxx`
- リダイレクト先: `https://access.line.me/dialog/bot/accountLink?linkToken={linkToken}&nonce={nonce}`
- フロントエンドから`POST /line/link`を呼び出し（email/password または JWT）

---

## 🔍 不明点・確認事項

### 1. 認証方法の選択

**質問**: 連携URLにアクセスしたユーザーの認証方法は？

- **選択肢A**: 既存のJWT認証（`/auth/email-login`でログイン済みのユーザー）
- **選択肢B**: ログイン画面でemail/password認証
- **選択肢C**: その他の認証方法

**推奨**: 選択肢B（ログイン画面でemail/password認証）を実装し、選択肢Aもサポート

### 2. フロントエンドURL

**質問**: 連携URLのベースURLは？

- 例: `https://dev-api.heart-land.io/line/link?linkToken=xxx`
- または: `https://dev.heart-land.io/line/link?linkToken=xxx`（フロントエンドURL）

**推奨**: フロントエンドURLを使用（`FRONTEND_URL`環境変数）

### 3. LINE公式アカウントの友だち追加

**質問**: LINE公式アカウントの友だち追加は必須ですか？

- **回答**: はい、必須です（LINE公式アカウントを友だち追加している必要があります）

### 4. 既存ユーザーとの連携

**質問**: 既存のユーザー（primaryDid）とLINEアカウントを連携する場合、どのようにユーザーを特定しますか？

- **回答**: ログイン画面でemail/password認証を行い、primaryDidを取得

### 5. 新規ユーザー登録

**質問**: LINEアカウント連携時に新規ユーザー登録も可能にしますか？

- **回答**: 既存ユーザーのみ連携可能とする（新規登録は別途実装）

### 6. Webhook実装の必要性

**質問**: botサーバーは別途実装予定。今回はWebサーバー（と実際に処理をするAPI）部分を実装予定。その場合、Webhook実装は必要でしょうか？

**回答**:

- **WebhookはBotサーバー側で実装**します
- Webサーバー（API）側では、以下の2つの選択肢があります：
  1. **選択肢A（推奨）**: BotサーバーがWebhookを受信後、`POST /line/complete-link`エンドポイントを呼び出して連携を完了させる
  2. **選択肢B**: Botサーバーが直接DynamoDBに連携情報を保存する（この場合、`/line/complete-link`は不要）

**推奨**: 選択肢Aを実装し、Botサーバーから呼び出せるようにする

---

## 📊 実装スケジュール（推定）

| Phase    | 作業内容                         | 推定工数     | 実装対象         |
| -------- | -------------------------------- | ------------ | ---------------- |
| Phase 1  | データモデル設計                 | 2時間        | ✅ Webサーバー   |
| Phase 2  | LINE Messaging API統合サービス   | -            | ❌ Botサーバー側 |
| Phase 3  | LINE連携サービス実装             | 6時間        | ✅ Webサーバー   |
| Phase 4  | コントローラー実装               | 4時間        | ✅ Webサーバー   |
| Phase 5  | Webhookハンドラー実装            | -            | ❌ Botサーバー側 |
| Phase 6  | セキュリティ実装                 | 2時間        | ✅ Webサーバー   |
| Phase 7  | 環境変数設定                     | 0.5時間      | ✅ Webサーバー   |
| Phase 8  | DynamoDB GSI追加（必要に応じて） | 1時間        | ✅ Webサーバー   |
| **合計** |                                  | **15.5時間** |                  |

---

## 🧪 テスト計画

### 1. 単体テスト

- `LineLinkService`のテスト
- nonce生成・検証のテスト
- 既存連携確認のテスト
- アカウント連携・解除のテスト

### 2. 統合テスト

- ログイン（email/password） → nonce生成 → リダイレクトURL返却のフロー
- ログイン（JWT） → nonce生成 → リダイレクトURL返却のフロー
- Botサーバーからの`/line/complete-link`呼び出し → 連携完了のフロー
- 連携解除のフロー
- 既存連携エラーのテスト
- エラーハンドリングのテスト

### 3. エンドツーエンドテスト

- 実際のLINE公式アカウントを使用したテスト（Botサーバーと連携）
- 連携URLの動作確認
- フロントエンドからの`POST /line/link`呼び出し確認
- Botサーバーからの`POST /line/complete-link`呼び出し確認

---

## 📚 参考資料

- [LINE Developers - ユーザーアカウントの連携](https://developers.line.biz/ja/docs/messaging-api/linking-accounts/)
- [LINE Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [LINE Webhook イベント](https://developers.line.biz/ja/reference/messaging-api/#webhook-event-object)

---

## ✅ 次のステップ

1. **実装開始**: Phase 1から順次実装（Phase 2とPhase 5はスキップ）
2. **テスト**: 各Phase完了後にテストを実施
3. **Botサーバー連携**: Botサーバー側の実装と連携確認
4. **デプロイ**: 実装完了後にdev環境へデプロイ

## 🔄 Botサーバーとの連携仕様

### Botサーバーから呼び出すエンドポイント

1. **`POST /line/complete-link`**（必須）
   - BotサーバーがWebhookを受信後、このエンドポイントを呼び出して連携を完了
   - リクエスト: `{ lineUserId: string, nonce: string }`
   - レスポンス: `LineCompleteLinkResponse`
   - 認証: APIキーまたはJWT（実装時に決定）
   - エンドポイントURL: `https://dev-api.heart-land.io/line/complete-link`

### Botサーバーが実装する機能

1. **連携トークン発行**: `POST /v2/bot/user/{userId}/linkToken`
   - 連携トークンはBotサーバー側で管理（有効期限10分）
2. **連携URL送信**: `POST /v2/bot/message/push`
   - 連携URL: `https://dev-app.heart-land.io/line/link?linkToken={linkToken}`
3. **Webhook受信**: `POST /line/webhook`（Botサーバー側のエンドポイント）
   - LINEプラットフォームからWebhookイベントを受信
   - イベントタイプ: `accountLink`
   - イベントデータ: `{ result: 'ok' | 'failed', nonce: string, userId: string }`
4. **連携完了処理**: `POST /line/complete-link`を呼び出し
   - Webhookイベント受信後、`result: 'ok'`の場合に呼び出し
   - リクエスト: `{ lineUserId: string, nonce: string }`

### 連携フロー詳細

```
1. Botサーバー: 連携トークン発行（LINE API）
2. Botサーバー: 連携URL送信（Messaging API）
   → https://dev-app.heart-land.io/line/link?linkToken={linkToken}
3. ユーザー: フロントエンドでログイン（email/password または JWT）
4. フロントエンド: POST /line/link を呼び出し
   → リクエストヘッダー: Authorization: Bearer {jwtToken}
   → または リクエストボディ: { email: string, password: string }
5. Webサーバー: nonce生成、リダイレクトURL返却
   → https://access.line.me/dialog/bot/accountLink?linkToken={linkToken}&nonce={nonce}
6. ユーザー: LINEプラットフォームにリダイレクト
7. LINEプラットフォーム: BotサーバーにWebhookイベント送信
8. Botサーバー: POST /line/complete-link を呼び出し
   → { lineUserId: string, nonce: string }
9. Webサーバー: 連携完了処理（LINEユーザーIDとprimaryDidを紐付け）
```

---

---

## 📌 確認事項の回答と実装方針

### 1. Botサーバーとの連携方法 ✅

**回答**: **選択肢A** - Botサーバーが`POST /line/complete-link`を呼び出して連携を完了

**実装方針**:

- `POST /line/complete-link`エンドポイントを実装
- Botサーバーから呼び出し可能にする（認証は後述）
- nonceからprimaryDidを取得し、LINEユーザーIDと紐付け

### 2. 連携トークンの検証 ✅

**回答**: **選択肢A** - Botサーバーから連携トークンの有効期限情報を受け取る（API呼び出し）

**実装方針**:

- **注意**: 選択肢5で「Botサーバー側のみで管理」を選択したため、Webサーバー側では連携トークンの検証は行わない
- 連携トークンはBotサーバー側で管理され、Webサーバーは信頼する
- `POST /line/link`では連携トークンの検証は行わず、nonce生成のみを行う

### 3. 認証トークンの受け渡し ✅

**回答**: **選択肢A** - リクエストヘッダーに`Authorization: Bearer {jwtToken}`を含める

**実装方針**:

- 標準的なJWT認証方式を採用
- `POST /line/link`でJWT認証をサポート（既存のJWT認証ミドルウェアを使用）
- email/password認証の場合は、リクエストボディに含める

### 4. 既存連携の確認 ✅

**回答**: **選択肢A** - エラーを返す（既存連携を保護）

**実装方針**:

- 既にLINEアカウントと連携済みのユーザーが再度連携を試みた場合、エラーを返す
- エラーレスポンス: `400 Bad Request` + `{ code: 'ALREADY_LINKED', message: 'Account is already linked' }`

### 5. 連携トークンの保存場所 ✅

**回答**: **選択肢B** - Botサーバー側のみで管理（Webサーバーは検証しない）

**実装方針**:

- 連携トークンはBotサーバー側のみで管理
- Webサーバー側では連携トークンの検証は行わない
- `POST /line/link`では連携トークンをクエリパラメータとして受け取るが、検証は行わない（Botサーバーが管理していることを信頼）

### 6. エラーレスポンス仕様

**実装方針**:

- 既存連携エラー: `400 Bad Request` + `{ code: 'ALREADY_LINKED', message: 'Account is already linked' }`
- 認証エラー: `401 Unauthorized` + `{ code: 'UNAUTHORIZED', message: 'Authentication required' }`
- 無効なnonce: `400 Bad Request` + `{ code: 'INVALID_NONCE', message: 'Invalid or expired nonce' }`
- ユーザー未登録: `404 Not Found` + `{ code: 'USER_NOT_FOUND', message: 'User not found' }`

---

---

## 📋 実装計画サマリー

### 実装するエンドポイント（Webサーバー側）

1. **`POST /line/link`** - nonce生成とリダイレクトURL返却
   - 認証: email/password または JWT（リクエストヘッダー）
   - クエリパラメータ: `linkToken`（Botサーバー側で管理、検証なし）
   - レスポンス: リダイレクトURL（LINEプラットフォーム）

2. **`POST /line/complete-link`** - アカウント連携完了処理
   - 呼び出し元: Botサーバー（Webhook受信後）
   - 認証: APIキーまたはJWT（実装時に決定）
   - リクエスト: `{ lineUserId: string, nonce: string }`

3. **`GET /line/link-status`** - 連携ステータス取得
   - クエリパラメータ: `lineUserId` または `primaryDid`

4. **`DELETE /line/unlink`** - アカウント連携解除
   - クエリパラメータ: `lineUserId` または `primaryDid`

### 実装しない機能（Botサーバー側で実装）

- 連携トークン発行（`POST /v2/bot/user/{userId}/linkToken`）
- 連携URL送信（`POST /v2/bot/message/push`）
- Webhook受信（`POST /line/webhook`）

### 重要な実装方針

1. **連携トークンの検証**: Webサーバー側では行わない（Botサーバー側で管理）
2. **既存連携の保護**: 既に連携済みの場合はエラーを返す
3. **認証方法**: email/password と JWT（リクエストヘッダー）の両方をサポート
4. **nonce管理**: DynamoDBに保存、有効期限10分、使用後は無効化

### 実装フェーズ

- ✅ Phase 1: データモデル設計
- ❌ Phase 2: LINE Messaging API統合サービス（Botサーバー側）
- ✅ Phase 3: LINE連携サービス実装
- ✅ Phase 4: コントローラー実装
- ❌ Phase 5: Webhookハンドラー実装（Botサーバー側）
- ✅ Phase 6: セキュリティ実装
- ✅ Phase 7: 環境変数設定
- ✅ Phase 8: DynamoDB GSI追加（必要に応じて）

### 推定工数

**合計: 15.5時間**

---

**作成者**: AI Assistant  
**最終更新**: 2025-01-09
