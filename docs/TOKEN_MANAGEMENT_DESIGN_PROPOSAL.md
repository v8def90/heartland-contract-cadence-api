# Token管理設計 - ベストプラクティス提案

## 📋 概要

Flow/Cadenceを使わない実装として、HEARTトークンの送信履歴と残高をDynamoDBで管理する設計を提案します。

## 🎯 設計目標

1. **送信履歴の永続化**: すべてのトークン送信履歴をDynamoDBに保存
2. **残高管理**: primaryDidごとの残高をDynamoDBで管理
3. **整合性保証**: 送信履歴と残高の更新をアトミックに実行
4. **パフォーマンス**: 高速な残高取得と履歴検索
5. **スケーラビリティ**: 大量の送信履歴に対応

## 📊 データモデル設計

### 1. トークン残高レコード (TokenBalance)

```typescript
interface DynamoDBTokenBalanceItem {
  PK: string; // TOKEN_BALANCE#{primaryDid}
  SK: string; // BALANCE
  primaryDid: string; // did:plc:...
  balance: string; // 残高（文字列で保存、精度保持のため、小数点以下8桁）
  balanceDecimal: number; // 残高（数値、検索・計算用）
  updatedAt: string; // 最終更新日時
  createdAt: string; // 作成日時
  // GSI keys for queries
  GSI9PK?: string; // TOKEN_BALANCE#ALL (全残高取得用)
  GSI9SK?: string; // {balanceDecimal}#{primaryDid} (残高順ソート用)
}
```

**設計理由**:

- `PK: TOKEN_BALANCE#{primaryDid}` で残高を高速取得
- `balance` は文字列で保存（JavaScriptの数値精度問題を回避）
- `balanceDecimal` は数値で保存（検索・ソート用）
- GSI9で残高順ソートが可能

### 2. トークン送信履歴レコード (TokenTransaction)

```typescript
interface DynamoDBTokenTransactionItem {
  PK: string; // TOKEN_TX#{primaryDid}
  SK: string; // TX#{timestamp}#{transactionId}
  transactionId: string; // 一意のトランザクションID（UUID）
  primaryDid: string; // 送信者のDID
  recipientDid: string; // 受信者のDID
  amount: string; // 送信金額（文字列）
  amountDecimal: number; // 送信金額（数値）
  taxAmount?: string; // 手数料（文字列）
  taxAmountDecimal?: number; // 手数料（数値）
  taxRate?: number; // 税率（パーセンテージ）
  netAmount: string; // 実送金額（amount - taxAmount）
  netAmountDecimal: number; // 実送金額（数値）
  weight?: number; // Weight値（送金量 / (残高 - 送金量 + 1)）- 5段階評価用
  message: string; // メッセージ（必須項目）
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  memo?: string; // メモ/説明
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  completedAt?: string; // 完了日時
  failedAt?: string; // 失敗日時
  errorMessage?: string; // エラーメッセージ
  idempotencyKey?: string; // 二重送信防止用
  // 既存データとの互換性のためのフィールド（将来的な移行用）
  senderAddress?: string; // Flow wallet address（将来対応、現時点では空欄）
  receiverAddress?: string; // Flow wallet address（将来対応、現時点では空欄）
  blockchainRegistration?: boolean; // ブロックチェーン登録状況（将来対応）
  indicator1?: string; // Indicator 1（補助項目、将来対応）
  indicator2?: string; // Indicator 2（補助項目、将来対応）
  indicator3?: string; // Indicator 3（補助項目、将来対応）
  indicator4?: string; // Indicator 4（補助項目、将来対応）
  indicator5?: string; // Indicator 5（補助項目、将来対応）
  indicator6?: string; // Indicator 6（補助項目、将来対応）
  // GSI keys for queries
  GSI10PK?: string; // TOKEN_TX#RECIPIENT#{recipientDid}
  GSI10SK?: string; // TX#{timestamp}#{transactionId}
  GSI11PK?: string; // TOKEN_TX#ALL
  GSI11SK?: string; // TX#{timestamp}#{transactionId}
  GSI12PK?: string; // TOKEN_TX#STATUS#{status}
  GSI12SK?: string; // TX#{timestamp}#{transactionId}
}
```

**設計理由**:

- `PK: TOKEN_TX#{primaryDid}` で送信者の履歴を高速取得
- `SK: TX#{timestamp}#{transactionId}` で時系列順にソート
- GSI10で受信者の履歴を取得可能
- GSI11で全履歴を取得可能
- GSI12でステータス別に検索可能
- `idempotencyKey` で二重送信を防止

