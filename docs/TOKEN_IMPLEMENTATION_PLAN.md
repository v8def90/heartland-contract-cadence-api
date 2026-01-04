# Token管理実装計画

## 📋 実装概要

Flow/Cadenceを使わない実装として、HEARTトークンの送信履歴と残高をDynamoDBで管理する機能を実装します。

## 🎯 実装目標

1. **トークン残高の管理**: DynamoDBでprimaryDidごとの残高を管理
2. **トークン送信履歴の管理**: すべての送信履歴をDynamoDBに保存
3. **送信処理の実装**: アトミック更新、ロールバック対応
4. **残高取得API**: `GET /tokens/balance/{did}` (JWT認証必要)
5. **送信処理API**: `POST /tokens/transfer` (JWT認証必要)
6. **送信履歴検索API**:
   - `GET /tokens/transactions/{did}` (送信者で検索、認証不要)
   - `GET /tokens/transactions/received/{did}` (受信者で検索、認証不要)
7. **アカウント作成時の残高初期付与**: `/auth/register` 時に1000 HEARTを付与

## 📊 実装フェーズ詳細

### Phase 1: データモデルと型定義

#### 1.1 DynamoDBアイテム型定義の作成

**ファイル**: `src/models/dynamodb/TokenModels.ts`

- `DynamoDBTokenBalanceItem` インターフェース
  - PK: `TOKEN_BALANCE#{primaryDid}`
  - SK: `BALANCE`
  - フィールド: `primaryDid`, `balance`, `balanceDecimal`, `updatedAt`, `createdAt`, GSI9関連

- `DynamoDBTokenTransactionItem` インターフェース
  - PK: `TOKEN_TX#{primaryDid}`
  - SK: `TX#{timestamp}#{transactionId}`
  - フィールド: すべてのトランザクション情報、GSI10-12関連

#### 1.2 リクエスト/レスポンス型定義の作成

**ファイル**: `src/models/requests/index.ts`, `src/models/responses/index.ts`

- `TransferTokenRequest` インターフェース
  - `recipientDid`: string (必須)
  - `amount`: string (必須)
  - `message`: string (必須)
  - `idempotencyKey?`: string (オプション)

- `TokenBalanceResponse` インターフェース
  - `balance`: string
  - `balanceDecimal`: number
  - `primaryDid`: string
  - `formatted`: string

- `TokenTransactionResponse` インターフェース
  - トランザクション情報のすべてのフィールド

- `TransactionHistoryResponse` インターフェース
  - `transactions`: TokenTransactionResponse[]
  - `cursor?`: string
  - `hasMore`: boolean

#### 1.3 定数定義の作成

**ファイル**: `src/utils/tokenConstants.ts`

- `TOKEN_DECIMAL_PRECISION = 8` (小数点以下8桁)
- `INITIAL_BALANCE = "1000.00000000"` (初期残高)
- Weight評価閾値の定数（環境変数から読み込み）

### Phase 2: TokenServiceの実装

#### 2.1 TokenServiceクラスの作成

**ファイル**: `src/services/TokenService.ts`

**主要メソッド**:

1. **`getBalance(primaryDid: string): Promise<ApiResponse<TokenBalanceData>>`**
   - DynamoDBから残高を取得
   - 存在しない場合は初期値1000 HEARTを返す（レコードは作成しない）

2. **`initializeBalance(primaryDid: string): Promise<void>`**
   - 残高レコードを初期化（1000 HEART）
   - アカウント作成時に呼び出し

3. **`transfer(params: TransferParams): Promise<ApiResponse<TransferResult>>`**
   - 送信処理のメインロジック
   - DynamoDB TransactWriteItemsを使用
   - ロールバック処理を含む
   - Weight計算: `送金量 / (残高 - 送金量 + 1)`
   - Weight評価: 5段階評価（環境変数の閾値を使用）

4. **`getTransactionHistory(params: HistoryParams): Promise<ApiResponse<TransactionHistoryData>>`**
   - 送信者で検索: PKでQuery
   - 受信者で検索: GSI10でQuery
   - ページネーション: cursor形式（timestamp#transactionId）
   - 期間検索: 開始日時と終了日時でフィルタ
   - 並び順: 降順（新しいものから）

