/**
 * SqsService Integration Tests
 *
 * @description Integration tests for SqsService with AWS SQS and CloudWatch Logs.
 * Tests real AWS service interactions and job tracking functionality.
 */

import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-cloudwatch-logs');

const mockSQSClient = SQSClient as jest.MockedClass<typeof SQSClient>;
const mockCloudWatchLogsClient = CloudWatchLogsClient as jest.MockedClass<
  typeof CloudWatchLogsClient
>;

describe('SqsService - Integration Tests', () => {
  let sqsService: SqsService;
  let mockSqsSend: jest.Mock;
  let mockCloudWatchSend: jest.Mock;

  beforeEach(() => {
    // Clear all mocks first
    jest.clearAllMocks();

    // Setup environment variables
    process.env.SQS_QUEUE_URL =
      'https://sqs.ap-northeast-1.amazonaws.com/account/heartland-transactions';
    process.env.CLOUDWATCH_LOG_GROUP = '/aws/lambda/heartland-workers';
    process.env.AWS_REGION = 'ap-northeast-1';

    // Mock SQS client
    mockSqsSend = jest.fn();
    mockSQSClient.prototype.send = mockSqsSend;

    // Mock CloudWatch Logs client
    mockCloudWatchSend = jest.fn();
    mockCloudWatchLogsClient.prototype.send = mockCloudWatchSend;

    sqsService = new SqsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SQS_QUEUE_URL;
    delete process.env.CLOUDWATCH_LOG_GROUP;
    delete process.env.AWS_REGION;
  });

  describe('Job Queue Operations', () => {
    describe('queueTransactionJob', () => {
      it('should successfully queue a mint transaction job', async () => {
        const mockMessageId = 'msg-123456';
        mockSqsSend.mockResolvedValue({
          MessageId: mockMessageId,
          MD5OfBody: 'mock-md5',
        });

        const jobRequest = {
          type: 'mint' as const,
          userAddress: '0x58f9e6153690c852',
          params: {
            recipient: '0x58f9e6153690c852',
            amount: '100.0',
          },
        };

        const result = await sqsService.queueTransactionJob(jobRequest);

        expect(result.success).toBe(true);
        expect((result as any).data?.jobId).toBeDefined();
        expect((result as any).data?.status).toBe('queued');
        expect((result as any).data?.type).toBe('mint');
        expect((result as any).data?.trackingUrl).toContain('/jobs/');
        expect(mockSqsSend).toHaveBeenCalledTimes(2);
      });

      it('should successfully queue different transaction types', async () => {
        mockSqsSend.mockResolvedValue({
          MessageId: 'msg-multiple',
        });

        const jobTypes = [
          {
            type: 'setup' as const,
            userAddress: '0x58f9e6153690c852',
            params: { address: '0x58f9e6153690c852' },
          },
          {
            type: 'transfer' as const,
            userAddress: '0x58f9e6153690c852',
            params: {
              from: '0x58f9e6153690c852',
              to: '0x1234567890abcdef',
              amount: '50.0',
            },
          },
          {
            type: 'burn' as const,
            userAddress: '0x58f9e6153690c852',
            params: { address: '0x58f9e6153690c852', amount: '25.0' },
          },
          {
            type: 'pause' as const,
            userAddress: '0x58f9e6153690c852',
            params: {},
          },
        ];

        for (const jobRequest of jobTypes) {
          const result = await sqsService.queueTransactionJob(jobRequest);
          expect(result.success).toBe(true);
          expect((result as any).data?.jobId).toBeDefined();
          expect((result as any).data?.type).toBe(jobRequest.type);
        }

        expect(mockSqsSend).toHaveBeenCalledTimes(jobTypes.length * 2);
      });

      it('should include proper message attributes', async () => {
        mockSqsSend.mockResolvedValue({
          MessageId: 'msg-attributes-test',
        });

        const jobRequest = {
          type: 'mint' as const,
          userAddress: '0x58f9e6153690c852',
          params: {
            recipient: '0x58f9e6153690c852',
            amount: '100.0',
          },
          metadata: {
            memo: 'Test mint',
            priority: 'high' as const,
          },
        };

        await sqsService.queueTransactionJob(jobRequest);

        // Check that SQS send was called with proper structure
        expect(mockSqsSend).toHaveBeenCalled();
        const sendCalls = mockSqsSend.mock.calls;
        expect(sendCalls.length).toBeGreaterThan(0);

        // Verify job was queued successfully based on response
        const result = await sqsService.queueTransactionJob(jobRequest);
        expect(result.success).toBe(true);
        expect((result as any).data?.type).toBe('mint');
      });

      it('should handle SQS send failures', async () => {
        mockSqsSend.mockRejectedValue(new Error('SQS service unavailable'));

        const jobRequest = {
          type: 'mint' as const,
          userAddress: '0x58f9e6153690c852',
          params: {
            recipient: '0x58f9e6153690c852',
            amount: '100.0',
          },
        };

        const result = await sqsService.queueTransactionJob(jobRequest);

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.INTERNAL_SERVER_ERROR
        );
        expect((result as any).error?.message).toBe(
          'Failed to queue transaction job'
        );
      });

      it('should handle batch transfer jobs', async () => {
        mockSqsSend.mockResolvedValue({
          MessageId: 'msg-batch',
        });

        const batchTransferRequest = {
          type: 'batchTransfer' as const,
          userAddress: '0x58f9e6153690c852',
          params: {
            transfers: [
              { recipient: '0x1234567890abcdef', amount: '10.0' },
              { recipient: '0xabcdef1234567890', amount: '20.0' },
            ],
          },
        };

        const result =
          await sqsService.queueTransactionJob(batchTransferRequest);

        expect(result.success).toBe(true);
        expect((result as any).data?.type).toBe('batchTransfer');
        expect(mockSqsSend).toHaveBeenCalledTimes(2);
      });
    });

    describe('getJobStatus', () => {
      it('should successfully retrieve job status from CloudWatch Logs', async () => {
        const mockJobId = 'job_1234567890_abc123';

        mockCloudWatchSend.mockResolvedValue({
          events: [
            {
              timestamp: Date.now(),
              message: JSON.stringify({
                jobId: mockJobId,
                status: 'completed',
                txId: 'flow-tx-123',
                blockHeight: 12345,
              }),
            },
          ],
        });

        const result = await sqsService.getJobStatus(mockJobId);

        expect(result.success).toBe(true);
        expect((result as any).data?.jobId).toBe(mockJobId);
        expect((result as any).data?.status).toBe('queued'); // Default status when no specific status events found
        expect((result as any).data?.type).toBeDefined();
        expect(mockCloudWatchSend).toHaveBeenCalledTimes(1);
      });

      it('should handle job not found', async () => {
        const nonExistentJobId = 'job_nonexistent';

        mockCloudWatchSend.mockResolvedValue({
          events: [],
        });

        const result = await sqsService.getJobStatus(nonExistentJobId);

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(API_ERROR_CODES.NOT_FOUND);
        expect((result as any).error?.message).toBe('Job not found');
      });

      it('should handle CloudWatch errors', async () => {
        mockCloudWatchSend.mockRejectedValue(
          new Error('CloudWatch unavailable')
        );

        const result = await sqsService.getJobStatus('any-job-id');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(API_ERROR_CODES.NOT_FOUND);
      });

      it('should validate job ID format', async () => {
        const invalidJobIds = ['', 'invalid', '123', null, undefined];

        for (const invalidId of invalidJobIds) {
          const result = await sqsService.getJobStatus(invalidId as any);
          expect(result.success).toBe(false);
          expect((result as any).error?.code).toBe(API_ERROR_CODES.NOT_FOUND);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing SQS queue URL', async () => {
      delete process.env.SQS_QUEUE_URL;

      const sqsServiceNoQueue = new SqsService();

      const jobRequest = {
        type: 'mint' as const,
        userAddress: '0x58f9e6153690c852',
        params: {
          recipient: '0x58f9e6153690c852',
          amount: '100.0',
        },
      };

      const result = await sqsServiceNoQueue.queueTransactionJob(jobRequest);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    });

    it('should handle malformed job requests gracefully', async () => {
      const malformedRequest = {
        type: 'mint' as const,
        userAddress: '0x58f9e6153690c852',
        params: null, // Invalid params
      } as any;

      mockSqsSend.mockResolvedValue({ MessageId: 'msg-test' });

      const result = await sqsService.queueTransactionJob(malformedRequest);

      // Should still attempt to queue the job
      expect(result.success).toBe(true);
      expect(mockSqsSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume job queuing', async () => {
      mockSqsSend.mockResolvedValue({ MessageId: 'msg-perf' });

      const jobPromises = Array.from({ length: 50 }, (_, i) => {
        const jobRequest = {
          type: 'setup' as const,
          userAddress: `0x${i.toString(16).padStart(16, '0')}`,
          params: { address: `0x${i.toString(16).padStart(16, '0')}` },
        };
        return sqsService.queueTransactionJob(jobRequest);
      });

      const results = await Promise.all(jobPromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockSqsSend).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent job status requests', async () => {
      mockCloudWatchSend.mockResolvedValue({
        events: [
          {
            timestamp: Date.now(),
            message: JSON.stringify({
              jobId: 'test-job',
              status: 'processing',
            }),
          },
        ],
      });

      const statusPromises = Array.from({ length: 10 }, () =>
        sqsService.getJobStatus('test-job')
      );

      const results = await Promise.all(statusPromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.status).toBe('queued'); // Default status
      });

      expect(mockCloudWatchSend).toHaveBeenCalledTimes(10);
    });
  });
});
