/**
 * Rate Limiting Integration Tests
 *
 * @description Tests for rate limiting functionality including
 * concurrent upload limits and time-based limits.
 */

import { RateLimitService } from '../../src/services/RateLimitService';
import { UploadController } from '../../src/controllers/sns/UploadController';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Rate Limiting Integration Tests', () => {
  let rateLimitService: RateLimitService;
  let uploadController: UploadController;

  const mockUserId = 'test-user-123';
  const mockAuthRequest = {
    user: {
      id: mockUserId,
      address: '0x58f9e6153690c852',
      role: 'user',
    },
    headers: {
      authorization: 'Bearer mock-jwt-token',
    },
  };

  beforeEach(() => {
    rateLimitService = new RateLimitService();
    uploadController = new UploadController();
  });

  describe('Concurrent Upload Limits', () => {
    test('同時アップロード制限の確認（3つまで）', async () => {
      const presignedUrlRequest = {
        fileType: 'png' as const,
        fileSize: 1024000,
        contentType: 'image/png',
      };

      // 4つの同時リクエストを送信（制限は3）
      const promises = Array.from({ length: 4 }, (_, index) =>
        uploadController.generatePresignedUrl(
          mockUserId,
          'avatar',
          presignedUrlRequest,
          mockAuthRequest
        )
      );

      const results = await Promise.all(promises);

      // 最初の3つは成功、4つ目はレート制限エラー
      const successResults = results.filter(r => r.success);
      const rateLimitResults = results.filter(
        r => r.success === false && r.error?.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(successResults.length).toBe(3);
      expect(rateLimitResults.length).toBe(1);
      expect(rateLimitResults[0].error?.message).toContain(
        'concurrent uploads'
      );
    });

    test('異なる画像タイプでの同時アップロード制限', async () => {
      const presignedUrlRequest = {
        fileType: 'png' as const,
        fileSize: 1024000,
        contentType: 'image/png',
      };

      // アバターと背景画像を同時にアップロード
      const avatarPromise = uploadController.generatePresignedUrl(
        mockUserId,
        'avatar',
        presignedUrlRequest,
        mockAuthRequest
      );

      const backgroundPromise = uploadController.generatePresignedUrl(
        mockUserId,
        'background',
        presignedUrlRequest,
        mockAuthRequest
      );

      const [avatarResult, backgroundResult] = await Promise.all([
        avatarPromise,
        backgroundPromise,
      ]);

      // 両方とも成功するはず（異なる画像タイプ）
      expect(avatarResult.success).toBe(true);
      expect(backgroundResult.success).toBe(true);
    });
  });

  describe('Time-based Rate Limits', () => {
    test('時間あたりアップロード制限の確認', async () => {
      const presignedUrlRequest = {
        fileType: 'png' as const,
        fileSize: 1024000,
        contentType: 'image/png',
      };

      // 短時間で複数回のリクエストを送信
      const promises = Array.from({ length: 12 }, () =>
        uploadController.generatePresignedUrl(
          mockUserId,
          'avatar',
          presignedUrlRequest,
          mockAuthRequest
        )
      );

      const results = await Promise.all(promises);

      // 時間制限（10回/時間）を超えるとエラー
      const successResults = results.filter(r => r.success);
      const rateLimitResults = results.filter(
        r => r.success === false && r.error?.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(successResults.length).toBeLessThanOrEqual(10);
      expect(rateLimitResults.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Service', () => {
    test('レート制限チェック機能', async () => {
      // 初回チェック（成功）
      const firstCheck = await rateLimitService.checkRateLimit(
        mockUserId,
        'avatar'
      );
      expect(firstCheck.allowed).toBe(true);

      // 複数回チェック（制限に達するまで）
      let checkCount = 0;
      let lastResult = firstCheck;

      while (lastResult.allowed && checkCount < 5) {
        lastResult = await rateLimitService.checkRateLimit(
          mockUserId,
          'avatar'
        );
        checkCount++;
      }

      // 制限に達したら拒否される
      if (checkCount >= 3) {
        expect(lastResult.allowed).toBe(false);
        expect(lastResult.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    test('アップロード記録機能', async () => {
      const uploadId = 'test-upload-123';

      // アップロード記録
      await rateLimitService.recordUpload(mockUserId, 'avatar', uploadId);

      // 完了記録
      await rateLimitService.recordUploadCompletion(mockUserId, uploadId);

      // 記録後もレート制限チェックが正常に動作することを確認
      const checkResult = await rateLimitService.checkRateLimit(
        mockUserId,
        'avatar'
      );
      expect(checkResult.allowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('レート制限エラーの詳細情報', async () => {
      // 制限を超えるリクエストを送信
      const promises = Array.from({ length: 5 }, () =>
        uploadController.generatePresignedUrl(
          mockUserId,
          'avatar',
          {
            fileType: 'png' as const,
            fileSize: 1024000,
            contentType: 'image/png',
          },
          mockAuthRequest
        )
      );

      const results = await Promise.all(promises);
      const rateLimitResult = results.find(
        r => r.success === false && r.error?.code === 'RATE_LIMIT_EXCEEDED'
      );

      expect(rateLimitResult).toBeDefined();
      expect(rateLimitResult?.error?.message).toContain('Rate limit exceeded');
      expect(rateLimitResult?.error?.details).toContain('concurrent uploads');
    });

    test('異なるユーザー間でのレート制限独立性', async () => {
      const otherUserId = 'other-user-456';
      const otherAuthRequest = {
        user: {
          id: otherUserId,
          address: '0x1234567890abcdef',
          role: 'user',
        },
        headers: {
          authorization: 'Bearer other-jwt-token',
        },
      };

      const presignedUrlRequest = {
        fileType: 'png' as const,
        fileSize: 1024000,
        contentType: 'image/png',
      };

      // ユーザー1で制限に達するまでリクエスト
      const user1Promises = Array.from({ length: 4 }, () =>
        uploadController.generatePresignedUrl(
          mockUserId,
          'avatar',
          presignedUrlRequest,
          mockAuthRequest
        )
      );

      // ユーザー2でも同時にリクエスト
      const user2Promises = Array.from({ length: 4 }, () =>
        uploadController.generatePresignedUrl(
          otherUserId,
          'avatar',
          presignedUrlRequest,
          otherAuthRequest
        )
      );

      const [user1Results, user2Results] = await Promise.all([
        Promise.all(user1Promises),
        Promise.all(user2Promises),
      ]);

      // 各ユーザーは独立してレート制限される
      const user1Success = user1Results.filter(r => r.success).length;
      const user2Success = user2Results.filter(r => r.success).length;

      expect(user1Success).toBeLessThanOrEqual(3);
      expect(user2Success).toBeLessThanOrEqual(3);
    });
  });

  describe('Rate Limit Configuration', () => {
    test('設定値の確認', () => {
      // RateLimitServiceの設定値を確認
      const config = (rateLimitService as any).config;

      expect(config.maxConcurrentUploads).toBe(3);
      expect(config.windowSeconds).toBe(3600); // 1時間
      expect(config.maxWindowUploads).toBe(10);
    });

    test('カスタム設定での動作確認', async () => {
      // 設定を変更してテスト（実際の実装では設定ファイルから読み込み）
      const customRateLimitService = new RateLimitService();

      // 設定値の確認
      const config = (customRateLimitService as any).config;
      expect(config.maxConcurrentUploads).toBeDefined();
      expect(config.windowSeconds).toBeDefined();
      expect(config.maxWindowUploads).toBeDefined();
    });
  });
});
