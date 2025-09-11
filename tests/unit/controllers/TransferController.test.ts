/**
 * TransferController Unit Tests
 *
 * @description Comprehensive tests for TransferController including
 * transfer validation, job queuing, and error handling scenarios
 */

import { TransferController } from '../../../src/controllers/transactions/TransferController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('TransferController', () => {
  let controller: TransferController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new TransferController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('transferTokens', () => {
    it('should queue transfer job successfully', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_transfer123',
        status: 'queued',
        type: 'transfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_transfer123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test transfer',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_transfer123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('transfer');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_transfer123'
      );
      expect((result as any).data?.queuePosition).toBe(1);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'transfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          recipient: '0x1234567890abcdef',
          amount: '100.0',
          memo: 'Test transfer',
        },
        metadata: {
          memo: 'Test transfer',
          priority: 'normal',
        },
      });
    });

    it('should queue transfer job without memo', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_transfer456',
        status: 'queued',
        type: 'transfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_transfer456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0xabcdef1234567890',
        amount: '50.0',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'transfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          recipient: '0xabcdef1234567890',
          amount: '50.0',
          memo: undefined,
        },
        metadata: {
          memo: 'Transfer 50.0 HEART tokens to 0xabcdef1234567890',
          priority: 'normal',
        },
      });
    });

    it('should use ADMIN_ADDRESS from environment when available', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const mockJobData = {
        jobId: 'job_1704067200000_transfer789',
        status: 'queued',
        type: 'transfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_transfer789',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x9876543210fedcba',
        amount: '75.0',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'transfer',
        userAddress: '0x1234567890abcdef',
        params: {
          recipient: '0x9876543210fedcba',
          amount: '75.0',
          memo: undefined,
        },
        metadata: {
          memo: 'Transfer 75.0 HEART tokens to 0x9876543210fedcba',
          priority: 'normal',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should validate missing recipient', async () => {
      const request = {
        recipient: '',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate missing amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: '',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null recipient', async () => {
      const request = {
        recipient: null as any,
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: null as any,
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined recipient', async () => {
      const request = {
        recipient: undefined as any,
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: undefined as any,
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required parameters'
      );
      expect((result as any).error?.details).toBe(
        'Both recipient and amount are required'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate invalid amount format (NaN)', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: 'invalid',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate negative amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: '-50.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate zero amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: '0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate Infinity amount', async () => {
      const request = {
        recipient: '0x1234567890abcdef',
        amount: 'Infinity',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address without 0x prefix', async () => {
      const request = {
        recipient: '1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with wrong length', async () => {
      const request = {
        recipient: '0x1234567890abcdef12', // 20 characters
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address too short', async () => {
      const request = {
        recipient: '0x1234567890', // 12 characters
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with invalid characters', async () => {
      const request = {
        recipient: '0x1234567890abcdefg', // contains 'g'
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should prevent self-transfer', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const request = {
        recipient: '0x1234567890abcdef', // Same as ADMIN_ADDRESS
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe('Self-transfer not allowed');
      expect((result as any).error?.details).toBe(
        'Cannot transfer tokens to the same address'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should prevent self-transfer with case insensitive comparison', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const request = {
        recipient: '0x1234567890ABCDEF', // Same as ADMIN_ADDRESS but uppercase
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe('Self-transfer not allowed');
      expect((result as any).error?.details).toBe(
        'Cannot transfer tokens to the same address'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should accept valid Flow addresses', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_transfer_valid',
        status: 'queued',
        type: 'transfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_transfer_valid',
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
        const request = { recipient: address, amount: '100.0' };
        const result = await controller.transferTokens(request);
        expect(result.success).toBe(true);
      }

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(5);
    });

    it('should accept valid amounts', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_transfer_amount',
        status: 'queued',
        type: 'transfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_transfer_amount',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test various valid amounts
      const validAmounts = [
        '0.00000001', // Very small amount
        '1.0',
        '100.0',
        '1000.0',
        '999999.99', // Large amount
      ];

      for (const amount of validAmounts) {
        const request = { recipient: '0x1234567890abcdef', amount };
        const result = await controller.transferTokens(request);
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
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'transfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          recipient: '0x1234567890abcdef',
          amount: '100.0',
          memo: 'Test memo',
        },
        metadata: {
          memo: 'Test memo',
          priority: 'normal',
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
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle null response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(null as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle undefined response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(undefined as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle response without success property', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        data: {
          jobId: 'job_1704067200000_transfer_malformed',
          status: 'queued',
          type: 'transfer',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle insufficient balance error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for transfer',
          details: 'Account balance is less than transfer amount plus tax',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('INSUFFICIENT_BALANCE');
      expect((result as any).error?.message).toBe(
        'Insufficient balance for transfer'
      );
      expect((result as any).error?.details).toBe(
        'Account balance is less than transfer amount plus tax'
      );
    });

    it('should handle recipient account not found error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Recipient account not found',
          details:
            'The specified recipient address does not exist on Flow network',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('ACCOUNT_NOT_FOUND');
      expect((result as any).error?.message).toBe(
        'Recipient account not found'
      );
      expect((result as any).error?.details).toBe(
        'The specified recipient address does not exist on Flow network'
      );
    });

    it('should handle contract paused error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'CONTRACT_PAUSED',
          message: 'Contract is paused',
          details:
            'Token transfers are currently disabled due to contract pause',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('CONTRACT_PAUSED');
      expect((result as any).error?.message).toBe('Contract is paused');
      expect((result as any).error?.details).toBe(
        'Token transfers are currently disabled due to contract pause'
      );
    });

    it('should handle network error', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe(
        'Network error: ECONNREFUSED'
      );
    });

    it('should handle AWS SDK error', async () => {
      const awsError = new Error('AWS SDK error');
      (awsError as any).code = 'NetworkingError';
      (awsError as any).statusCode = 500;

      mockSqsService.queueTransactionJob.mockRejectedValue(awsError);

      const request = {
        recipient: '0x1234567890abcdef',
        amount: '100.0',
        memo: 'Test memo',
      };

      const result = await controller.transferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue transfer job'
      );
      expect((result as any).error?.details).toBe('AWS SDK error');
    });
  });
});