5. **`calculateWeight(amount: number, balance: number): number`**
   - Weight計算: `送金量 / (残高 - 送金量 + 1)`

6. **`evaluateWeight(weight: number): number`**
   - Weightを5段階評価（1-5）
   - 環境変数の閾値を使用

7. **`validateTransfer(params: TransferParams): Promise<void>`**
   - バリデーション処理
   - 残高不足チェック
   - 受信者DID存在確認
   - idempotencyKey重複チェック

#### 2.2 エラーハンドリング

- `INSUFFICIENT_BALANCE`: 残高不足
- `RECIPIENT_NOT_FOUND`: 受信者DIDが存在しない
- `INVALID_AMOUNT`: 無効な送信金額
- `DUPLICATE_IDEMPOTENCY_KEY`: 重複したidempotencyKey
- `TRANSFER_FAILED`: 送信失敗

#### 2.3 DynamoDB操作の実装

- `getBalanceItem(primaryDid: string)`: 残高取得
- `createBalanceItem(primaryDid: string, balance: string)`: 残高作成
- `updateBalanceItem(primaryDid: string, newBalance: string)`: 残高更新
- `createTransactionItem(item: DynamoDBTokenTransactionItem)`: トランザクション作成
- `queryTransactionsBySender(primaryDid: string, options: QueryOptions)`: 送信者で検索
- `queryTransactionsByRecipient(recipientDid: string, options: QueryOptions)`: 受信者で検索

### Phase 3: TokenControllerの実装

#### 3.1 TokenControllerクラスの作成

**ファイル**: `src/controllers/tokens/TokenController.ts`

**エンドポイント**:

1. **`GET /tokens/balance/{did}`** (JWT認証必要)
   - `@Get('balance/{did}')`
   - `@Security('jwt')`
   - `getBalance(@Path() did: string): Promise<ApiResponse<TokenBalanceData>>`

2. **`POST /tokens/transfer`** (JWT認証必要)
   - `@Post('transfer')`
   - `@Security('jwt')`
   - `transferTokens(@Body() request: TransferTokenRequest, @Request() req: any): Promise<ApiResponse<TransferResult>>`
   - JWTから送信者のDIDを取得

3. **`GET /tokens/transactions/{did}`** (認証不要)
   - `@Get('transactions/{did}')`
   - `getTransactionHistory(@Path() did: string, @Query() query: TransactionHistoryQuery): Promise<ApiResponse<TransactionHistoryData>>`
   - 送信者で検索

4. **`GET /tokens/transactions/received/{did}`** (認証不要)
   - `@Get('transactions/received/{did}')`
   - `getReceivedTransactionHistory(@Path() did: string, @Query() query: TransactionHistoryQuery): Promise<ApiResponse<TransactionHistoryData>>`
   - 受信者で検索

#### 3.2 リクエスト/レスポンスのバリデーション

- tsoa decoratorsを使用
- `@Example()` でAPI仕様書に例を追加
- `@Response()` でエラーレスポンスを定義

#### 3.3 クエリパラメータの定義

- `TransactionHistoryQuery` インターフェース
  - `limit?`: number (デフォルト値、最大値の設定)
  - `cursor?`: string
  - `startDate?`: string (ISO 8601形式)
  - `endDate?`: string (ISO 8601形式)

### Phase 4: アカウント作成時の残高初期付与

#### 4.1 UserAuthServiceの更新

**ファイル**: `src/services/UserAuthService.ts`

- `registerWithEmailPassword` メソッドを更新
- アカウント作成成功後、`TokenService.initializeBalance` を呼び出し
- 残高初期付与に失敗した場合の処理を検討（ログ記録、後で手動付与など）

#### 4.2 エラーハンドリング

- 残高初期付与失敗時は、アカウント作成自体は成功させる
- エラーログを記録
- 管理者に通知する仕組み（将来的に実装）

### Phase 5: テスト実装

#### 5.1 ユニットテスト

**ファイル**: `tests/unit/services/TokenService.test.ts`

- `getBalance` のテスト
- `initializeBalance` のテスト
- `transfer` のテスト（成功ケース、失敗ケース）
- `getTransactionHistory` のテスト
- `calculateWeight` のテスト
- `evaluateWeight` のテスト
- エラーハンドリングのテスト