## 🔄 トランザクション処理フロー

### 送信処理（Transfer）

```
1. リクエスト受信
   ↓
2. バリデーション
   - 送信者DIDの存在確認
   - 受信者DIDの存在確認
   - 送信金額の妥当性チェック
   - idempotencyKeyの重複チェック
   ↓
3. 残高確認
   - 送信者の残高を取得
   - 残高 >= 送信金額 + 手数料 を確認
   ↓
4. DynamoDB TransactWriteItems でアトミック更新
   - 送信履歴レコードを作成（status: pending）
   - 送信者の残高を減算
   - 受信者の残高を加算（存在しない場合は作成）
   ↓
5. 成功時
   - 送信履歴のstatusをcompletedに更新
   - 完了日時を記録
   ↓
6. 失敗時
   - 送信履歴のstatusをfailedに更新
   - エラーメッセージを記録
   - ロールバック（必要に応じて）
```

### 残高取得（GetBalance）

```
1. PK: TOKEN_BALANCE#{primaryDid}, SK: BALANCE で取得
   ↓
2. レコードが存在しない場合、残高0を返す
   ↓
3. レコードが存在する場合、balanceを返す
```

### 送信履歴取得（GetTransactionHistory）

```
1. PK: TOKEN_TX#{primaryDid} でQuery
   ↓
2. SKで時系列順にソート（降順）
   ↓
3. limitとcursorでページネーション
   ↓
4. フィルタリング（status、期間、金額範囲など）
```

## 🛡️ 整合性保証

### DynamoDB TransactWriteItems を使用

```typescript
// 送信処理の例
const transaction = {
  TransactItems: [
    // 1. 送信履歴を作成
    {
      Put: {
        TableName: tableName,
        Item: {
          PK: `TOKEN_TX#${senderDid}`,
          SK: `TX#${timestamp}#${transactionId}`,
          transactionId,
          primaryDid: senderDid,
          recipientDid: recipientDid,
          amount: amount.toString(),
          amountDecimal: parseFloat(amount),
          status: 'pending',
          createdAt: new Date().toISOString(),
          // ... その他のフィールド
        },
        ConditionExpression:
          'attribute_not_exists(PK) OR attribute_not_exists(SK)',
      },
    },
    // 2. 送信者の残高を減算
    {
      Update: {
        TableName: tableName,
        Key: {
          PK: `TOKEN_BALANCE#${senderDid}`,
          SK: 'BALANCE',
        },
        UpdateExpression:
          'SET balance = balance - :amount, balanceDecimal = balanceDecimal - :amountDecimal, updatedAt = :updatedAt',
        ConditionExpression: 'balanceDecimal >= :amountDecimal',
        ExpressionAttributeValues: {
          ':amount': amount.toString(),
          ':amountDecimal': parseFloat(amount),
          ':updatedAt': new Date().toISOString(),
        },
      },
    },
    // 3. 受信者の残高を加算（存在しない場合は作成）
    {
      Update: {
        TableName: tableName,
        Key: {
          PK: `TOKEN_BALANCE#${recipientDid}`,
          SK: 'BALANCE',
        },
        UpdateExpression:
          'SET balance = if_not_exists(balance, :zero) + :amount, balanceDecimal = if_not_exists(balanceDecimal, :zeroDecimal) + :amountDecimal, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt), primaryDid = :primaryDid',
        ExpressionAttributeValues: {
          ':zero': '0',
          ':zeroDecimal': 0,
          ':amount': netAmount.toString(),
          ':amountDecimal': parseFloat(netAmount),
          ':updatedAt': new Date().toISOString(),
          ':createdAt': new Date().toISOString(),
          ':primaryDid': recipientDid,
        },
      },
    },
  ],
};

await dynamoDBClient.send(new TransactWriteCommand(transaction));
```

**利点**:

- すべての操作がアトミックに実行される
- 一部の操作が失敗した場合、すべてロールバックされる
- 整合性が保証される

## 📈 パフォーマンス最適化

### 1. 残高のキャッシュ

```typescript
// RedisまたはElastiCacheを使用
const cacheKey = `token_balance:${primaryDid}`;
const cachedBalance = await redis.get(cacheKey);

if (cachedBalance) {
  return JSON.parse(cachedBalance);
}

// キャッシュがない場合、DynamoDBから取得
const balance = await getBalanceFromDynamoDB(primaryDid);

// キャッシュに保存（TTL: 5分）
await redis.setex(cacheKey, 300, JSON.stringify(balance));

