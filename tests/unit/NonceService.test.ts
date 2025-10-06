/**
 * NonceService Unit Tests
 *
 * @description Unit tests for NonceService including DynamoDB operations,
 * nonce generation, validation, and cleanup functionality.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { NonceService } from '../../src/services/NonceService';
import type { NonceStats } from '../../src/models/flow/NonceItem';

// DynamoDB モック
const mockDynamoDBClient = {
  send: jest.fn(),
};

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => mockDynamoDBClient),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => mockDynamoDBClient),
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

describe('NonceService', () => {
  let service: NonceService;
  const mockTableName = 'test-sns-table';

  beforeEach(() => {
    // テスト環境を設定
    process.env.NODE_ENV = 'test';
    process.env.SNS_TABLE_NAME = mockTableName;

    service = new NonceService();
    jest.clearAllMocks();
  });

  describe('generateNonce', () => {
    test('正常フロー: nonce生成成功（テスト環境）', async () => {
      const nonce = await service.generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32);
    });

    test('正常フロー: 複数回生成で異なるnonce', async () => {
      const nonce1 = await service.generateNonce();
      const nonce2 = await service.generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBe(32);
      expect(nonce2.length).toBe(32);
    });

    test('正常フロー: カスタム有効期限', async () => {
      const customExpiry = 10 * 60 * 1000; // 10分
      const nonce = await service.generateNonce({ expiryMs: customExpiry });

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
    });
  });

  describe('validateNonce', () => {
    test('正常フロー: 有効なnonce検証成功（テスト環境）', async () => {
      const nonce = await service.generateNonce();
      const isValid = await service.validateNonce({
        nonce,
        currentTimestamp: Date.now(),
      });

      expect(isValid).toBe(true);
    });

    test('エラーケース: 存在しないnonce', async () => {
      const isValid = await service.validateNonce({
        nonce: 'non-existent-nonce',
        currentTimestamp: Date.now(),
      });

      expect(isValid).toBe(false);
    });

    test('エラーケース: 期限切れnonce', async () => {
      const nonce = await service.generateNonce();

      // 未来のタイムスタンプで検証（期限切れ）
      const futureTimestamp = Date.now() + 10 * 60 * 1000; // 10分後
      const isValid = await service.validateNonce({
        nonce,
        currentTimestamp: futureTimestamp,
      });

      expect(isValid).toBe(false);
    });

    test('エラーケース: タイムスタンプ許容範囲外', async () => {
      const nonce = await service.generateNonce();

      // 許容範囲外のタイムスタンプ（3分後）
      const invalidTimestamp = Date.now() + 3 * 60 * 1000;
      const isValid = await service.validateNonce({
        nonce,
        currentTimestamp: invalidTimestamp,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('markNonceAsUsed', () => {
    test('正常フロー: nonce使用マーク成功（テスト環境）', async () => {
      const nonce = await service.generateNonce();
      const usedAt = Date.now();

      await expect(
        service.markNonceAsUsed({ nonce, usedAt })
      ).resolves.not.toThrow();
    });

    test('エラーケース: 存在しないnonce', async () => {
      const usedAt = Date.now();

      await expect(
        service.markNonceAsUsed({
          nonce: 'non-existent-nonce',
          usedAt,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredNonces', () => {
    test('正常フロー: 期限切れnonceクリーンアップ（テスト環境）', async () => {
      await expect(service.cleanupExpiredNonces()).resolves.not.toThrow();
    });
  });

  describe('getNonceStats', () => {
    test('正常フロー: nonce統計取得成功（テスト環境）', async () => {
      // 複数のnonceを生成
      await service.generateNonce();
      await service.generateNonce();
      await service.generateNonce();

      const stats = await service.getNonceStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.used).toBe(0);
      expect(stats.expired).toBe(0);
    });

    test('正常フロー: 空の統計', async () => {
      const stats = await service.getNonceStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.used).toBe(0);
      expect(stats.expired).toBe(0);
    });
  });

  describe('DynamoDB Integration (Production Environment)', () => {
    beforeEach(() => {
      // 本番環境をシミュレート
      process.env.NODE_ENV = 'production';
      delete process.env.STAGE;
    });

    test('正常フロー: DynamoDB nonce生成', async () => {
      mockDynamoDBClient.send.mockResolvedValueOnce({});

      const nonce = await service.generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    });

    test('正常フロー: DynamoDB nonce検証', async () => {
      const mockNonceItem = {
        PK: 'NONCE#test-nonce',
        SK: 'META',
        nonce: 'test-nonce',
        status: 'active',
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 86400,
      };

      mockDynamoDBClient.send.mockResolvedValueOnce({
        Item: mockNonceItem,
      });

      const isValid = await service.validateNonce({
        nonce: 'test-nonce',
        currentTimestamp: Date.now(),
      });

      expect(isValid).toBe(true);
      expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    });

    test('エラーケース: DynamoDB nonce検証失敗', async () => {
      mockDynamoDBClient.send.mockResolvedValueOnce({});

      const isValid = await service.validateNonce({
        nonce: 'non-existent-nonce',
        currentTimestamp: Date.now(),
      });

      expect(isValid).toBe(false);
    });

    test('正常フロー: DynamoDB nonce使用マーク', async () => {
      mockDynamoDBClient.send.mockResolvedValueOnce({});

      await service.markNonceAsUsed({
        nonce: 'test-nonce',
        usedAt: Date.now(),
      });

      expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
    });

    test('正常フロー: DynamoDB nonce統計取得', async () => {
      mockDynamoDBClient.send
        .mockResolvedValueOnce({ Count: 5 }) // active
        .mockResolvedValueOnce({ Count: 3 }) // used
        .mockResolvedValueOnce({ Count: 2 }); // expired

      const stats = await service.getNonceStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(10);
      expect(stats.active).toBe(5);
      expect(stats.used).toBe(3);
      expect(stats.expired).toBe(2);
      expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(3);
    });

    test('エラーケース: DynamoDB エラー処理', async () => {
      mockDynamoDBClient.send.mockRejectedValueOnce(
        new Error('DynamoDB error')
      );

      const nonce = await service.generateNonce();

      // エラーが発生してもnonceは生成される（フォールバック）
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    test('極端に長いnonce値', async () => {
      const longNonce = 'a'.repeat(1000);

      // メモリベースのテストでは長いnonceでも処理される
      const isValid = await service.validateNonce({
        nonce: longNonce,
        currentTimestamp: Date.now(),
      });

      expect(isValid).toBe(false); // 存在しないnonceなのでfalse
    });

    test('無効なタイムスタンプ', async () => {
      const nonce = await service.generateNonce();

      const isValid = await service.validateNonce({
        nonce,
        currentTimestamp: -1, // 無効なタイムスタンプ
      });

      expect(isValid).toBe(false);
    });

    test('null/undefined値の処理', async () => {
      await expect(
        service.validateNonce({
          nonce: '',
          currentTimestamp: Date.now(),
        })
      ).resolves.toBe(false);

      await expect(
        service.markNonceAsUsed({
          nonce: '',
          usedAt: Date.now(),
        })
      ).resolves.not.toThrow();
    });
  });
});