#### 5.2 コントローラーテスト

**ファイル**: `tests/unit/controllers/TokenController.test.ts`

- 各エンドポイントのテスト
- 認証のテスト
- バリデーションのテスト

#### 5.3 統合テスト

**ファイル**: `tests/integration/tokens.test.ts`

- 実際のDynamoDBを使用したテスト（開発環境）
- 送信フローの統合テスト
- ページネーションのテスト

### Phase 6: 統合とデプロイ

#### 6.1 コードレビュー

- TypeScript型チェック
- ESLintチェック
- テストカバレッジ確認（80%以上）

#### 6.2 ドキュメント更新

- API仕様書の自動生成（tsoa）
- READMEの更新（必要に応じて）

#### 6.3 デプロイ準備

- 環境変数の確認
- serverless.ymlの確認（既に追加済み）
- DynamoDBテーブルのGSI確認（GSI9-12が利用可能か）

#### 6.4 デプロイと動作確認

- 開発環境へのデプロイ
- 各エンドポイントの動作確認
- エラーハンドリングの確認

## 📝 実装の詳細仕様

### データモデル詳細

#### TokenBalance

```typescript
interface DynamoDBTokenBalanceItem {
  PK: string; // TOKEN_BALANCE#{primaryDid}
  SK: string; // BALANCE
  primaryDid: string;
  balance: string; // 小数点以下8桁
  balanceDecimal: number;
  updatedAt: string;
  createdAt: string;
  GSI9PK?: string; // TOKEN_BALANCE#ALL
  GSI9SK?: string; // {balanceDecimal}#{primaryDid}
}
```

#### TokenTransaction

```typescript
interface DynamoDBTokenTransactionItem {
  PK: string; // TOKEN_TX#{primaryDid}
  SK: string; // TX#{timestamp}#{transactionId}
  transactionId: string;
  primaryDid: string;
  recipientDid: string;
  amount: string;
  amountDecimal: number;
  taxAmount?: string;
  taxAmountDecimal?: number;
  taxRate?: number;
  netAmount: string;
  netAmountDecimal: number;
  weight?: number;
  weightLevel?: number; // 1-5
  message: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  idempotencyKey?: string;
  senderAddress?: string;
  receiverAddress?: string;
  blockchainRegistration?: boolean;
  indicator1?: string;
  indicator2?: string;
  indicator3?: string;
  indicator4?: string;
  indicator5?: string;
  indicator6?: string;
  GSI10PK?: string; // TOKEN_TX#RECIPIENT#{recipientDid}
  GSI10SK?: string; // TX#{timestamp}#{transactionId}
  GSI11PK?: string; // TOKEN_TX#ALL
  GSI11SK?: string; // TX#{timestamp}#{transactionId}
  GSI12PK?: string; // TOKEN_TX#STATUS#{status}
  GSI12SK?: string; // TX#{timestamp}#{transactionId}
}
```

### 送信処理フロー

1. **バリデーション**
   - 送信者DIDの存在確認
   - 受信者DIDの存在確認
   - 送信金額の妥当性チェック
   - idempotencyKeyの重複チェック

2. **残高確認**
   - 送信者の残高を取得
   - 残高 >= 送信金額 + 手数料 を確認

3. **Weight計算**
   - `weight = amount / (balance - amount + 1)`
   - Weight評価: 5段階評価（1-5）

4. **DynamoDB TransactWriteItems**
   - 送信履歴レコードを作成（status: pending）
   - 送信者の残高を減算
   - 受信者の残高を加算（存在しない場合は作成）

5. **成功時**
   - 送信履歴のstatusをcompletedに更新
   - 完了日時を記録

6. **失敗時**
   - ロールバック（TransactWriteItemsが自動的にロールバック）
   - エラーメッセージを記録

### ページネーション実装

- **cursor形式**: `{timestamp}#{transactionId}`
- **limit**: デフォルト値と最大値の設定（例: デフォルト20、最大100）
- **hasMore**: 次のページがあるかどうか

### 期間検索実装

- **開始日時**: ISO 8601形式（例: `2024-01-01T00:00:00Z`）
- **終了日時**: ISO 8601形式
- **タイムゾーン**: UTCで統一
- **フィルタ**: SK（timestamp部分）で範囲検索

