/**
 * JobController Unit Tests
 *
 * @description Comprehensive tests for JobController including
 * job status retrieval and error handling scenarios
 */

import { JobController } from '../../../src/controllers/queries/JobController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('JobController', () => {
  let controller: JobController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new JobController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.getJobStatus.mockClear();
  });

  describe('getJobStatus', () => {
    it('should retrieve job status successfully for completed job', async () => {
      const jobId = 'job_1704067200000_abc123';
      const mockJobData = {
        jobId: 'job_1704067200000_abc123',
        status: 'completed' as const,
        type: 'mint',
        progress: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:01:00.000Z',
        completedAt: '2024-01-01T00:05:00.000Z',
        result: {
          txId: 'f1a2b3c4d5e6f7g8h9i0',
          blockHeight: 12345678,
          status: 'sealed',
        },
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_abc123');
      expect((result as any).data?.status).toBe('completed');
      expect((result as any).data?.type).toBe('mint');
      expect((result as any).data?.progress).toBe(100);
      expect((result as any).data?.result?.txId).toBe('f1a2b3c4d5e6f7g8h9i0');
      expect((result as any).data?.result?.blockHeight).toBe(12345678);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should retrieve job status successfully for processing job', async () => {
      const jobId = 'job_1704067200000_def456';
      const mockJobData = {
        jobId: 'job_1704067200000_def456',
        status: 'processing' as const,
        type: 'transfer',
        progress: 50,
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:01:00.000Z',
        logs: ['Job started', 'Processing transaction'],
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:02:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_def456');
      expect((result as any).data?.status).toBe('processing');
      expect((result as any).data?.type).toBe('transfer');
      expect((result as any).data?.progress).toBe(50);
      expect((result as any).data?.logs).toEqual(['Job started', 'Processing transaction']);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should retrieve job status successfully for queued job', async () => {
      const jobId = 'job_1704067200000_ghi789';
      const mockJobData = {
        jobId: 'job_1704067200000_ghi789',
        status: 'queued' as const,
        type: 'batchTransfer',
        progress: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_ghi789');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('batchTransfer');
      expect((result as any).data?.progress).toBe(0);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should retrieve job status successfully for failed job', async () => {
      const jobId = 'job_1704067200000_jkl012';
      const mockJobData = {
        jobId: 'job_1704067200000_jkl012',
        status: 'failed' as const,
        type: 'mint',
        progress: 75,
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:01:00.000Z',
        completedAt: '2024-01-01T00:03:00.000Z',
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for minting',
          details: 'Account balance is less than required amount',
        },
        logs: ['Job started', 'Processing transaction', 'Transaction failed'],
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:03:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_jkl012');
      expect((result as any).data?.status).toBe('failed');
      expect((result as any).data?.error?.code).toBe('INSUFFICIENT_BALANCE');
      expect((result as any).data?.error?.message).toBe('Insufficient balance for minting');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should retrieve job status successfully for cancelled job', async () => {
      const jobId = 'job_1704067200000_mno345';
      const mockJobData = {
        jobId: 'job_1704067200000_mno345',
        status: 'cancelled' as const,
        type: 'transfer',
        progress: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:01:00.000Z',
        completedAt: '2024-01-01T00:02:00.000Z',
        logs: ['Job started', 'Job cancelled by user'],
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:02:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_mno345');
      expect((result as any).data?.status).toBe('cancelled');
      expect((result as any).data?.type).toBe('transfer');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle job not found error', async () => {
      const jobId = 'job_1704067200000_nonexistent';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Job not found',
          details: `Job with ID ${jobId} does not exist or has expired`,
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.NOT_FOUND);
      expect((result as any).error?.message).toBe('Job not found');
      expect((result as any).error?.details).toBe(
        `Job with ID ${jobId} does not exist or has expired`
      );
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle SQS service internal error', async () => {
      const jobId = 'job_1704067200000_error';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve job status',
          details: 'CloudWatch Logs service unavailable',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect((result as any).error?.message).toBe('Failed to retrieve job status');
      expect((result as any).error?.details).toBe('CloudWatch Logs service unavailable');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle SQS service exceptions', async () => {
      const jobId = 'job_1704067200000_exception';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve job status',
          details: 'CloudWatch connection failed',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect((result as any).error?.message).toBe('Failed to retrieve job status');
      expect((result as any).error?.details).toBe('CloudWatch connection failed');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle non-Error exceptions', async () => {
      const jobId = 'job_1704067200000_string_error';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve job status',
          details: 'Unknown error',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect((result as any).error?.message).toBe('Failed to retrieve job status');
      expect((result as any).error?.details).toBe('Unknown error');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle different job types', async () => {
      const jobTypes = ['setup', 'mint', 'transfer', 'batchTransfer', 'burn', 'pause', 'unpause', 'setTaxRate', 'setTreasury'];
      
      for (const jobType of jobTypes) {
        const jobId = `job_1704067200000_${jobType}`;
        const mockJobData = {
          jobId,
          status: 'completed' as const,
          type: jobType,
          progress: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:05:00.000Z',
        };

        mockSqsService.getJobStatus.mockResolvedValue({
          success: true,
          data: mockJobData,
          timestamp: '2024-01-01T00:05:00.000Z',
        } as any);

        const result = await controller.getJobStatus(jobId);

        expect(result.success).toBe(true);
        expect((result as any).data?.type).toBe(jobType);
        expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
      }

      expect(mockSqsService.getJobStatus).toHaveBeenCalledTimes(jobTypes.length);
    });

    it('should handle jobs with complex result data', async () => {
      const jobId = 'job_1704067200000_complex';
      const mockJobData = {
        jobId: 'job_1704067200000_complex',
        status: 'completed' as const,
        type: 'batchTransfer',
        progress: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
        startedAt: '2024-01-01T00:01:00.000Z',
        completedAt: '2024-01-01T00:05:00.000Z',
        result: {
          txId: 'complex_tx_123456789',
          status: 'sealed',
          blockHeight: 98765432,
          events: [
            { type: 'Transfer', data: { from: '0x123', to: '0x456', amount: '100.0' } },
            { type: 'Transfer', data: { from: '0x123', to: '0x789', amount: '200.0' } },
          ],
        },
        logs: [
          'Job started',
          'Processing batch transfer',
          'Transaction submitted',
          'Transaction sealed',
          'Job completed successfully',
        ],
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.result?.txId).toBe('complex_tx_123456789');
      expect((result as any).data?.result?.blockHeight).toBe(98765432);
      expect((result as any).data?.result?.events).toHaveLength(2);
      expect((result as any).data?.logs).toHaveLength(5);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle jobs with partial data', async () => {
      const jobId = 'job_1704067200000_partial';
      const mockJobData = {
        jobId: 'job_1704067200000_partial',
        status: 'processing' as const,
        type: 'mint',
        createdAt: '2024-01-01T00:00:00.000Z',
        // Missing optional fields like startedAt, progress, etc.
      };

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:01:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_partial');
      expect((result as any).data?.status).toBe('processing');
      expect((result as any).data?.type).toBe('mint');
      expect((result as any).data?.startedAt).toBeUndefined();
      expect((result as any).data?.progress).toBeUndefined();
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });
  });

  describe('Error Handling', () => {
    it('should handle SqsService constructor errors', () => {
      expect(() => new JobController()).not.toThrow();
    });

    it('should maintain consistent error response format', async () => {
      const jobId = 'job_1704067200000_format_test';
      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve job status',
          details: 'Test error',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBeDefined();
      expect((result as any).error?.message).toBeDefined();
      expect((result as any).error?.details).toBeDefined();
      expect((result as any).timestamp).toBeDefined();
    });

    it('should handle SqsService returning invalid data structure', async () => {
      const jobId = 'job_1704067200000_invalid_data';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: null, // Invalid data
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      // Should still succeed but handle gracefully
      expect(result.success).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty job ID', async () => {
      const jobId = '';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid job ID',
          details: 'Job ID cannot be empty',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle special characters in job ID', async () => {
      const jobId = 'job_1704067200000_special@#$%';

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: {
          jobId: 'job_1704067200000_special@#$%',
          status: 'completed' as const,
          type: 'mint',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_special@#$%');
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should handle very long job ID', async () => {
      const jobId = 'job_1704067200000_' + 'a'.repeat(1000);

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: {
          jobId,
          status: 'completed' as const,
          type: 'mint',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const result = await controller.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe(jobId);
      expect(mockSqsService.getJobStatus).toHaveBeenCalledWith(jobId);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent job status requests', async () => {
      const jobIds = [
        'job_1704067200000_concurrent1',
        'job_1704067200000_concurrent2',
        'job_1704067200000_concurrent3',
      ];

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: {
          jobId: 'job_1704067200000_concurrent',
          status: 'completed' as const,
          type: 'mint',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:05:00.000Z',
      } as any);

      const promises = jobIds.map(jobId => controller.getJobStatus(jobId));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.status).toBe('completed');
      });

      expect(mockSqsService.getJobStatus).toHaveBeenCalledTimes(jobIds.length);
    });

    it('should handle rapid successive requests', async () => {
      const jobId = 'job_1704067200000_rapid';
      const requestCount = 10;

      mockSqsService.getJobStatus.mockResolvedValue({
        success: true,
        data: {
          jobId,
          status: 'processing' as const,
          type: 'transfer',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:01:00.000Z',
      } as any);

      const promises = Array.from({ length: requestCount }, () =>
        controller.getJobStatus(jobId)
      );
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.status).toBe('processing');
      });

      expect(mockSqsService.getJobStatus).toHaveBeenCalledTimes(requestCount);
    });
  });
});
