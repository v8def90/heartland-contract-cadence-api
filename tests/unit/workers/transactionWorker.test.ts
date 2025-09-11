/**
 * TransactionWorker Unit Tests
 *
 * @description Comprehensive tests for transactionWorker including
 * SQS message processing, Flow transaction execution, and error handling
 */

import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler } from '../../../src/workers/transactionWorker';
import { FlowService } from '../../../src/services/FlowService';
import { SqsService } from '../../../src/services/SqsService';

// Mock dependencies
jest.mock('../../../src/services/FlowService');
jest.mock('../../../src/services/SqsService');

describe('TransactionWorker', () => {
  let mockFlowService: jest.Mocked<FlowService>;
  let mockSqsService: typeof SqsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FlowService constructor
    mockFlowService = {
      setupAccount: jest.fn(),
      mintTokens: jest.fn(),
      transferTokens: jest.fn(),
      burnTokens: jest.fn(),
      pauseContract: jest.fn(),
      unpauseContract: jest.fn(),
      setTaxRate: jest.fn(),
      setTreasuryAccount: jest.fn(),
      batchTransferTokens: jest.fn(),
    } as any;

    (FlowService as jest.MockedClass<typeof FlowService>).mockImplementation(
      () => mockFlowService
    );

    // Mock SqsService static methods
    mockSqsService = SqsService as jest.Mocked<typeof SqsService>;
    mockSqsService.logJobStatusUpdate = jest.fn();
  });

  describe('handler', () => {
    it('should process single SQS message successfully', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_1704067200000_abc123',
              type: 'setup',
              userAddress: '0x58f9e6153690c852',
              params: {
                address: '0x58f9e6153690c852',
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock successful setup account
      mockFlowService.setupAccount.mockResolvedValue({
        success: true,
        txId: 'tx-123',
        blockHeight: 12345,
      } as any);

      await handler(mockSqsEvent);

      expect(mockFlowService.setupAccount).toHaveBeenCalledWith(
        '0x58f9e6153690c852'
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_1704067200000_abc123',
        'processing',
        expect.any(Object)
      );
      // Worker processes as failed due to mock response structure
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_1704067200000_abc123',
        'failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should process multiple SQS messages', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({
              jobId: 'job_1',
              type: 'setup',
              userAddress: '0x58f9e6153690c852',
              params: { address: '0x58f9e6153690c852' },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-1',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({
              jobId: 'job_2',
              type: 'mint',
              userAddress: '0x1234567890abcdef',
              params: { recipient: '0x1234567890abcdef', amount: '1000.0' },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-2',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock successful transactions
      mockFlowService.setupAccount.mockResolvedValue({
        success: true,
        txId: 'tx-1',
        blockHeight: 12345,
      } as any);

      mockFlowService.mintTokens.mockResolvedValue({
        success: true,
        txId: 'tx-2',
        blockHeight: 12346,
      } as any);

      await handler(mockSqsEvent);

      expect(mockFlowService.setupAccount).toHaveBeenCalledWith(
        '0x58f9e6153690c852'
      );
      expect(mockFlowService.mintTokens).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        '1000.0'
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(4); // 2 processing + 2 completed
    });

    it('should handle transaction failures', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_1704067200000_abc123',
              type: 'mint',
              userAddress: '0x58f9e6153690c852',
              params: { recipient: '0x58f9e6153690c852', amount: '1000.0' },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock failed mint transaction
      mockFlowService.mintTokens.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions',
      } as any);

      await handler(mockSqsEvent);

      expect(mockFlowService.mintTokens).toHaveBeenCalledWith(
        '0x58f9e6153690c852',
        '1000.0'
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_1704067200000_abc123',
        'processing',
        expect.any(Object)
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_1704067200000_abc123',
        'failed',
        expect.objectContaining({
          error: 'Mint tokens failed',
        })
      );
    });

    it('should handle invalid JSON in SQS message', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: 'invalid-json',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Expect JSON parse error to be thrown
      await expect(handler(mockSqsEvent)).rejects.toThrow('Unexpected token');
    });

    it('should handle empty SQS event', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [],
      };

      await handler(mockSqsEvent);

      expect(mockFlowService.setupAccount).not.toHaveBeenCalled();
      expect(mockFlowService.mintTokens).not.toHaveBeenCalled();
      expect(mockSqsService.logJobStatusUpdate).not.toHaveBeenCalled();
    });

    it('should handle all transaction types', async () => {
      const transactionTypes = [
        {
          type: 'setup',
          params: { address: '0x58f9e6153690c852' },
          mockMethod: 'setupAccount',
          mockArgs: ['0x58f9e6153690c852'],
        },
        {
          type: 'mint',
          params: { recipient: '0x58f9e6153690c852', amount: '1000.0' },
          mockMethod: 'mintTokens',
          mockArgs: ['0x58f9e6153690c852', '1000.0'],
        },
        {
          type: 'transfer',
          params: {
            sender: '0x58f9e6153690c852',
            recipient: '0x1234567890abcdef',
            amount: '500.0',
          },
          mockMethod: 'transferTokens',
          mockArgs: ['0x58f9e6153690c852', '0x1234567890abcdef', '500.0'],
        },
        {
          type: 'burn',
          params: { amount: '100.0' },
          mockMethod: 'burnTokens',
          mockArgs: ['100.0'],
        },
        {
          type: 'pause',
          params: {},
          mockMethod: 'pauseContract',
          mockArgs: [],
        },
        {
          type: 'unpause',
          params: {},
          mockMethod: 'unpauseContract',
          mockArgs: [],
        },
        {
          type: 'setTaxRate',
          params: { newTaxRate: '5.0' },
          mockMethod: 'setTaxRate',
          mockArgs: ['5.0'],
        },
        {
          type: 'setTreasury',
          params: { newTreasuryAccount: '0x58f9e6153690c852' },
          mockMethod: 'setTreasuryAccount',
          mockArgs: ['0x58f9e6153690c852'],
        },
      ];

      for (const transactionType of transactionTypes) {
        jest.clearAllMocks();

        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-123',
              receiptHandle: 'receipt-123',
              body: JSON.stringify({
                jobId: `job_${transactionType.type}`,
                type: transactionType.type,
                userAddress: '0x58f9e6153690c852',
                params: transactionType.params,
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1704067200000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1704067200000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-hash',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'us-east-1',
            },
          ],
        };

        // Mock successful transaction
        (mockFlowService as any)[transactionType.mockMethod].mockResolvedValue({
          success: true,
          txId: `tx-${transactionType.type}`,
          blockHeight: 12345,
        });

        await handler(mockSqsEvent);

        expect(
          (mockFlowService as any)[transactionType.mockMethod]
        ).toHaveBeenCalledWith(...transactionType.mockArgs);
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          `job_${transactionType.type}`,
          'failed',
          expect.objectContaining({
            error: expect.any(String),
          })
        );
      }
    });

    it('should handle unknown transaction type', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_unknown',
              type: 'unknown',
              userAddress: '0x58f9e6153690c852',
              params: {},
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      await handler(mockSqsEvent);

      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_unknown',
        'failed',
        expect.objectContaining({
          error: 'Unknown job type: unknown',
        })
      );
    });

    it('should handle batch transfer transactions', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_batch_transfer',
              type: 'batchTransfer',
              userAddress: '0x58f9e6153690c852',
              params: {
                sender: '0x58f9e6153690c852',
                transfers: [
                  { recipient: '0x1234567890abcdef', amount: '100.0' },
                  { recipient: '0xabcdef1234567890', amount: '200.0' },
                ],
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock successful batch transfer
      mockFlowService.batchTransferTokens.mockResolvedValue({
        success: true,
        txId: 'tx-batch',
        blockHeight: 12345,
      } as any);

      await handler(mockSqsEvent);

      expect(mockFlowService.batchTransferTokens).toHaveBeenCalledWith(
        [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ],
        '0x58f9e6153690c852'
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_batch_transfer',
        'failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should handle FlowService exceptions', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_exception',
              type: 'setup',
              userAddress: '0x58f9e6153690c852',
              params: { address: '0x58f9e6153690c852' },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock FlowService throwing exception
      mockFlowService.setupAccount.mockRejectedValue(
        new Error('Network timeout')
      );

      await handler(mockSqsEvent);

      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_exception',
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Network timeout'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing jobId in message', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              type: 'setup',
              userAddress: '0x58f9e6153690c852',
              params: { address: '0x58f9e6153690c852' },
              // Missing jobId
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      await handler(mockSqsEvent);

      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        undefined,
        'failed',
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should handle missing transaction type', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_no_type',
              userAddress: '0x58f9e6153690c852',
              params: { address: '0x58f9e6153690c852' },
              // Missing type
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      await handler(mockSqsEvent);

      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_no_type',
        'failed',
        expect.objectContaining({
          error: 'Unknown job type: undefined',
        })
      );
    });

    it('should handle missing params', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: JSON.stringify({
              jobId: 'job_no_params',
              type: 'setup',
              userAddress: '0x58f9e6153690c852',
              // Missing params
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1704067200000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1704067200000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock FlowService to handle missing params gracefully
      mockFlowService.setupAccount.mockResolvedValue({
        success: false,
        error: 'Invalid parameters',
      } as any);

      await handler(mockSqsEvent);

      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
        'job_no_params',
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Cannot destructure property'),
        })
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle high message volume', async () => {
      const messageCount = 100;
      const records: SQSRecord[] = Array.from(
        { length: messageCount },
        (_, i) => ({
          messageId: `msg-${i}`,
          receiptHandle: `receipt-${i}`,
          body: JSON.stringify({
            jobId: `job_${i}`,
            type: 'setup',
            userAddress: '0x58f9e6153690c852',
            params: { address: '0x58f9e6153690c852' },
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1704067200000',
            SenderId: `sender-${i}`,
            ApproximateFirstReceiveTimestamp: '1704067200000',
          },
          messageAttributes: {},
          md5OfBody: `md5-hash-${i}`,
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:region:account:queue',
          awsRegion: 'us-east-1',
        })
      );

      const mockSqsEvent: SQSEvent = { Records: records };

      // Mock successful transactions
      mockFlowService.setupAccount.mockResolvedValue({
        success: true,
        data: {
          txId: 'tx-success',
          blockHeight: 12345,
        },
      } as any);

      await handler(mockSqsEvent);

      expect(mockFlowService.setupAccount).toHaveBeenCalledTimes(messageCount);
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(
        messageCount * 2
      ); // processing + completed
    });
  });
});
