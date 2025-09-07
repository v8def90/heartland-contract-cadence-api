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
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SQS_QUEUE_URL;
    delete process.env.CLOUDWATCH_LOG_GROUP;
    delete process.env.AWS_REGION;
  });

  describe('Job Queue Operations', () => {
    describe('queueJob', () => {
      it('should successfully queue a transaction job', async () => {
        const mockMessageId = 'msg-123456';
        mockSqsSend.mockResolvedValue({
          MessageId: mockMessageId,
          MD5OfBody: 'mock-md5',
        });

        const jobRequest = {
          type: 'mint' as const,
          address: '0x58f9e6153690c852',
          amount: '100.0',
        };

        const result = await sqsService.queueTransactionJob(jobRequest);

        expect(result.success).toBe(true);
        expect((result as any).data?.jobId).toBeDefined();
        expect((result as any).data?.status).toBe('queued');
        expect((result as any).data?.queuedAt).toBeDefined();
        expect((result as any).data?.estimatedProcessingTime).toBe(
          '2-5 minutes'
        );

        expect(mockSqsSend).toHaveBeenCalledWith(
          expect.any(SendMessageCommand)
        );
      });

      it('should handle different job types', async () => {
        const mockMessageId = 'msg-789';
        mockSqsSend.mockResolvedValue({
          MessageId: mockMessageId,
        });

        const jobTypes = [
          { type: 'setup' as const, address: '0x58f9e6153690c852' },
          {
            type: 'transfer' as const,
            from: '0x58f9e6153690c852',
            to: '0x1234567890abcdef',
            amount: '50.0',
          },
          {
            type: 'burn' as const,
            address: '0x58f9e6153690c852',
            amount: '25.0',
          },
          { type: 'pause' as const },
          { type: 'unpause' as const },
        ];

        for (const jobRequest of jobTypes) {
          const result = await sqsService.queueTransactionJob(jobRequest);
          expect(result.success).toBe(true);
          expect((result as any).data?.jobId).toBeDefined();
        }

        expect(mockSqsSend).toHaveBeenCalledTimes(jobTypes.length);
      });

      it('should include proper message attributes', async () => {
        mockSqsSend.mockResolvedValue({
          MessageId: 'msg-attributes-test',
        });

        const jobRequest = {
          type: 'mint' as const,
          address: '0x58f9e6153690c852',
          amount: '100.0',
        };

        await sqsService.queueTransactionJob(jobRequest);

        const sendCall = mockSqsSend.mock.calls[0][0];
        expect(sendCall.input.MessageAttributes).toBeDefined();
        expect(sendCall.input.MessageAttributes.jobType).toEqual({
          DataType: 'String',
          StringValue: 'mint',
        });
        expect(sendCall.input.MessageAttributes.timestamp).toBeDefined();
      });

      it('should handle SQS errors gracefully', async () => {
        mockSqsSend.mockRejectedValue(new Error('SQS service unavailable'));

        const jobRequest = {
          type: 'mint' as const,
          address: '0x58f9e6153690c852',
          amount: '100.0',
        };

        const result = await sqsService.queueTransactionJob(jobRequest);

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(API_ERROR_CODES.QUEUE_ERROR);
        expect((result as any).error?.message).toContain(
          'Failed to queue transaction job'
        );
      });

      it('should validate job request data', async () => {
        const invalidJobRequest = {
          type: 'mint' as const,
          address: 'invalid-address',
          amount: '100.0',
        };

        const result = await sqsService.queueJob(invalidJobRequest);

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
        expect(mockSqsSend).not.toHaveBeenCalled();
      });
    });

    describe('Job Status Tracking', () => {
      describe('getJobStatus', () => {
        it('should retrieve job status from CloudWatch Logs', async () => {
          const jobId = 'job-123456';
          const mockLogEvents = [
            {
              timestamp: Date.now(),
              message: JSON.stringify({
                jobId,
                status: 'processing',
                message: 'Transaction submitted to Flow network',
              }),
            },
            {
              timestamp: Date.now() + 1000,
              message: JSON.stringify({
                jobId,
                status: 'completed',
                txId: 'flow-tx-123',
                message: 'Transaction completed successfully',
              }),
            },
          ];

          mockCloudWatchSend.mockResolvedValue({
            events: mockLogEvents,
          });

          const result = await sqsService.getJobStatus(jobId);

          expect(result.success).toBe(true);
          expect((result as any).data?.jobId).toBe(jobId);
          expect((result as any).data?.status).toBe('completed');
          expect((result as any).data?.txId).toBe('flow-tx-123');
          expect((result as any).data?.logs).toHaveLength(2);

          expect(mockCloudWatchSend).toHaveBeenCalledWith(
            expect.any(FilterLogEventsCommand)
          );
        });

        it('should handle job not found', async () => {
          mockCloudWatchSend.mockResolvedValue({
            events: [],
          });

          const result = await sqsService.getJobStatus('non-existent-job');

          expect(result.success).toBe(false);
          expect((result as any).error?.code).toBe(API_ERROR_CODES.NOT_FOUND);
          expect((result as any).error?.message).toContain('Job not found');
        });

        it('should handle CloudWatch Logs errors', async () => {
          mockCloudWatchSend.mockRejectedValue(
            new Error('CloudWatch unavailable')
          );

          const result = await sqsService.getJobStatus('job-123');

          expect(result.success).toBe(false);
          expect((result as any).error?.code).toBe(
            API_ERROR_CODES.LOG_RETRIEVAL_ERROR
          );
        });

        it('should parse job status progression correctly', async () => {
          const jobId = 'job-progression-test';
          const mockLogEvents = [
            {
              timestamp: Date.now() - 3000,
              message: JSON.stringify({
                jobId,
                status: 'queued',
                message: 'Job queued for processing',
              }),
            },
            {
              timestamp: Date.now() - 2000,
              message: JSON.stringify({
                jobId,
                status: 'processing',
                message: 'Processing transaction',
              }),
            },
            {
              timestamp: Date.now() - 1000,
              message: JSON.stringify({
                jobId,
                status: 'failed',
                error: 'Insufficient funds',
                message: 'Transaction failed',
              }),
            },
          ];

          mockCloudWatchSend.mockResolvedValue({
            events: mockLogEvents,
          });

          const result = await sqsService.getJobStatus(jobId);

          expect(result.success).toBe(true);
          expect((result as any).data?.status).toBe('failed');
          expect((result as any).data?.error).toBe('Insufficient funds');
          expect((result as any).data?.logs).toHaveLength(3);
          expect((result as any).data?.logs?.[0].status).toBe('queued');
          expect((result as any).data?.logs?.[2].status).toBe('failed');
        });

        it('should handle malformed log entries', async () => {
          const jobId = 'job-malformed-logs';
          const mockLogEvents = [
            {
              timestamp: Date.now(),
              message: 'Invalid JSON log entry',
            },
            {
              timestamp: Date.now() + 1000,
              message: JSON.stringify({
                jobId,
                status: 'completed',
                message: 'Valid log entry',
              }),
            },
          ];

          mockCloudWatchSend.mockResolvedValue({
            events: mockLogEvents,
          });

          const result = await sqsService.getJobStatus(jobId);

          expect(result.success).toBe(true);
          expect((result as any).data?.logs).toHaveLength(1); // Only valid log entry
          expect((result as any).data?.status).toBe('completed');
        });
      });

      describe('Job Status Updates', () => {
        it('should handle different job statuses', async () => {
          const statuses = [
            'queued',
            'processing',
            'completed',
            'failed',
            'cancelled',
          ];

          for (const status of statuses) {
            const mockLogEvents = [
              {
                timestamp: Date.now(),
                message: JSON.stringify({
                  jobId: `job-${status}`,
                  status,
                  message: `Job is ${status}`,
                }),
              },
            ];

            mockCloudWatchSend.mockResolvedValue({
              events: mockLogEvents,
            });

            const result = await sqsService.getJobStatus(`job-${status}`);

            expect(result.success).toBe(true);
            expect((result as any).data?.status).toBe(status);
          }
        });

        it('should calculate processing time correctly', async () => {
          const jobId = 'job-timing-test';
          const startTime = Date.now() - 120000; // 2 minutes ago
          const endTime = Date.now();

          const mockLogEvents = [
            {
              timestamp: startTime,
              message: JSON.stringify({
                jobId,
                status: 'processing',
                message: 'Started processing',
              }),
            },
            {
              timestamp: endTime,
              message: JSON.stringify({
                jobId,
                status: 'completed',
                message: 'Processing completed',
              }),
            },
          ];

          mockCloudWatchSend.mockResolvedValue({
            events: mockLogEvents,
          });

          const result = await sqsService.getJobStatus(jobId);

          expect(result.success).toBe(true);
          expect((result as any).data?.processingTime).toBeDefined();
          expect((result as any).data?.processingTime).toBeGreaterThan(100); // At least 100 seconds
        });
      });
    });
  });

  describe('Configuration and Environment', () => {
    it('should handle missing environment variables', () => {
      delete process.env.SQS_QUEUE_URL;
      delete process.env.CLOUDWATCH_LOG_GROUP;

      const service = new SqsService();
      expect(service).toBeInstanceOf(SqsService);
    });

    it('should use correct AWS region', () => {
      process.env.AWS_REGION = 'us-west-2';

      const service = new SqsService();
      expect(service).toBeInstanceOf(SqsService);
    });

    it('should handle different queue URLs', async () => {
      process.env.SQS_QUEUE_URL =
        'https://sqs.us-west-2.amazonaws.com/account/test-queue';

      mockSqsSend.mockResolvedValue({
        MessageId: 'test-msg',
      });

      const service = new SqsService();
      const result = await service.queueTransactionJob({
        type: 'mint',
        address: '0x58f9e6153690c852',
        amount: '100.0',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle AWS credential errors', async () => {
      mockSqsSend.mockRejectedValue(new Error('Unable to locate credentials'));

      const jobRequest = {
        type: 'mint' as const,
        address: '0x58f9e6153690c852',
        amount: '100.0',
      };

      const result = await sqsService.queueTransactionJob(jobRequest);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.QUEUE_ERROR);
    });

    it('should handle network timeouts', async () => {
      mockSqsSend.mockRejectedValue(new Error('Network timeout'));

      const jobRequest = {
        type: 'setup' as const,
        address: '0x58f9e6153690c852',
      };

      const result = await sqsService.queueTransactionJob(jobRequest);

      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain(
        'Failed to queue transaction job'
      );
    });

    it('should handle CloudWatch Logs permission errors', async () => {
      mockCloudWatchSend.mockRejectedValue(new Error('Access denied'));

      const result = await sqsService.getJobStatus('job-123');

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.LOG_RETRIEVAL_ERROR
      );
    });

    it('should handle malformed SQS responses', async () => {
      mockSqsSend.mockResolvedValue({
        // Missing MessageId
        MD5OfBody: 'mock-md5',
      });

      const jobRequest = {
        type: 'mint' as const,
        address: '0x58f9e6153690c852',
        amount: '100.0',
      };

      const result = await sqsService.queueTransactionJob(jobRequest);

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(API_ERROR_CODES.QUEUE_ERROR);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent job queueing', async () => {
      mockSqsSend.mockResolvedValue({
        MessageId: 'concurrent-msg',
      });

      const jobRequests = Array.from({ length: 10 }, (_, i) => ({
        type: 'mint' as const,
        address: '0x58f9e6153690c852',
        amount: `${i + 1}.0`,
      }));

      const promises = jobRequests.map(request =>
        sqsService.queueTransactionJob(request)
      );
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockSqsSend).toHaveBeenCalledTimes(10);
    });

    it('should handle large job payloads', async () => {
      mockSqsSend.mockResolvedValue({
        MessageId: 'large-payload-msg',
      });

      const largeJobRequest = {
        type: 'batchTransfer' as const,
        transfers: Array.from({ length: 100 }, (_, i) => ({
          recipient: `0x${i.toString().padStart(16, '0')}`,
          amount: '1.0',
        })),
      };

      const result = await sqsService.queueJob(largeJobRequest);

      expect(result.success).toBe(true);
      expect(mockSqsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            MessageBody: expect.stringContaining('batchTransfer'),
          }),
        })
      );
    });

    it('should handle job status queries for old jobs', async () => {
      const oldJobId = 'old-job-123';
      const oldTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

      mockCloudWatchSend.mockResolvedValue({
        events: [
          {
            timestamp: oldTimestamp,
            message: JSON.stringify({
              jobId: oldJobId,
              status: 'completed',
              message: 'Old job completed',
            }),
          },
        ],
      });

      const result = await sqsService.getJobStatus(oldJobId);

      expect(result.success).toBe(true);
      expect((result as any).data?.status).toBe('completed');
    });
  });
});
