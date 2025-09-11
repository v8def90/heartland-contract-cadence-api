/**
 * SetTaxRateController Unit Tests
 *
 * @description Comprehensive tests for SetTaxRateController including
 * tax rate validation, job queuing, and error handling scenarios
 */

import { SetTaxRateController } from '../../../src/controllers/transactions/SetTaxRateController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('SetTaxRateController', () => {
  let controller: SetTaxRateController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new SetTaxRateController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('setTaxRate', () => {
    it('should queue set tax rate job successfully', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settax123',
        status: 'queued',
        type: 'setTaxRate',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settax123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Update tax rate to 5%',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_settax123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('setTaxRate');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_settax123'
      );
      expect((result as any).data?.queuePosition).toBe(1);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTaxRate',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTaxRate: '5.0',
          memo: 'Update tax rate to 5%',
        },
        metadata: {
          memo: 'Update tax rate to 5%',
          priority: 'high',
        },
      });
    });

    it('should queue set tax rate job without memo', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settax456',
        status: 'queued',
        type: 'setTaxRate',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settax456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '10.5',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTaxRate',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTaxRate: '10.5',
          memo: undefined,
        },
        metadata: {
          memo: 'Set HEART token tax rate to 10.5%',
          priority: 'high',
        },
      });
    });

    it('should use ADMIN_ADDRESS from environment when available', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const mockJobData = {
        jobId: 'job_1704067200000_settax789',
        status: 'queued',
        type: 'setTaxRate',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settax789',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '7.5',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTaxRate',
        userAddress: '0x1234567890abcdef',
        params: {
          newTaxRate: '7.5',
          memo: undefined,
        },
        metadata: {
          memo: 'Set HEART token tax rate to 7.5%',
          priority: 'high',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should validate missing newTaxRate', async () => {
      const request = {
        newTaxRate: '',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('New tax rate is required');
      expect((result as any).error?.details).toBe(
        'Tax rate value must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null newTaxRate', async () => {
      const request = {
        newTaxRate: null as any,
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('New tax rate is required');
      expect((result as any).error?.details).toBe(
        'Tax rate value must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined newTaxRate', async () => {
      const request = {
        newTaxRate: undefined as any,
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('New tax rate is required');
      expect((result as any).error?.details).toBe(
        'Tax rate value must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate whitespace-only newTaxRate', async () => {
      const request = {
        newTaxRate: '   ',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('New tax rate is required');
      expect((result as any).error?.details).toBe(
        'Tax rate value must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate invalid tax rate format (NaN)', async () => {
      const request = {
        newTaxRate: 'invalid',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid tax rate');
      expect((result as any).error?.details).toBe(
        'Tax rate must be a number between 0.0 and 100.0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate negative tax rate', async () => {
      const request = {
        newTaxRate: '-5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid tax rate');
      expect((result as any).error?.details).toBe(
        'Tax rate must be a number between 0.0 and 100.0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate tax rate over 100', async () => {
      const request = {
        newTaxRate: '150.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid tax rate');
      expect((result as any).error?.details).toBe(
        'Tax rate must be a number between 0.0 and 100.0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should accept valid tax rate at boundary values', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_settax_boundary',
        status: 'queued',
        type: 'setTaxRate',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_settax_boundary',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test 0.0
      const requestZero = { newTaxRate: '0.0' };
      const resultZero = await controller.setTaxRate(requestZero);
      expect(resultZero.success).toBe(true);

      // Test 100.0
      const requestHundred = { newTaxRate: '100.0' };
      const resultHundred = await controller.setTaxRate(requestHundred);
      expect(resultHundred.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(2);
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
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'setTaxRate',
        userAddress: '0x58f9e6153690c852',
        params: {
          newTaxRate: '5.0',
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
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set tax rate job'
      );
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set tax rate job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle null response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(null as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set tax rate job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle undefined response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(undefined as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set tax rate job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle response without success property', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        data: {
          jobId: 'job_1704067200000_settax_malformed',
          status: 'queued',
          type: 'setTaxRate',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue set tax rate job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle insufficient permissions error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for tax rate change',
          details: 'Account does not have ADMIN role capability',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect((result as any).error?.message).toBe(
        'Insufficient permissions for tax rate change'
      );
      expect((result as any).error?.details).toBe(
        'Account does not have ADMIN role capability'
      );
    });

    it('should handle contract state validation error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'CONTRACT_STATE_ERROR',
          message: 'Invalid contract state for tax rate change',
          details: 'Contract must be unpaused to change tax rate',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        newTaxRate: '5.0',
        memo: 'Test memo',
      };

      const result = await controller.setTaxRate(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('CONTRACT_STATE_ERROR');
      expect((result as any).error?.message).toBe(
        'Invalid contract state for tax rate change'
      );
      expect((result as any).error?.details).toBe(
        'Contract must be unpaused to change tax rate'
      );
    });
  });
});