return balance;
```

### 2. 履歴のページネーション

```typescript
// Cursor-based pagination
const getTransactionHistory = async (
  primaryDid: string,
  limit: number = 20,
  cursor?: string
) => {
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `TOKEN_TX#${primaryDid}`,
    },
    ScanIndexForward: false, // 降順
    Limit: limit,
  };

  if (cursor) {
    queryParams.ExclusiveStartKey = decodeCursor(cursor);
  }

  const result = await dynamoDBClient.send(new QueryCommand(queryParams));

  return {
    items: result.Items || [],
    nextCursor: result.LastEvaluatedKey
      ? encodeCursor(result.LastEvaluatedKey)
      : undefined,
    hasMore: !!result.LastEvaluatedKey,
  };
};
```

## 🔒 セキュリティ考慮事項

### 1. 二重送信の防止

```typescript
// idempotencyKeyを使用
const idempotencyKey = request.idempotencyKey || generateUUID();

// 既存のトランザクションをチェック
const existingTx = await getTransactionByIdempotencyKey(idempotencyKey);

if (existingTx) {
  return {
    success: true,
    data: existingTx, // 既存のトランザクションを返す
  };
}

// 新しいトランザクションを作成
const transaction = await createTransaction({
  ...request,
  idempotencyKey,
});
```

### 2. 送信制限

```typescript
// 1回あたりの最大送信額
const MAX_SINGLE_TRANSFER = 1000000; // 1,000,000 HEART

// 1日あたりの最大送信額
const MAX_DAILY_TRANSFER = 10000000; // 10,000,000 HEART

