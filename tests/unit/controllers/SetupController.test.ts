/**
 * SetupController Unit Tests
 *
 * @description Comprehensive tests for SetupController including
 * account setup job queuing and error handling scenarios
 */

import { SetupController } from '../../../src/controllers/transactions/SetupController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('SetupController', () => {
  let controller: SetupController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SetupController();
    mockSqsService = jest.mocked(controller['sqsService']);
  });

  describe('setupAccount', () => {
    it('should queue setup job successfully', async () => {
      const request = { address: '0x58f9e6153690c852' };
      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 3,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_abc123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('setup');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_abc123'
      );
      expect((result as any).data?.queuePosition).toBe(3);
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setup',
        userAddress: '0x58f9e6153690c852',
        params: {
          address: '0x58f9e6153690c852',
        },
        metadata: {
          memo: 'Setup HEART vault for 0x58f9e6153690c852',
          priority: 'normal',
        },
      });
    });

    it('should reject invalid Flow addresses', async () => {
      const invalidRequests = [
        { address: 'invalid' },
        { address: '0x123' }, // too short
        { address: '0xZZZZZZZZZZZZZZZZ' }, // invalid hex
        { address: '' }, // empty
        {
          address:
            '123456789012345678901234567890123456789012345678901234567890123456789',
        }, // too long
      ];

      for (const request of invalidRequests) {
        const result = await controller.setupAccount(request);
        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.INVALID_ADDRESS
        );
        expect((result as any).error?.message).toBe(
          'Invalid Flow address format'
        );
      }

      // Ensure SQS service is never called for invalid addresses
      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive addresses', async () => {
      const request = { address: '0X58F9E6153690C852' };
      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(true);
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setup',
        userAddress: '0x58f9e6153690c852', // Should be normalized to lowercase
        params: {
          address: '0x58f9e6153690c852',
        },
        metadata: {
          memo: 'Setup HEART vault for 0x58f9e6153690c852',
          priority: 'normal',
        },
      });
    });

    it('should handle SqsService errors', async () => {
      const request = { address: '0x58f9e6153690c852' };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'SQS queue error',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    });

    it('should handle exceptions', async () => {
      const request = { address: '0x58f9e6153690c852' };

      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue setup job');
    });

    it('should handle null/undefined request', async () => {
      const result1 = await controller.setupAccount(null as any);
      const result2 = await controller.setupAccount(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect((result1 as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result2 as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle request with missing address', async () => {
      const request = {} as any;

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle request with null address', async () => {
      const request = { address: null as any };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle special Flow addresses', async () => {
      const specialAddresses = [
        '0x0000000000000000', // zero address
        '0xffffffffffffffff', // max address
        '0x1', // minimal address
      ];

      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      for (const address of specialAddresses) {
        const request = { address };
        const result = await controller.setupAccount(request);
        expect(result.success).toBe(true);
      }

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(
        specialAddresses.length
      );
    });

    it('should handle high queue position', async () => {
      const request = { address: '0x58f9e6153690c852' };
      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T01:00:00.000Z', // 1 hour later
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 100,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.queuePosition).toBe(100);
      expect((result as any).data?.estimatedCompletionTime).toBe(
        '2024-01-01T01:00:00.000Z'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle SqsService constructor errors', () => {
      expect(() => new SetupController()).not.toThrow();
    });

    it('should maintain consistent error response format', async () => {
      const request = { address: '0x58f9e6153690c852' };
      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Test error')
      );

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBeDefined();
      expect((result as any).error?.message).toBeDefined();
      expect((result as any).error?.details).toBeDefined();
      expect((result as any).timestamp).toBeDefined();
    });

    it('should handle SqsService returning invalid data structure', async () => {
      const request = { address: '0x58f9e6153690c852' };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: null, // Invalid data
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.setupAccount(request);

      // Should still succeed but handle gracefully
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent setup requests', async () => {
      const request = { address: '0x58f9e6153690c852' };
      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const promises = Array.from({ length: 10 }, () =>
        controller.setupAccount(request)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.type).toBe('setup');
      });

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple different addresses', async () => {
      const addresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0xabcdef1234567890',
      ];

      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'queued',
        type: 'setup',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_abc123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const promises = addresses.map(address =>
        controller.setupAccount({ address })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect((result as any).data?.type).toBe('setup');
      });

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(
        addresses.length
      );

      // Verify each call had the correct address
      addresses.forEach((address, index) => {
        expect(mockSqsService.queueTransactionJob).toHaveBeenNthCalledWith(
          index + 1,
          {
            type: 'setup',
            userAddress: address.toLowerCase(),
            params: {
              address: address.toLowerCase(),
            },
          }
        );
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle addresses with extra whitespace', async () => {
      const request = { address: '  0x58f9e6153690c852  ' };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle addresses without 0x prefix', async () => {
      const request = { address: '58f9e6153690c852' };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle numeric address input', async () => {
      const request = { address: 123456789 as any };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle boolean address input', async () => {
      const request = { address: true as any };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });

    it('should handle array address input', async () => {
      const request = { address: ['0x58f9e6153690c852'] as any };

      const result = await controller.setupAccount(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    });
  });
});
