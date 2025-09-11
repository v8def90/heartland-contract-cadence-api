/**
 * BatchTransferController Unit Tests
 *
 * @description Comprehensive tests for BatchTransferController including
 * batch transfer validation, job queuing, and error handling scenarios
 */

import { BatchTransferController } from '../../../src/controllers/transactions/BatchTransferController';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock SqsService
jest.mock('../../../src/services/SqsService');

describe('BatchTransferController', () => {
  let controller: BatchTransferController;
  let mockSqsService: jest.Mocked<SqsService>;

  beforeEach(() => {
    controller = new BatchTransferController();
    mockSqsService = jest.mocked(controller['sqsService']);
    // Clear only the call history, not the mock implementations
    mockSqsService.queueTransactionJob.mockClear();
  });

  describe('batchTransferTokens', () => {
    it('should queue batch transfer job successfully', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_batch123',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch123',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test batch transfer',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);
      expect((result as any).data?.jobId).toBe('job_1704067200000_batch123');
      expect((result as any).data?.status).toBe('queued');
      expect((result as any).data?.type).toBe('batchTransfer');
      expect((result as any).data?.trackingUrl).toBe(
        '/jobs/job_1704067200000_batch123'
      );
      expect((result as any).data?.queuePosition).toBe(1);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'batchTransfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          transfers: [
            { recipient: '0x1234567890abcdef', amount: '100.0' },
            { recipient: '0xabcdef1234567890', amount: '200.0' },
          ],
          memo: 'Test batch transfer',
        },
        metadata: {
          memo: 'Test batch transfer',
          priority: 'normal',
        },
      });
    });

    it('should queue batch transfer job without memo', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_batch456',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch456',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '50.0' },
          { recipient: '0xabcdef1234567890', amount: '75.0' },
        ],
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'batchTransfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          transfers: [
            { recipient: '0x1234567890abcdef', amount: '50.0' },
            { recipient: '0xabcdef1234567890', amount: '75.0' },
          ],
          memo: undefined,
        },
        metadata: {
          memo: 'Batch transfer to 2 recipients (total: 125.00 HEART)',
          priority: 'normal',
        },
      });
    });

    it('should use ADMIN_ADDRESS from environment when available', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const mockJobData = {
        jobId: 'job_1704067200000_batch789',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch789',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [{ recipient: '0x9876543210fedcba', amount: '100.0' }],
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'batchTransfer',
        userAddress: '0x1234567890abcdef',
        params: {
          transfers: [{ recipient: '0x9876543210fedcba', amount: '100.0' }],
          memo: undefined,
        },
        metadata: {
          memo: 'Batch transfer to 1 recipients (total: 100.00 HEART)',
          priority: 'normal',
        },
      });

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should validate missing transfers array', async () => {
      const request = {
        transfers: null as any,
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Transfer list is required');
      expect((result as any).error?.details).toBe(
        'At least one transfer must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined transfers array', async () => {
      const request = {
        transfers: undefined as any,
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Transfer list is required');
      expect((result as any).error?.details).toBe(
        'At least one transfer must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate empty transfers array', async () => {
      const request = {
        transfers: [],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Transfer list is required');
      expect((result as any).error?.details).toBe(
        'At least one transfer must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate non-array transfers', async () => {
      const request = {
        transfers: 'not an array' as any,
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Transfer list is required');
      expect((result as any).error?.details).toBe(
        'At least one transfer must be specified'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate batch size exceeds maximum limit', async () => {
      const transfers = Array.from({ length: 51 }, (_, i) => ({
        recipient: `0x${i.toString().padStart(16, '0')}`,
        amount: '1.0',
      }));

      const request = {
        transfers,
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe(
        'Batch transfer size exceeds maximum limit'
      );
      expect((result as any).error?.details).toBe(
        'Maximum 50 recipients allowed per batch transfer'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate batch size at maximum limit (50)', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_batch_max',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch_max',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const transfers = Array.from({ length: 50 }, (_, i) => ({
        recipient: `0x${i.toString().padStart(16, '0')}`,
        amount: '1.0',
      }));

      const request = {
        transfers,
        memo: 'Test max batch',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(1);
    });

    it('should validate missing transfer item', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          null as any,
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe('Invalid transfer item');
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 is missing'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate missing recipient in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate missing amount in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null recipient in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: null as any, amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate null amount in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: null as any },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined recipient in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: undefined as any, amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate undefined amount in transfer', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: undefined as any },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD
      );
      expect((result as any).error?.message).toBe(
        'Missing required transfer parameters'
      );
      expect((result as any).error?.details).toBe(
        'Transfer at index 1 must have both recipient and amount'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate invalid amount format (NaN)', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: 'invalid' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount at index 1 must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate negative amount', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '-50.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount at index 1 must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate zero amount', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount at index 1 must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate Infinity amount', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: 'Infinity' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
      expect((result as any).error?.message).toBe('Invalid transfer amount');
      expect((result as any).error?.details).toBe(
        'Amount at index 1 must be a positive finite number greater than 0'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address without 0x prefix', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '1234567890abcdef', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address at index 1 must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with wrong length', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0x1234567890abcdef12', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address at index 1 must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address too short', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0x1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address at index 1 must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should validate address with invalid characters', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0x1234567890abcdefg', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect((result as any).error?.message).toBe(
        'Invalid recipient address format'
      );
      expect((result as any).error?.details).toBe(
        'Address at index 1 must be 18 characters long and start with 0x'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should prevent duplicate recipients', async () => {
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0x1234567890ABCDEF', amount: '200.0' }, // Same address, different case
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe(
        'Duplicate recipients not allowed'
      );
      expect((result as any).error?.details).toBe(
        'Each recipient address must be unique in the batch'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();
    });

    it('should prevent self-transfer', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' }, // Same as ADMIN_ADDRESS
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe('Self-transfer not allowed');
      expect((result as any).error?.details).toBe(
        'Cannot transfer tokens to the sender address'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should prevent self-transfer with case insensitive comparison', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x1234567890abcdef';

      const request = {
        transfers: [
          { recipient: '0x1234567890ABCDEF', amount: '100.0' }, // Same as ADMIN_ADDRESS but uppercase
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_OPERATION
      );
      expect((result as any).error?.message).toBe('Self-transfer not allowed');
      expect((result as any).error?.details).toBe(
        'Cannot transfer tokens to the sender address'
      );

      expect(mockSqsService.queueTransactionJob).not.toHaveBeenCalled();

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should accept valid Flow addresses', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x58f9e6153690c852';

      const mockJobData = {
        jobId: 'job_1704067200000_batch_valid',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch_valid',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test various valid Flow addresses
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
          { recipient: '0x0000000000000000', amount: '300.0' },
          { recipient: '0xffffffffffffffff', amount: '400.0' },
          { recipient: '0x1111111111111111', amount: '500.0' }, // Changed to avoid duplicate
        ],
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(1);

      // Restore original value
      process.env.ADMIN_ADDRESS = originalAdminAddress;
    });

    it('should accept valid amounts', async () => {
      const mockJobData = {
        jobId: 'job_1704067200000_batch_amount',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch_amount',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test various valid amounts
      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '0.00000001' }, // Very small amount
          { recipient: '0xabcdef1234567890', amount: '1.0' },
          { recipient: '0x0000000000000000', amount: '100.0' },
          { recipient: '0xffffffffffffffff', amount: '1000.0' },
          { recipient: '0x1111111111111111', amount: '999999.99' }, // Large amount
        ],
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledTimes(1);
    });

    it('should calculate total amount correctly', async () => {
      const originalAdminAddress = process.env.ADMIN_ADDRESS;
      process.env.ADMIN_ADDRESS = '0x58f9e6153690c852';

      const mockJobData = {
        jobId: 'job_1704067200000_batch_total',
        status: 'queued',
        type: 'batchTransfer',
        estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
        trackingUrl: '/jobs/job_1704067200000_batch_total',
        queuePosition: 1,
      };

      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: true,
        data: mockJobData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.5' },
          { recipient: '0xabcdef1234567890', amount: '200.25' },
          { recipient: '0x0000000000000000', amount: '50.75' },
        ],
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(true);

      // Check that the memo includes the correct total amount
      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'batchTransfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          transfers: [
            { recipient: '0x1234567890abcdef', amount: '100.5' },
            { recipient: '0xabcdef1234567890', amount: '200.25' },
            { recipient: '0x0000000000000000', amount: '50.75' },
          ],
          memo: undefined,
        },
        metadata: {
          memo: 'Batch transfer to 3 recipients (total: 351.50 HEART)',
          priority: 'normal',
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

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('SQS_ERROR');
      expect((result as any).error?.message).toBe('Failed to queue job');

      expect(mockSqsService.queueTransactionJob).toHaveBeenCalledWith({
        type: 'batchTransfer',
        userAddress: '0x58f9e6153690c852',
        params: {
          transfers: [
            { recipient: '0x1234567890abcdef', amount: '100.0' },
            { recipient: '0xabcdef1234567890', amount: '200.0' },
          ],
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
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process batch transfer request'
      );
      expect((result as any).error?.details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockSqsService.queueTransactionJob.mockRejectedValue('String error');

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process batch transfer request'
      );
      expect((result as any).error?.details).toBe('Unknown error occurred');
    });

    it('should handle null response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(null as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue batch transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle undefined response from SQS service', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue(undefined as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue batch transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle response without success property', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        data: {
          jobId: 'job_1704067200000_batch_malformed',
          status: 'queued',
          type: 'batchTransfer',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to queue batch transfer job'
      );
      expect((result as any).error?.details).toBe('Unknown error');
    });

    it('should handle insufficient balance error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for batch transfer',
          details:
            'Account balance is less than total transfer amount plus tax',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('INSUFFICIENT_BALANCE');
      expect((result as any).error?.message).toBe(
        'Insufficient balance for batch transfer'
      );
      expect((result as any).error?.details).toBe(
        'Account balance is less than total transfer amount plus tax'
      );
    });

    it('should handle recipient account not found error', async () => {
      mockSqsService.queueTransactionJob.mockResolvedValue({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Recipient account not found',
          details:
            'One or more recipient addresses do not exist on Flow network',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const request = {
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('ACCOUNT_NOT_FOUND');
      expect((result as any).error?.message).toBe(
        'Recipient account not found'
      );
      expect((result as any).error?.details).toBe(
        'One or more recipient addresses do not exist on Flow network'
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
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

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
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process batch transfer request'
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
        transfers: [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        memo: 'Test memo',
      };

      const result = await controller.batchTransferTokens(request);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
      expect((result as any).error?.message).toBe(
        'Failed to process batch transfer request'
      );
      expect((result as any).error?.details).toBe('AWS SDK error');
    });
  });
});
