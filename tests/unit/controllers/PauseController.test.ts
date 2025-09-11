/**
 * PauseController Unit Tests
 *
 * @description Comprehensive tests for PauseController including
 * contract pause job queuing and error handling scenarios
 */

import { PauseController } from '../../../src/controllers/transactions/PauseController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('PauseController', () => {
  let controller: PauseController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new PauseController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('pauseContract', () => {
    it('should queue pause job successfully', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_pause123',
        status: 'queued',
        type: 'pause',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_pause123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_pause123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('pause');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_pause123'
      );
      expect((result as any).data?.queuePosition).toBe(1);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'pause',
        userAddress: '0x58f9e6153690c852',
        params: {},
        metadata: {
          memo: 'Pause HEART token contract',
          priority: 'high',
        },
      });
    });

    it('should use ADMIN_ADDRESS from environment when available', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const mockJobData = {
        jobId: 'job_1704067200000_pause456',
        status: 'queued',
        type: 'pause',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_pause456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'pause',
        userAddress: '0x1234567890abcdef',
        params: {},
        metadata: {
          memo: 'Pause HEART token contract',
          priority: 'high',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should handle SQS service failure', async () => {
      // Set ADMIN_ADDRESS to ensure consistent userAddress
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x58f9e6153690c852';

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'SQS_ERROR',
          message: 'Failed to queue job',
          details: 'SQS service unavailable',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'pause',
        userAddress: '0x58f9e6153690c852',
        params: {},
        metadata: {
          memo: 'Pause HEART token contract',
          priority: 'high',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should handle unexpected errors', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle SQS service timeout', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'SQS_TIMEOUT',
          message: 'Request timeout',
          details: 'SQS service did not respond within timeout period',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_TIMEOUT');
      expect((result as any).error?.message).toBe('Request timeout');
      expect((result as any).error?.details).toBe(
        'SQS service did not respond within timeout period'
      );
    });

    it('should handle SQS service permission error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'SQS_PERMISSION_ERROR',
          message: 'Insufficient permissions',
          details: 'Account does not have permission to access SQS queue',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_PERMISSION_ERROR');
      expect((result as any).error?.message).toBe('Insufficient permissions');
      expect((result as any).error?.details).toBe(
        'Account does not have permission to access SQS queue'
      );
    });

    it('should handle SQS service queue full error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'SQS_QUEUE_FULL',
          message: 'Queue is full',
          details: 'SQS queue has reached maximum capacity',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_QUEUE_FULL');
      expect((result as any).error?.message).toBe('Queue is full');
      expect((result as any).error?.details).toBe(
        'SQS queue has reached maximum capacity'
      );
    });

    it('should handle network error', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe(
        'Network error: ECONNREFUSED'
      );
    });

    it('should handle AWS SDK error', async () => {
      const awsError = new Error('AWS SDK error');
      (awsError as any).code = 'NetworkingError';
      (awsError as any).statusCode = 500;

      mockSqsService.queueTransactionJob.mockRejectedValue(awsError);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('AWS SDK error');
    });

    it('should handle null response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(null as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle undefined response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(undefined as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle response without success property', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        data: {
          jobId: 'job_1704067200000_pause789',
          status: 'queued',
          type: 'pause',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.pauseContract();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe('Failed to queue pause job');
      expect((result as any).error?.details).toBe('Unknown error');
    });
  });
});
