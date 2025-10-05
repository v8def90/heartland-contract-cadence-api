/**
 * AuthController Blocto Authentication Tests
 *
 * @description Unit tests for Blocto authentication endpoints in AuthController
 * including blocto-login and generate-nonce endpoints.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { AuthController } from '../../src/controllers/auth/AuthController';
import type { BloctoAuthRequest } from '../../src/models/requests/index';

// Mock BloctoAuthService
jest.mock('../../src/services/BloctoAuthService', () => ({
  BloctoAuthService: jest.fn().mockImplementation(() => ({
    verifySignature: jest.fn(),
    generateNonce: jest.fn(),
    generateAuthMessage: jest.fn(),
  })),
}));

describe('AuthController - Blocto Authentication', () => {
  let authController: AuthController;
  let mockBloctoAuthService: any;

  beforeEach(() => {
    authController = new AuthController();
    mockBloctoAuthService = (authController as any).bloctoAuthService;
    jest.clearAllMocks();
  });

  describe('bloctoLogin', () => {
    const validBloctoRequest: BloctoAuthRequest = {
      address: '0x58f9e6153690c852',
      signature: 'mock-signature-123',
      message:
        'Login to Heart Token API\nNonce: test-nonce-123\nTimestamp: 1640995200000',
      timestamp: 1640995200000,
      nonce: 'test-nonce-123',
    };

    test('正常フロー: Blocto認証成功', async () => {
      const mockAuthData = {
        token: 'mock-jwt-token',
        expiresIn: 86400,
        address: '0x58f9e6153690c852',
        role: 'user' as const,
        issuedAt: '2024-01-01T00:00:00.000Z',
        walletType: 'blocto' as const,
        bloctoMetadata: {
          appId: 'heart-token-api',
          walletVersion: '1.0.0',
          deviceType: 'web',
        },
      };

      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: true,
        data: mockAuthData,
      });

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAuthData);
        expect(result.data.walletType).toBe('blocto');
        expect(result.data.bloctoMetadata).toBeDefined();
      }
      expect(mockBloctoAuthService.verifySignature).toHaveBeenCalledWith(
        validBloctoRequest
      );
    });

    test('エラーケース: 署名検証失敗', async () => {
      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: false,
        error: 'Invalid signature',
      });

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
        expect(result.error.message).toBe('Invalid signature');
        expect(result.error.details).toBe(
          'Blocto wallet signature verification failed'
        );
      }
    });

    test('エラーケース: 無効なアドレス', async () => {
      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: false,
        error: 'Address is required',
      });

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
        expect(result.error.message).toBe('Address is required');
      }
    });

    test('エラーケース: タイムスタンプ検証失敗', async () => {
      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: false,
        error: 'Timestamp is too old or too far in the future',
      });

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
        expect(result.error.message).toBe(
          'Timestamp is too old or too far in the future'
        );
      }
    });

    test('エラーケース: nonce検証失敗', async () => {
      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: false,
        error: 'Nonce has already been used',
      });

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTHENTICATION_ERROR');
        expect(result.error.message).toBe('Nonce has already been used');
      }
    });

    test('エラーケース: サービス例外', async () => {
      mockBloctoAuthService.verifySignature.mockRejectedValue(
        new Error('Service error')
      );

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.error.message).toBe('Blocto authentication failed');
        expect(result.error.details).toBe('Service error');
      }
    });

    test('エラーケース: 予期しないエラー', async () => {
      mockBloctoAuthService.verifySignature.mockRejectedValue('String error');

      const result = await authController.bloctoLogin(validBloctoRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.error.message).toBe('Blocto authentication failed');
        expect(result.error.details).toBe('Unknown error occurred');
      }
    });
  });

  describe('generateNonce', () => {
    test('正常フロー: nonce生成成功', async () => {
      const mockNonce = 'test-nonce-123';
      const mockTimestamp = Date.now();
      const mockMessage = `Login to Heart Token API\nNonce: test-nonce-123\nTimestamp: ${mockTimestamp}`;

      mockBloctoAuthService.generateNonce.mockReturnValue(mockNonce);
      mockBloctoAuthService.generateAuthMessage.mockReturnValue(mockMessage);

      const result = await authController.generateNonce();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nonce).toBe(mockNonce);
        expect(result.data.message).toBe(mockMessage);
        expect(typeof result.data.timestamp).toBe('number');
        expect(result.data.timestamp).toBeGreaterThan(0);
      }
      expect(mockBloctoAuthService.generateNonce).toHaveBeenCalled();
      expect(mockBloctoAuthService.generateAuthMessage).toHaveBeenCalledWith(
        mockNonce,
        expect.any(Number)
      );
    });

    test('エラーケース: nonce生成失敗', async () => {
      mockBloctoAuthService.generateNonce.mockImplementation(() => {
        throw new Error('Nonce generation failed');
      });

      const result = await authController.generateNonce();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.error.message).toBe('Nonce generation failed');
        expect(result.error.details).toBe('Nonce generation failed');
      }
    });

    test('エラーケース: 予期しないエラー', async () => {
      mockBloctoAuthService.generateNonce.mockImplementation(() => {
        throw 'String error';
      });

      const result = await authController.generateNonce();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.error.message).toBe('Nonce generation failed');
        expect(result.error.details).toBe('Unknown error occurred');
      }
    });
  });

  describe('統合テスト', () => {
    test('正常フロー: nonce生成から認証までの完全フロー', async () => {
      // 1. nonce生成
      const mockNonce = 'integration-test-nonce';
      const mockTimestamp = Date.now();
      const mockMessage = `Login to Heart Token API\nNonce: ${mockNonce}\nTimestamp: ${mockTimestamp}`;

      mockBloctoAuthService.generateNonce.mockReturnValue(mockNonce);
      mockBloctoAuthService.generateAuthMessage.mockReturnValue(mockMessage);

      const nonceResult = await authController.generateNonce();
      expect(nonceResult.success).toBe(true);

      // 2. 認証リクエスト作成
      const authRequest: BloctoAuthRequest = {
        address: '0x58f9e6153690c852',
        signature: 'integration-test-signature',
        message: mockMessage,
        timestamp: mockTimestamp,
        nonce: mockNonce,
      };

      // 3. 認証実行
      const mockAuthData = {
        token: 'integration-jwt-token',
        expiresIn: 86400,
        address: '0x58f9e6153690c852',
        role: 'user' as const,
        issuedAt: new Date().toISOString(),
        walletType: 'blocto' as const,
        bloctoMetadata: {
          appId: 'heart-token-api',
          walletVersion: '1.0.0',
          deviceType: 'web',
        },
      };

      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: true,
        data: mockAuthData,
      });

      const authResult = await authController.bloctoLogin(authRequest);

      expect(authResult.success).toBe(true);
      if (authResult.success) {
        expect(authResult.data.walletType).toBe('blocto');
        expect(authResult.data.address).toBe('0x58f9e6153690c852');
      }
    });

    test('エラーケース: nonce生成成功、認証失敗', async () => {
      // 1. nonce生成は成功
      const mockNonce = 'error-test-nonce';
      mockBloctoAuthService.generateNonce.mockReturnValue(mockNonce);
      mockBloctoAuthService.generateAuthMessage.mockReturnValue('test message');

      const nonceResult = await authController.generateNonce();
      expect(nonceResult.success).toBe(true);

      // 2. 認証は失敗
      mockBloctoAuthService.verifySignature.mockResolvedValue({
        success: false,
        error: 'Invalid signature',
      });

      const authRequest: BloctoAuthRequest = {
        address: '0x58f9e6153690c852',
        signature: 'invalid-signature',
        message: 'test message',
        timestamp: Date.now(),
        nonce: mockNonce,
      };

      const authResult = await authController.bloctoLogin(authRequest);
      expect(authResult.success).toBe(false);
    });
  });
});
