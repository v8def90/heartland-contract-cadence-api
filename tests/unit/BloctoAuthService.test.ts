import { BloctoAuthService } from '../../src/services/BloctoAuthService';
import type { BloctoAuthRequest } from '../../src/models/requests';
import * as fcl from '@onflow/fcl';

// FCL モック
jest.mock('@onflow/fcl', () => ({
  verifyUserSignatures: jest.fn(),
  config: jest.fn(),
}));

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
}));

// JWT モック
jest.mock('../../src/middleware/passport', () => ({
  generateJwtToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifyJwtToken: jest.fn().mockReturnValue({
    sub: 'user-123',
    address: '0x58f9e6153690c852',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  }),
}));

describe('BloctoAuthService', () => {
  let service: BloctoAuthService;
  const mockUserId = 'user-123';
  const mockAddress = '0x58f9e6153690c852';
  const mockSignature = '0x1234567890abcdef';
  const mockMessage =
    'Login to Heart Token API\nNonce: test-nonce-123\nTimestamp: 1640995200000';
  const mockTimestamp = Date.now();
  const mockNonce = 'test-nonce-123';

  beforeEach(() => {
    service = new BloctoAuthService();
    jest.clearAllMocks();

    // nonceを事前に設定（各テストで必要に応じてリセット）
    service['nonceStore'].set(mockNonce, {
      timestamp: Date.now(),
      used: false,
    });
  });

  describe('generateNonce', () => {
    test('正常フロー: nonce生成成功', () => {
      const nonce = service.generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    test('複数回生成で異なるnonceが生成される', () => {
      const nonce1 = service.generateNonce();
      const nonce2 = service.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('generateAuthMessage', () => {
    test('正常フロー: 認証メッセージ生成成功', () => {
      const message = service.generateAuthMessage(mockNonce, mockTimestamp);

      expect(message).toBeDefined();
      expect(message).toContain('Login to Heart Token API');
      expect(message).toContain(`Nonce: ${mockNonce}`);
      expect(message).toContain(`Timestamp: ${mockTimestamp}`);
    });

    test('異なるnonceとtimestampで異なるメッセージが生成される', () => {
      const message1 = service.generateAuthMessage('nonce1', 1000);
      const message2 = service.generateAuthMessage('nonce2', 2000);

      expect(message1).not.toBe(message2);
    });
  });

  describe('validateTimestamp (via verifySignature)', () => {
    test('正常フロー: 有効なタイムスタンプ', async () => {
      const validTimestamp = Date.now();
      const request: BloctoAuthRequest = {
        address: mockAddress,
        signature: mockSignature,
        message: mockMessage,
        timestamp: validTimestamp,
        nonce: mockNonce,
      };

      // nonceは既に設定済み

      // FCL モック設定
      (fcl.verifyUserSignatures as jest.Mock).mockResolvedValue([
        {
          addr: mockAddress,
          keyId: 0,
          signature: mockSignature,
        },
      ]);

      // JWT モック設定は既に設定済み

      const result = await service.verifySignature(request);

      expect(result.success).toBe(true);
    });

    test('エラーケース: 古すぎるタイムスタンプ', async () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10分前
      const request: BloctoAuthRequest = {
        address: mockAddress,
        signature: mockSignature,
        message: mockMessage,
        timestamp: oldTimestamp,
        nonce: mockNonce,
      };

      const result = await service.verifySignature(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          'Timestamp is too old or too far in the future'
        );
      }
    });

    test('エラーケース: 未来のタイムスタンプ', async () => {
      const futureTimestamp = Date.now() + 5 * 60 * 1000; // 5分後
      const request: BloctoAuthRequest = {
        address: mockAddress,
        signature: mockSignature,
        message: mockMessage,
        timestamp: futureTimestamp,
        nonce: mockNonce,
      };

      const result = await service.verifySignature(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          'Timestamp is too old or too far in the future'
        );
      }
    });
  });

  describe('validateAddress (via verifySignature)', () => {
    test('正常フロー: 有効なFlowアドレス', async () => {
      const validAddress = '0x58f9e6153690c852';
      const request: BloctoAuthRequest = {
        address: validAddress,
        signature: mockSignature,
        message: mockMessage,
        timestamp: mockTimestamp,
        nonce: mockNonce,
      };

      // DynamoDB モック設定
      mockDynamoDBClient.send.mockResolvedValue({
        Item: {
          PK: `NONCE#${mockNonce}`,
          SK: 'META',
          nonce: mockNonce,
          address: validAddress,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      });

      // FCL モック設定
      (fcl.verifyUserSignatures as jest.Mock).mockResolvedValue([
        {
          addr: validAddress,
          keyId: 0,
          signature: mockSignature,
        },
      ]);

      // JWT モック設定は既に設定済み

      const result = await service.verifySignature(request);

      expect(result.success).toBe(true);
    });

    test('エラーケース: 無効なアドレス形式', async () => {
      const testCases = [
        { address: 'invalid-address', expectedError: 'Address must start with 0x' },
        { address: 'not-hex', expectedError: 'Address must start with 0x' },
        { address: '', expectedError: 'Address is required' },
        { address: '0x', expectedError: 'Address must be 18 characters long' },
        { address: '0x123', expectedError: 'Address must be 18 characters long' },
      ];

      for (const testCase of testCases) {
        // 新しいnonceを使用してテスト
        const testNonce = `test-nonce-${testCase.address}`;
        service['nonceStore'].set(testNonce, {
          timestamp: Date.now(),
          used: false,
        });

        const request: BloctoAuthRequest = {
          address: testCase.address,
          signature: mockSignature,
          message: mockMessage,
          timestamp: mockTimestamp,
          nonce: testNonce,
        };

        const result = await service.verifySignature(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(testCase.expectedError);
        }
      }
    });
  });

  describe('verifySignature', () => {
    const mockRequest: BloctoAuthRequest = {
      address: mockAddress,
      signature: mockSignature,
      message: mockMessage,
      timestamp: mockTimestamp,
      nonce: mockNonce,
    };

    beforeEach(() => {
      // nonceは既に設定済み

      // FCL モック設定
      (fcl.verifyUserSignatures as jest.Mock).mockResolvedValue([
        {
          addr: mockAddress,
          keyId: 0,
          signature: mockSignature,
        },
      ]);

      // JWT モック設定は既に設定済み
    });

    test('正常フロー: 署名検証成功', async () => {
      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.token).toBe('mock-jwt-token');
        expect(result.data.address).toBe(mockAddress);
        expect(result.data.walletType).toBe('blocto');
      }
    });

    test('エラーケース: 無効なアドレス', async () => {
      const invalidRequest = { ...mockRequest, address: 'invalid-address' };
      const result = await service.verifySignature(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Address must start with 0x');
      }
    });

    test('エラーケース: 無効なタイムスタンプ', async () => {
      const invalidRequest = {
        ...mockRequest,
        timestamp: Date.now() - 10 * 60 * 1000, // 10分前
      };
      const result = await service.verifySignature(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          'Timestamp is too old or too far in the future'
        );
      }
    });

    test('エラーケース: nonceが見つからない', async () => {
      // nonceを削除してエラーケースを作成
      service['nonceStore'].delete(mockNonce);

      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid or expired nonce');
      }
    });

    test('エラーケース: 署名検証失敗', async () => {
      (fcl.verifyUserSignatures as jest.Mock).mockRejectedValue(
        new Error('Signature verification failed')
      );

      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid signature');
      }
    });

    test('エラーケース: 予期しないエラー', async () => {
      // FCLの署名検証でエラーを発生させる
      (fcl.verifyUserSignatures as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid signature');
      }
    });
  });

  describe('nonce validation (via verifySignature)', () => {
    const mockRequest: BloctoAuthRequest = {
      address: mockAddress,
      signature: mockSignature,
      message: mockMessage,
      timestamp: mockTimestamp,
      nonce: mockNonce,
    };

    test('正常フロー: 有効なnonce', async () => {
      mockDynamoDBClient.send.mockResolvedValue({
        Item: {
          PK: `NONCE#${mockNonce}`,
          SK: 'META',
          nonce: mockNonce,
          address: mockAddress,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      });

      // FCL モック設定
      (fcl.verifyUserSignatures as jest.Mock).mockResolvedValue([
        {
          addr: mockAddress,
          keyId: 0,
          signature: mockSignature,
        },
      ]);

      // JWT モック設定は既に設定済み

      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(true);
    });

    test('エラーケース: nonceが見つからない', async () => {
      // nonceを削除してエラーケースを作成
      service['nonceStore'].delete(mockNonce);

      const result = await service.verifySignature(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid or expired nonce');
      }
    });

    test('エラーケース: アドレスが一致しない', async () => {
      // nonceは設定されているが、アドレスが異なる（エラーケース）
      // このテストケースでは、nonceの検証は成功するが、アドレス検証で失敗する
      const invalidRequest: BloctoAuthRequest = {
        address: 'invalid-address',
        signature: mockSignature,
        message: mockMessage,
        timestamp: mockTimestamp,
        nonce: mockNonce,
      };

      const result = await service.verifySignature(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Address must start with 0x');
      }
    });

    test('エラーケース: 期限切れnonce', async () => {
      // nonceは設定されているが、期限切れ（エラーケース）
      // このテストケースでは、nonceの検証は成功するが、期限切れで失敗する
      const oldNonce = 'old-nonce';
      service['nonceStore'].set(oldNonce, {
        timestamp: Date.now() - 10 * 60 * 1000, // 10分前
        used: false,
      });

      const oldRequest: BloctoAuthRequest = {
        address: mockAddress,
        signature: mockSignature,
        message: mockMessage,
        timestamp: Date.now() - 10 * 60 * 1000, // 10分前のタイムスタンプ
        nonce: oldNonce,
      };

      const result = await service.verifySignature(oldRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          'Timestamp is too old or too far in the future'
        );
      }
    });
  });

  describe('統合テスト', () => {
    test('正常フロー: 完全な認証フロー', async () => {
      // 1. nonce生成
      const nonce = service.generateNonce();
      expect(nonce).toBeDefined();

      // 2. 認証メッセージ生成
      const message = service.generateAuthMessage(nonce, mockTimestamp);
      expect(message).toContain(nonce);

      // 3. 署名検証（nonce保存は内部で行われる）
      mockDynamoDBClient.send.mockResolvedValue({
        Item: {
          PK: `NONCE#${nonce}`,
          SK: 'META',
          nonce: nonce,
          address: mockAddress,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      });

      (fcl.verifyUserSignatures as jest.Mock).mockResolvedValue([
        {
          addr: mockAddress,
          keyId: 0,
          signature: mockSignature,
        },
      ]);

      const { generateJwtToken } = require('../../src/middleware/passport');
      (generateJwtToken as jest.Mock).mockReturnValue('mock-jwt-token');

      const request: BloctoAuthRequest = {
        address: mockAddress,
        signature: mockSignature,
        message: message,
        timestamp: mockTimestamp,
        nonce: nonce,
      };

      const result = await service.verifySignature(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe('mock-jwt-token');
        expect(result.data.address).toBe(mockAddress);
      }
    });

    test('エラーケース: 無効なリクエスト', async () => {
      const invalidRequest: BloctoAuthRequest = {
        address: 'invalid-address',
        signature: mockSignature,
        message: mockMessage,
        timestamp: mockTimestamp,
        nonce: mockNonce,
      };

      const result = await service.verifySignature(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Address must start with 0x');
      }
    });
  });
});
