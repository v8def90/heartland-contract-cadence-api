import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  ScanCommand,
  QueryCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  DynamoDBNonceItem,
  NonceStats,
  NonceGenerationRequest,
  NonceValidationRequest,
  NonceUsageRequest,
} from '../models/flow/NonceItem';

/**
 * DynamoDB nonce管理サービス
 * 既存のSnsTableを使用してnonceの永続化を実現
 */
export class NonceService {
  private client: DynamoDBDocumentClient | null;
  private tableName: string;
  private nonceExpiry: number;
  private timestampTolerance: number;

  constructor() {
    this.client = null;
    this.tableName = process.env.SNS_TABLE_NAME || 'sns-table-dev';
    this.nonceExpiry = 5 * 60 * 1000; // 5分
    this.timestampTolerance = 2 * 60 * 1000; // 2分
  }

  /**
   * DynamoDBクライアントを初期化
   */
  private initializeClient(): void {
    if (this.client) return;

    if (
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'development'
    ) {
      // テスト・開発環境ではモッククライアントを使用
      this.client = null;
      return;
    }

    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  /**
   * nonceを生成してDynamoDBに保存
   */
  async generateNonce(request?: NonceGenerationRequest): Promise<string> {
    const expiryMs = request?.expiryMs || this.nonceExpiry;
    const nonce = this.generateRandomNonce();
    const timestamp = Date.now();
    const expiresAt = timestamp + expiryMs;
    const createdAt = new Date().toISOString();
    const ttl = Math.floor(expiresAt / 1000) + 86400; // 24時間後にTTLで削除

    const nonceItem: DynamoDBNonceItem = {
      PK: `NONCE#${nonce}`,
      SK: 'META',
      GSI1PK: `NONCE_STATUS#active`,
      GSI1SK: `NONCE#${nonce}`,
      GSI2PK: 'NONCE_CLEANUP',
      GSI2SK: expiresAt.toString(),
      nonce,
      status: 'active',
      timestamp,
      expiresAt,
      createdAt,
      ttl,
    };

    // テスト環境ではメモリに保存
    if (!this.client) {
      this.storeInMemory(nonceItem);
      return nonce;
    }

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(nonceItem),
          ConditionExpression:
            'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        })
      );

      console.log(`Nonce generated and stored: ${nonce}`);
      return nonce;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        // nonceの重複（非常に稀）
        console.warn(`Nonce collision detected: ${nonce}, retrying...`);
        return this.generateNonce(request);
      }
      console.error('Failed to store nonce:', error);
      throw new Error('Failed to generate nonce');
    }
  }

  /**
   * nonceの有効性を検証
   */
  async validateNonce(request: NonceValidationRequest): Promise<boolean> {
    const { nonce, currentTimestamp } = request;

    // テスト環境ではメモリから検証
    if (!this.client) {
      return this.validateFromMemory(nonce, currentTimestamp);
    }

    try {
      const result = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `NONCE#${nonce}`,
            SK: 'META',
          }),
        })
      );

      if (!result.Item) {
        console.log(`Nonce not found: ${nonce}`);
        return false;
      }

      const nonceItem = unmarshall(result.Item) as DynamoDBNonceItem;

      // ステータスチェック
      if (nonceItem.status !== 'active') {
        console.log(
          `Nonce already used or expired: ${nonce}, status: ${nonceItem.status}`
        );
        return false;
      }

      // 期限チェック
      if (currentTimestamp > nonceItem.expiresAt) {
        console.log(
          `Nonce expired: ${nonce}, expiresAt: ${nonceItem.expiresAt}, current: ${currentTimestamp}`
        );
        // 期限切れとしてマーク
        await this.markNonceAsExpired(nonce);
        return false;
      }

      // タイムスタンプ許容範囲チェック
      const timeDiff = Math.abs(currentTimestamp - nonceItem.timestamp);
      if (timeDiff > this.timestampTolerance) {
        console.log(
          `Nonce timestamp out of tolerance: ${nonce}, diff: ${timeDiff}ms`
        );
        return false;
      }

      console.log(`Nonce validated successfully: ${nonce}`);
      return true;
    } catch (error) {
      console.error('Failed to validate nonce:', error);
      return false;
    }
  }

  /**
   * nonceを使用済みとしてマーク
   */
  async markNonceAsUsed(request: NonceUsageRequest): Promise<void> {
    const { nonce, usedAt } = request;

    // テスト環境ではメモリを更新
    if (!this.client) {
      this.markUsedInMemory(nonce, usedAt);
      return;
    }

    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `NONCE#${nonce}`,
            SK: 'META',
          }),
          UpdateExpression:
            'SET #status = :status, usedAt = :usedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: marshall({
            ':status': 'used',
            ':usedAt': usedAt,
            ':gsi1pk': `NONCE_STATUS#used`,
            ':gsi1sk': `NONCE#${nonce}`,
            ':activeStatus': 'active',
          }),
          ConditionExpression:
            'attribute_exists(PK) AND #status = :activeStatus',
        })
      );

      console.log(`Nonce marked as used: ${nonce}`);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        console.warn(`Nonce already used or not found: ${nonce}`);
        return;
      }
      console.error('Failed to mark nonce as used:', error);
      throw new Error('Failed to mark nonce as used');
    }
  }

  /**
   * 期限切れnonceをクリーンアップ
   */
  async cleanupExpiredNonces(): Promise<void> {
    const currentTime = Date.now();

    // テスト環境ではメモリからクリーンアップ
    if (!this.client) {
      this.cleanupFromMemory(currentTime);
      return;
    }

    try {
      // 期限切れnonceを検索
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :gsi2pk AND GSI2SK < :currentTime',
          ExpressionAttributeValues: marshall({
            ':gsi2pk': 'NONCE_CLEANUP',
            ':currentTime': currentTime.toString(),
          }),
        })
      );

      if (!result.Items || result.Items.length === 0) {
        console.log('No expired nonces found');
        return;
      }

      // 期限切れnonceを一括更新
      const expiredNonces = result.Items.map(item => {
        const nonceItem = unmarshall(item) as DynamoDBNonceItem;
        return {
          PK: nonceItem.PK,
          SK: nonceItem.SK,
        };
      });

      for (const nonceKey of expiredNonces) {
        try {
          await this.client!.send(
            new UpdateItemCommand({
              TableName: this.tableName,
              Key: marshall(nonceKey),
              UpdateExpression:
                'SET #status = :status, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: marshall({
                ':status': 'expired',
                ':gsi1pk': `NONCE_STATUS#expired`,
                ':gsi1sk': nonceKey.PK,
              }),
            })
          );
        } catch (error) {
          console.error(
            `Failed to mark nonce as expired: ${nonceKey.PK}`,
            error
          );
        }
      }

      console.log(`Cleaned up ${expiredNonces.length} expired nonces`);
    } catch (error) {
      console.error('Failed to cleanup expired nonces:', error);
      throw new Error('Failed to cleanup expired nonces');
    }
  }

  /**
   * nonce統計情報を取得
   */
  async getNonceStats(): Promise<NonceStats> {
    // テスト環境ではメモリから統計を取得
    if (!this.client) {
      return this.getStatsFromMemory();
    }

    try {
      const stats: NonceStats = {
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
      };

      // 各ステータスのnonce数をカウント
      const statuses = ['active', 'used', 'expired'];
      for (const status of statuses) {
        const result = await this.client.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: marshall({
              ':gsi1pk': `NONCE_STATUS#${status}`,
            }),
            Select: 'COUNT',
          })
        );

        const count = result.Count || 0;
        stats.total += count;
        stats[status as keyof Omit<NonceStats, 'total'>] = count;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get nonce stats:', error);
      return {
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
      };
    }
  }

  /**
   * ランダムなnonceを生成
   */
  private generateRandomNonce(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 期限切れnonceを期限切れとしてマーク
   */
  private async markNonceAsExpired(nonce: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: marshall({
            PK: `NONCE#${nonce}`,
            SK: 'META',
          }),
          UpdateExpression:
            'SET #status = :status, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: marshall({
            ':status': 'expired',
            ':gsi1pk': `NONCE_STATUS#expired`,
            ':gsi1sk': `NONCE#${nonce}`,
          }),
        })
      );
    } catch (error) {
      console.error(`Failed to mark nonce as expired: ${nonce}`, error);
    }
  }

  // テスト・開発環境用のメモリ操作メソッド
  private memoryStore: Map<string, DynamoDBNonceItem> = new Map();

  private storeInMemory(nonceItem: DynamoDBNonceItem): void {
    this.memoryStore.set(nonceItem.nonce, nonceItem);
  }

  private validateFromMemory(nonce: string, currentTimestamp: number): boolean {
    const nonceItem = this.memoryStore.get(nonce);
    if (!nonceItem) return false;
    if (nonceItem.status !== 'active') return false;
    if (currentTimestamp > nonceItem.expiresAt) return false;
    const timeDiff = Math.abs(currentTimestamp - nonceItem.timestamp);
    return timeDiff <= this.timestampTolerance;
  }

  private markUsedInMemory(nonce: string, usedAt: number): void {
    const nonceItem = this.memoryStore.get(nonce);
    if (nonceItem) {
      nonceItem.status = 'used';
      nonceItem.usedAt = usedAt;
      nonceItem.GSI1PK = 'NONCE_STATUS#used';
      nonceItem.GSI1SK = `NONCE#${nonce}`;
    }
  }

  private cleanupFromMemory(currentTime: number): void {
    for (const [nonce, nonceItem] of this.memoryStore.entries()) {
      if (currentTime > nonceItem.expiresAt && nonceItem.status === 'active') {
        nonceItem.status = 'expired';
        nonceItem.GSI1PK = 'NONCE_STATUS#expired';
        nonceItem.GSI1SK = `NONCE#${nonce}`;
      }
    }
  }

  private getStatsFromMemory(): NonceStats {
    const stats: NonceStats = {
      total: 0,
      active: 0,
      used: 0,
      expired: 0,
    };

    for (const nonceItem of this.memoryStore.values()) {
      stats.total++;
      stats[nonceItem.status as keyof Omit<NonceStats, 'total'>]++;
    }

    return stats;
  }
}
