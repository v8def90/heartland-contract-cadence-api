/**
 * BurnController Unit Tests
 *
 * @description Comprehensive tests for BurnController including
 * token burn job queuing and error handling scenarios
 */

import { BurnController } from '../../../src/controllers/transactions/BurnController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('BurnController', () => {
  let controller: BurnController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new BurnController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('burnTokens', () => {
    it('should queue burn job successfully', async () => {
      const request = { amount: '100.0', memo: 'Test burn' };
      const mockJobData = {
        jobId: 'job_1704067200000_burn123',
        status: 'queued',
        type: 'burn',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_burn123',
        queuePosition: 2,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_burn123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('burn');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_burn123'
      );
      expect((result as any).data?.queuePosition).toBe(2);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'burn',
        userAddress: '0x58f9e6153690c852',
        params: {
          amount: '100.0',
          memo: 'Test burn',
        },
        metadata: {
          memo: 'Test burn',
          priority: 'normal',
        },
      });
    });

    it('should queue burn job without memo', async () => {
      const request = { amount: '50.0' };
      const mockJobData = {
        jobId: 'job_1704067200000_burn456',
        status: 'queued',
        type: 'burn',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_burn456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_burn456');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'burn',
        userAddress: '0x58f9e6153690c852',
        params: {
          amount: '50.0',
          memo: undefined,
        },
        metadata: {
          memo: 'Burn 50.0 HEART tokens',
          priority: 'normal',
        },
      });
    });

    it('should handle missing amount', async () => {
      const request = { amount: '' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Amount is required');
      expect((result as any).error?.details).toBe(
        'Burn amount must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle null amount', async () => {
      const request = { amount: null as any };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Amount is required');

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle undefined amount', async () => {
      const request = {} as any;

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Amount is required');

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle invalid amount (negative)', async () => {
      const request = { amount: '-10.0' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid burn amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle invalid amount (zero)', async () => {
      const request = { amount: '0' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid burn amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle invalid amount (NaN)', async () => {
      const request = { amount: 'invalid' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid burn amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle invalid amount (Infinity)', async () => {
      const request = { amount: 'Infinity' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid burn amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle SQS service failure', async () => {
      const request = { amount: '100.0' };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'SQS_ERROR',
          message: 'Failed to queue job',
          details: 'SQS service unavailable',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'burn',
        userAddress: '0x58f9e6153690c852',
        params: {
          amount: '100.0',
          memo: undefined,
        },
        metadata: {
          memo: 'Burn 100.0 HEART tokens',
          priority: 'normal',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      const request = { amount: '100.0' };

      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process burn request'
      );
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      const request = { amount: '100.0' };

      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process burn request'
      );
      expect((result as any).error?.details).toBe('Unknown error occurred');
    });

    it('should handle whitespace-only amount', async () => {
      const request = { amount: '   ' };

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Amount is required');
      expect((result as any).error?.details).toBe(
        'Burn amount must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should handle decimal amounts correctly', async () => {
      const request = { amount: '123.456789', memo: 'Precise burn' };
      const mockJobData = {
        jobId: 'job_1704067200000_burn789',
        status: 'queued',
        type: 'burn',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_burn789',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_burn789');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'burn',
        userAddress: '0x58f9e6153690c852',
        params: {
          amount: '123.456789',
          memo: 'Precise burn',
        },
        metadata: {
          memo: 'Precise burn',
          priority: 'normal',
        },
      });
    });

    it('should handle very small amounts', async () => {
      const request = { amount: '0.00000001' };
      const mockJobData = {
        jobId: 'job_1704067200000_burn_small',
        status: 'queued',
        type: 'burn',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_burn_small',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.burnTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_burn_small');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'burn',
        userAddress: '0x58f9e6153690c852',
        params: {
          amount: '0.00000001',
          memo: undefined,
        },
        metadata: {
          memo: 'Burn 0.00000001 HEART tokens',
          priority: 'normal',
        },
      });
    });
  });
});