## 🔧 技術的な考慮事項

### DynamoDB TransactWriteItems

- 最大25アイテムまで
- 送信処理では3アイテム（送信履歴、送信者残高、受信者残高）
- アトミック性を保証

### 残高の精度管理

- 文字列で保存（`balance: string`）
- 数値計算用に `balanceDecimal: number` も保存
- フォーマット: `toFixed(8)` で小数点以下8桁に統一

### Weight評価の実装

```typescript
const evaluateWeight = (weight: number): number => {
  const threshold1 = parseFloat(process.env.WEIGHT_THRESHOLD_1 || '0.2');
  const threshold2 = parseFloat(process.env.WEIGHT_THRESHOLD_2 || '0.4');
  const threshold3 = parseFloat(process.env.WEIGHT_THRESHOLD_3 || '0.6');
  const threshold4 = parseFloat(process.env.WEIGHT_THRESHOLD_4 || '0.8');

  if (weight < threshold1) return 1;
  if (weight < threshold2) return 2;
  if (weight < threshold3) return 3;
  if (weight < threshold4) return 4;
  return 5;
};
```

### エラーハンドリング

- すべてのエラーケースでロールバック
- エラーメッセージをトランザクションレコードに保存
- 適切なHTTPステータスコードを返す

## 📋 実装チェックリスト

### Phase 1: データモデルと型定義

- [ ] `DynamoDBTokenBalanceItem` インターフェース作成
- [ ] `DynamoDBTokenTransactionItem` インターフェース作成
- [ ] リクエスト/レスポンス型定義作成
- [ ] 定数定義作成

### Phase 2: TokenServiceの実装

- [ ] `getBalance` メソッド実装
- [ ] `initializeBalance` メソッド実装
- [ ] `transfer` メソッド実装
- [ ] `getTransactionHistory` メソッド実装
- [ ] `calculateWeight` メソッド実装
- [ ] `evaluateWeight` メソッド実装
- [ ] エラーハンドリング実装

### Phase 3: TokenControllerの実装

- [ ] `GET /tokens/balance/{did}` エンドポイント実装
- [ ] `POST /tokens/transfer` エンドポイント実装
- [ ] `GET /tokens/transactions/{did}` エンドポイント実装
- [ ] `GET /tokens/transactions/received/{did}` エンドポイント実装
- [ ] tsoa decorators追加
- [ ] API仕様書の例追加

### Phase 4: アカウント作成時の残高初期付与

- [ ] `UserAuthService.registerWithEmailPassword` 更新
- [ ] エラーハンドリング実装

### Phase 5: テスト実装

- [ ] TokenServiceのユニットテスト
- [ ] TokenControllerのユニットテスト
- [ ] 統合テスト

### Phase 6: 統合とデプロイ

- [ ] コードレビュー
- [ ] ドキュメント更新
- [ ] デプロイ準備
- [ ] 動作確認

## 🚀 実装順序の推奨

1. **Phase 1**: データモデルと型定義（基盤となる型を定義）
2. **Phase 2**: TokenServiceの実装（ビジネスロジック）
3. **Phase 5**: テスト実装（TokenServiceのテスト）
4. **Phase 3**: TokenControllerの実装（API層）
5. **Phase 4**: アカウント作成時の残高初期付与（統合）
6. **Phase 6**: 統合とデプロイ（最終確認）

## 📝 注意事項

1. **既存実装との整合性**: 既存のFlow実装は残し、新しい実装は `/tokens/` プレフィックスで分離
2. **DynamoDB GSI**: GSI9-12が利用可能か確認（必要に応じて追加）
3. **環境変数**: デプロイ前に環境変数が正しく設定されているか確認
4. **テストカバレッジ**: 80%以上のカバレッジを維持
5. **エラーハンドリング**: すべてのエラーケースを適切に処理
6. **パフォーマンス**: DynamoDBのクエリを最適化（GSIの活用）

## 🔍 実装前の確認事項

- [ ] DynamoDBテーブルのGSI9-12が利用可能か確認
- [ ] 環境変数が正しく設定されているか確認
- [ ] 既存のコードベースの構造を理解
- [ ] テスト環境の準備