// 送信制限のチェック
const checkTransferLimits = async (primaryDid: string, amount: number) => {
  // 1回あたりの制限
  if (amount > MAX_SINGLE_TRANSFER) {
    throw new Error('Transfer amount exceeds maximum single transfer limit');
  }

  // 1日あたりの制限
  const today = new Date().toISOString().split('T')[0];
  const dailyTotal = await getDailyTransferTotal(primaryDid, today);

  if (dailyTotal + amount > MAX_DAILY_TRANSFER) {
    throw new Error('Transfer amount exceeds maximum daily transfer limit');
  }
};
```

## 📝 実装ステップ

### Phase 1: データモデルとサービス層

1. `DynamoDBTokenBalanceItem` インターフェースを定義
2. `DynamoDBTokenTransactionItem` インターフェースを定義
3. `TokenService` クラスを作成
   - `getBalance(primaryDid)`: 残高取得
   - `transfer(senderDid, recipientDid, amount)`: 送信処理
   - `getTransactionHistory(primaryDid, options)`: 履歴取得

### Phase 2: コントローラー層

1. `TokenController` を作成
   - `GET /tokens/balance/{did}`: 残高取得
   - `POST /tokens/transfer`: 送信処理
   - `GET /tokens/transactions/{did}`: 履歴取得（送信者で検索）
   - `GET /tokens/transactions/received/{did}`: 履歴取得（受信者で検索）

### Phase 3: 統合とテスト

1. 既存のFlow実装との統合（必要に応じて）
2. ユニットテスト
3. 統合テスト
4. パフォーマンステスト

## ✅ 確認済み要件

### 1. 既存実装との関係

- ✅ 既存実装は残して別実装
- ✅ 既存のトランザクション履歴との整合性は今は不要

### 2. 送信履歴の要件

- ✅ 既存データのフィールド構造を把握（将来的な移行を考慮）
- ✅ 履歴の保持期間: 無期限
- ✅ 検索要件: 送信者or受信者、期間

### 3. 残高管理の要件

- ✅ 更新タイミング: 即座（同期）
- ✅ 残高の初期値: 1000 HEART
- ✅ 残高のマイナス許容: 禁止

### 4. トランザクション管理

- ✅ 二重送信の防止: idempotency key

### 5. その他

- ✅ 送信時の手数料: 税率パラメータ（初期値0%）
- ✅ Weight計算式: 送金量 / (残高 - 送金量)

## ❓ 追加確認事項

### 1. Weight計算式について

- ✅ Weightの計算式: `送金量 / (残高 - 送金量 + 1)`
- ✅ Weightの用途: 送金を5段階評価するために使用
- ✅ 分母が0になる問題は解決（+1を追加）
- ✅ 評価閾値: .envで設定可能（`WEIGHT_THRESHOLD_1` ~ `WEIGHT_THRESHOLD_4`）
- ✅ 評価結果: トランザクションレコードに保存（評価レベル: 1-5）

### 2. 送信失敗のケース

- ✅ 送信失敗時はそれぞれの場合でロールバック
  - 残高不足: ロールバック
  - 受信者のDIDが存在しない場合: ロールバック
  - 受信者の残高レコードが存在しない場合: 新規作成で対応（失敗時はロールバック）
  - DynamoDBの書き込みエラー: ロールバック
  - その他のエラー: ロールバック

### 3. 既存データのフィールド詳細

- ✅ Sender Address / Receiver Address: 将来Flow walletなどのアドレスを入れるフィールド（現時点では空欄）
- ✅ Sender User / Receiver User: primaryDidで管理
- ✅ Indicator 1-6: 補助項目としてフィールドのみ準備（将来対応）
- ✅ Blockchain Registration: 将来対応のためフィールドのみ準備
- ✅ Message: 必須項目として追加

### 4. 税率の管理

- ✅ 税率は.envで定義（環境変数）
- ✅ 環境変数名: `TAX_RATE`
- ✅ 初期値: 0%

### 5. 残高の初期付与タイミング

- ✅ アカウント作成時（/auth/register）に1000 HEARTを付与

### 6. 送信履歴の検索詳細

- ✅ 検索パターン: 送信者で検索、受信者で検索の2パターン
- ✅ ページネーション: cursor形式（timestamp#transactionId）、limit値
- ✅ 期間検索: 開始日時と終了日時の両方を指定可能

### 7. 既存データの移行

- **質問**: 既存データの移行について
  - 移行のタイミングはいつ頃を想定していますか？
  - 移行は一括で行いますか、段階的に行いますか？
  - 移行中の整合性はどう保証しますか？

### 8. エンドポイント設計

- ✅ エンドポイントの先頭に `/tokens/` を付与
  - `GET /tokens/balance/{did}`: 残高取得（JWT認証必要）
  - `POST /tokens/transfer`: 送信処理（JWT認証必要）
  - `GET /tokens/transactions/{did}`: 履歴取得（送信者で検索、認証不要）
  - `GET /tokens/transactions/received/{did}`: 履歴取得（受信者で検索、認証不要）

### 9. 残高の精度

- ✅ **推奨設定: 小数点以下8桁**（現状のContractと併せて）
- ✅ 文字列で保存し、精度を保持
- ✅ 実装時には、精度を定数として定義（`TOKEN_DECIMAL_PRECISION = 8`）
- ✅ 既存実装では `FLOW_CONSTANTS.HEART_DECIMALS: 8` が定義されているため、同様の設計を推奨
- ✅ **残高精度の変更可能性**:
  - 文字列で保存しているため、理論的には後から変更可能
  - ただし、既存データとの整合性を保つ必要がある
  - 小数点以下の桁数を変更する場合、既存データの変換が必要になる可能性がある

### 10. 手数料の処理

- ✅ 手数料処理は将来実装
- ✅ 現時点では税率パラメータのみ準備（初期値0%）

### 11. トランザクション履歴の並び順

- ✅ デフォルト: 新しいものから（降順）
- ✅ 並び順の変更は不要（固定で降順）

## 🎯 推奨事項

### 1. 残高の更新タイミング

**要件**: 即座（同期）更新

- DynamoDB TransactWriteItems を使用して整合性を保証
- レスポンス時間は許容範囲内（通常 < 100ms）
- 残高のマイナスは禁止（ConditionExpressionでチェック）

### 2. 残高の初期値

**要件**: 1000 HEART

- 新規ユーザーの残高は1000 HEARTから開始
- 初期付与のタイミングは要確認（アカウント作成時、初回ログイン時など）

### 3. 二重送信の防止

**推奨**: idempotencyKeyを使用

- クライアントがidempotencyKeyを提供
- サーバー側で重複チェック

### 4. 履歴の保持期間

**要件**: 無期限

- すべてのトランザクション履歴を永続化
- 将来的な既存データ移行を考慮した設計

### 5. パフォーマンス最適化

**推奨**: Redis/ElastiCacheで残高をキャッシュ

- 残高取得の頻度が高い場合
- TTL: 5分程度

## 📚 参考実装パターン

### AWS DynamoDB Best Practices

- [DynamoDB Transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html)
- [DynamoDB Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [DynamoDB Conditional Writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html)

### Idempotency Pattern

- [Idempotency Keys](https://stripe.com/docs/api/idempotent_requests)
- [AWS Lambda Idempotency](https://docs.aws.amazon.com/lambda/latest/dg/lambda-idempotency.html)
