/**
 * SetTreasuryController Unit Tests
 *
 * @description Comprehensive tests for SetTreasuryController including
 * treasury account validation, job queuing, and error handling scenarios
 */

import { SetTreasuryController } from '../../../src/controllers/transactions/SetTreasuryController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('SetTreasuryController', () => {
  let controller: SetTreasuryController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new SetTreasuryController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('setTreasury', () => {
    it('should queue set treasury job successfully', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settreasury123',
        status: 'queued',
        type: 'setTreasury',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settreasury123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Update treasury account',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe(
        'job_1704067200000_settreasury123'
      );
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('setTreasury');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_settreasury123'
      );
      expect((result as any).data?.queuePosition).toBe(1);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTreasury',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTreasuryAccount: '0x1234567890abcdef',
          memo: 'Update treasury account',
        },
        metadata: {
          memo: 'Update treasury account',
          priority: 'high',
        },
      });
    });

    it('should queue set treasury job without memo', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settreasury456',
        status: 'queued',
        type: 'setTreasury',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settreasury456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0xabcdef1234567890',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTreasury',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTreasuryAccount: '0xabcdef1234567890',
          memo: undefined,
        },
        metadata: {
          memo: 'Set HEART token treasury account to 0xabcdef1234567890',
          priority: 'high',
        },
      });
    });

    it('should use ADMIN_ADDRESS from environment when available', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const mockJobData = {
        jobId: 'job_1704067200000_settreasury789',
        status: 'queued',
        type: 'setTreasury',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settreasury789',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0x9876543210fedcba',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTreasury',
        userAddress: '0x1234567890abcdef',
        params: {
          newTreasuryAccount: '0x9876543210fedcba',
          memo: undefined,
        },
        metadata: {
          memo: 'Set HEART token treasury account to 0x9876543210fedcba',
          priority: 'high',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should validate missing newTreasuryAccount', async () => {
      const request = {
        newTreasuryAccount: '',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'New treasury account is required'
      );
      expect((result as any).error?.details).toBe(
        'Treasury account address must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null newTreasuryAccount', async () => {
      const request = {
        newTreasuryAccount: null as any,
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'New treasury account is required'
      );
      expect((result as any).error?.details).toBe(
        'Treasury account address must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined newTreasuryAccount', async () => {
      const request = {
        newTreasuryAccount: undefined as any,
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'New treasury account is required'
      );
      expect((result as any).error?.details).toBe(
        'Treasury account address must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate whitespace-only newTreasuryAccount', async () => {
      const request = {
        newTreasuryAccount: '   ',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'New treasury account is required'
      );
      expect((result as any).error?.details).toBe(
        'Treasury account address must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address without 0x prefix', async () => {
      const request = {
        newTreasuryAccount: '1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid treasury account address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with wrong length', async () => {
      const request = {
        newTreasuryAccount: '0x1234567890abcdef12', // 20 characters
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid treasury account address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address too short', async () => {
      const request = {
        newTreasuryAccount: '0x1234567890', // 12 characters
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid treasury account address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with invalid characters', async () => {
      const request = {
        newTreasuryAccount: '0x1234567890abcdefg', // contains 'g'
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid treasury account address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should accept valid Flow addresses', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settreasury_valid',
        status: 'queued',
        type: 'setTreasury',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settreasury_valid',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test various valid Flow addresses
      const validAddresses = [
        '0x1234567890abcdef',
        '0xabcdef1234567890',
        '0x0000000000000000',
        '0xffffffffffffffff',
        '0x1234567890ABCDEF', // uppercase
      ];

      for (const address of validAddresses) {
        const request = { newTreasuryAccount: address };
        const result = await controller.setTreasury(request);
        expect(result.success).toBe(true);
      }

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(5);
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

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTreasury',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTreasuryAccount: '0x1234567890abcdef',
          memo: 'Test memo',
        },
        metadata: {
          memo: 'Test memo',
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

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process set treasury request'
      );
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process set treasury request'
      );
      expect((result as any).error?.details).toBe('Unknown error occurred');
    });

    it('should handle null response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(null as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set treasury job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle undefined response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(undefined as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set treasury job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle response without success property', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        data: {
          jobId: 'job_1704067200000_settreasury_malformed',
          status: 'queued',
          type: 'setTreasury',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set treasury job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle insufficient permissions error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin permissions required',
          details: 'This operation requires ADMIN role capability',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect((result as any).error?.message).toBe('Admin permissions required');
      expect((result as any).error?.details).toBe(
        'This operation requires ADMIN role capability'
      );
    });

    it('should handle contract state validation error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'CONTRACT_STATE_ERROR',
          message: 'Invalid contract state for treasury change',
          details: 'Contract must be unpaused to change treasury account',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTreasuryAccount: '0x1234567890abcdef',
        memo: 'Test memo',
      };

      const result = await controller.setTreasury(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('CONTRACT_STATE_ERROR');
      expect((result as any).error?.message).toBe(
        'Invalid contract state for treasury change'
      );
      expect((result as any).error?.details).toBe(
        'Contract must be unpaused to change treasury account'
      );
    });
  });
});
