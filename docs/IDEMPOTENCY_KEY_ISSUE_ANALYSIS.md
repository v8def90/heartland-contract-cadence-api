# IdempotencyKey重複チェック問題の分析

## 問題の概要

`/tokens/transfer`エンドポイントで、同じ`idempotencyKey`を使用して2回送金した場合、重複チェックが機能せず、両方の送金が成功してしまう問題が発生しています。

## 原因分析

### 1. DynamoDB GSIの最終一貫性（Eventual Consistency）

**現在の実装**:

- `getTransactionByIdempotencyKey`メソッドがGSI11を使用してidempotencyKeyを検索
- GSI11PK = 'TOKEN_TX#ALL'で全トランザクションをクエリ
- FilterExpressionでidempotencyKeyをフィルタリング

**問題点**:

- DynamoDBのGSIは**最終一貫性（eventually consistent）**のため、書き込み直後にクエリしても反映されない可能性がある
- 反映には通常数秒かかる場合がある
- テストでは1回目の送金完了直後（数ミリ秒後）に2回目の送金を実行しているため、GSI11にまだ反映されていない

### 2. タイミングの問題

**現在のフロー**:

```
1. validateTransfer() → getTransactionByIdempotencyKey() → GSI11でクエリ
2. 重複なしと判断
3. TransactWriteItemsでトランザクション作成
4. 1回目の送金完了
5. （数ミリ秒後）2回目の送金リクエスト
6. validateTransfer() → getTransactionByIdempotencyKey() → GSI11でクエリ
7. まだGSI11に反映されていないため、重複なしと判断
8. TransactWriteItemsでトランザクション作成
9. 2回目の送金も成功（重複エラーにならない）
```

**問題**:

- validateTransferとTransactWriteItemsの間に時間差がある
- この間に別のリクエストが同じidempotencyKeyで送金できる
- GSI11の最終一貫性により、1回目の送金がGSI11に反映される前に2回目の検証が実行される

### 3. 実装の詳細

**現在のコード** (`src/services/TokenService.ts`):

```typescript
private async getTransactionByIdempotencyKey(
  idempotencyKey: string
): Promise<DynamoDBTokenTransactionItem | null> {
  const command = new QueryCommand({
    TableName: this.tableName,
    IndexName: 'GSI11',  // ← GSIは最終一貫性
    KeyConditionExpression: 'GSI11PK = :pk',
    FilterExpression: 'idempotencyKey = :key',  // ← FilterExpressionは効率的でない
    ExpressionAttributeValues: {
      ':pk': 'TOKEN_TX#ALL',
      ':key': idempotencyKey,
    },
    Limit: 1,
  });
  // ...
}
```

**問題点**:

- GSI11は最終一貫性のため、書き込み直後にクエリしても反映されない
- FilterExpressionは効率的でない（全アイテムをスキャンしてからフィルタリング）
- QueryCommandにConsistentReadオプションは使用できない（GSIでは使用不可）

## 解決策の検討

### オプション1: メインテーブルでScan（非推奨）

**方法**: メインテーブルで全トランザクションをScanしてFilterExpressionでidempotencyKeyを検索

**問題点**:

- 非効率（全テーブルをスキャン）
- コストが高い
- スケーラビリティの問題

### オプション2: idempotencyKey専用のGSIを作成（推奨）

**方法**: idempotencyKeyをPKとする専用のGSIを作成

**問題点**:

- 新しいGSIが必要（GSI13）
- 送信者ごとの重複チェックが必要な場合、送信者DID + idempotencyKeyの組み合わせが必要

### オプション3: 専用レコードでConditionExpressionを使用（最推奨）

**方法**: 送信者DID + idempotencyKeyの組み合わせで専用レコードを作成し、TransactWriteItemsの最初の操作として存在チェック

**メリット**:

- アトミックに重複を防げる
- 最終一貫性の問題を回避
- 効率的（PKで直接アクセス）
- 追加のGSI不要

**実装**:

- PK: `IDEMPOTENCY#{senderDid}#{idempotencyKey}`
- SK: `METADATA`
- TransactWriteItemsの最初の操作として、このレコードのPutItemを追加
- ConditionExpression: `attribute_not_exists(PK)` で重複を防ぐ

## 推奨される解決策

**オプション3（専用レコード + ConditionExpression）**を推奨します。

### 実装方針

1. **idempotencyKey専用レコードの作成**:
   - PK: `IDEMPOTENCY#{senderDid}#{idempotencyKey}`
   - SK: `METADATA`
   - フィールド: `transactionId`, `createdAt`, `senderDid`, `recipientDid`, `amount`

2. **TransactWriteItemsの最初の操作として追加**:

   ```typescript
   transactionItems.push({
     Put: {
       TableName: this.tableName,
       Item: {
         PK: `IDEMPOTENCY#${params.senderDid}#${params.idempotencyKey}`,
         SK: 'METADATA',
         transactionId: transactionId,
         senderDid: params.senderDid,
         recipientDid: params.recipientDid,
         amount: params.amount,
         createdAt: now,
       },
       ConditionExpression: 'attribute_not_exists(PK)', // 重複を防ぐ
     },
   });
   ```

3. **validateTransferからidempotencyKeyチェックを削除**:
   - TransactWriteItemsのConditionExpressionで確実にチェックできるため

### メリット

- ✅ アトミックに重複を防げる
- ✅ 最終一貫性の問題を回避
- ✅ 効率的（PKで直接アクセス）
- ✅ 追加のGSI不要
- ✅ 送信者ごとの重複チェックが可能

### 注意点

- idempotencyKeyレコードは永続的に残る（削除しない）
- TTLを設定して自動削除することも可能（推奨: 7日間など）
- 同じidempotencyKeyで異なる送信者が送金する場合は、別レコードとして作成される（これは正しい動作）
