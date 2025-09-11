/**
 * Enhanced Worker Tests
 *
 * @description Comprehensive tests for worker functionality including
 * transaction processing, error handling, and edge cases
 */

import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler as transactionWorkerHandler } from '../../../src/workers/transactionWorker';
import { handler as jobCleanupHandler } from '../../../src/workers/jobCleanup';
import { FlowService } from '../../../src/services/FlowService';
import { SqsService } from '../../../src/services/SqsService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock dependencies
jest.mock('../../../src/services/FlowService');
jest.mock('../../../src/services/SqsService');
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn(),
  DescribeLogStreamsCommand: jest.fn(),
  DeleteLogStreamCommand: jest.fn(),
}));

describe('Enhanced Worker Tests', () => {
  let mockFlowService: jest.Mocked<FlowService>;
  let mockSqsService: typeof SqsService;
  let mockCloudWatchClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FlowService
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

    // Mock SqsService
    mockSqsService = SqsService as jest.Mocked<typeof SqsService>;
    mockSqsService.logJobStatusUpdate = jest.fn();

    // Mock CloudWatch Client
    mockCloudWatchClient = {
      send: jest.fn(),
    };
  });

  describe('Transaction Worker Enhanced Tests', () => {
    describe('SQS Message Processing', () => {
      it('should process multiple SQS messages concurrently', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setup',
                params: {
                  address: '0x1234567890abcdef',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
            {
              messageId: 'msg-2',
              receiptHandle: 'receipt-2',
              body: JSON.stringify({
                jobId: 'job-2',
                type: 'mint',
                params: {
                  recipient: '0x1234567890abcdef',
                  amount: '100.0',
                },
                messageId: 'msg-2',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-2',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setupAccount.mockResolvedValue({
          success: true,
          data: {
            address: '0x1234567890abcdef',
            setupComplete: true,
            vaultPath: '/storage/heartVault',
            publicPath: '/public/heartBalance',
          },
          timestamp: new Date().toISOString(),
        });

        mockFlowService.mintTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-123',
            recipient: '0x1234567890abcdef',
            amount: '100.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.setupAccount).toHaveBeenCalledTimes(1);
        expect(mockFlowService.mintTokens).toHaveBeenCalledTimes(1);
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(4); // processing + completed for each job
      });

      it('should handle empty SQS event gracefully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [],
        };

        await expect(
          transactionWorkerHandler(mockSqsEvent)
        ).resolves.not.toThrow();
        expect(mockFlowService.setupAccount).not.toHaveBeenCalled();
      });

      it('should handle malformed JSON in SQS message body', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: 'invalid-json',
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        await expect(transactionWorkerHandler(mockSqsEvent)).rejects.toThrow(
          'Unexpected token'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          expect.any(String),
          'failed',
          expect.objectContaining({
            error: expect.stringContaining('JSON'),
          })
        );
      });
    });

    describe('Transaction Type Processing', () => {
      it('should process setup account transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setup',
                params: {
                  address: '0x1234567890abcdef',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setupAccount.mockResolvedValue({
          success: true,
          data: {
            address: '0x1234567890abcdef',
            setupComplete: true,
            vaultPath: '/storage/heartVault',
            publicPath: '/public/heartBalance',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.setupAccount).toHaveBeenCalledWith(
          '0x1234567890abcdef'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: expect.any(String),
          })
        );
      });

      it('should process mint tokens transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'mint',
                params: {
                  recipient: '0x1234567890abcdef',
                  amount: '100.0',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.mintTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-123',
            recipient: '0x1234567890abcdef',
            amount: '100.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.mintTokens).toHaveBeenCalledWith(
          '0x1234567890abcdef',
          '100.0'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-123',
          })
        );
      });

      it('should process transfer tokens transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'transfer',
                params: {
                  sender: '0x1234567890abcdef',
                  recipient: '0xabcdef1234567890',
                  amount: '50.0',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.transferTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-456',
            sender: '0x1234567890abcdef',
            recipient: '0xabcdef1234567890',
            amount: '50.0',
            taxAmount: '2.5',
            netAmount: '47.5',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.transferTokens).toHaveBeenCalledWith(
          '0x1234567890abcdef',
          '0xabcdef1234567890',
          '50.0'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-456',
          })
        );
      });

      it('should process batch transfer transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'batchTransfer',
                params: {
                  sender: '0x1234567890abcdef',
                  transfers: [
                    { recipient: '0x1111111111111111', amount: '10.0' },
                    { recipient: '0x2222222222222222', amount: '20.0' },
                  ],
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.batchTransferTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-789',
            transferCount: 2,
            totalAmount: '30.0',
            totalTax: '1.5',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.batchTransferTokens).toHaveBeenCalledWith(
          [
            { recipient: '0x1111111111111111', amount: '10.0' },
            { recipient: '0x2222222222222222', amount: '20.0' },
          ],
          '0x1234567890abcdef'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-789',
          })
        );
      });

      it('should process burn tokens transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'burn',
                params: {
                  amount: '25.0',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.burnTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-burn',
            amount: '25.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.burnTokens).toHaveBeenCalledWith('25.0');
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-burn',
          })
        );
      });

      it('should process pause contract transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'pause',
                params: {},
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.pauseContract.mockResolvedValue({
          success: true,
          data: { txId: 'tx-pause', status: 'sealed' },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.pauseContract).toHaveBeenCalled();
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-pause',
          })
        );
      });

      it('should process unpause contract transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'unpause',
                params: {},
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.unpauseContract.mockResolvedValue({
          success: true,
          data: { txId: 'tx-unpause', status: 'sealed' },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.unpauseContract).toHaveBeenCalled();
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-unpause',
          })
        );
      });

      it('should process set tax rate transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setTaxRate',
                params: {
                  newTaxRate: '5.0',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setTaxRate.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-tax',
            newTaxRate: '5.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.setTaxRate).toHaveBeenCalledWith('5.0');
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-tax',
          })
        );
      });

      it('should process set treasury account transaction successfully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setTreasury',
                params: {
                  newTreasuryAccount: '0x9999999999999999',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setTreasuryAccount.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-treasury',
            newTreasuryAccount: '0x9999999999999999',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.setTreasuryAccount).toHaveBeenCalledWith(
          '0x9999999999999999'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-treasury',
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle transaction execution failures gracefully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setup',
                params: {
                  address: '0x1234567890abcdef',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setupAccount.mockResolvedValue({
          success: false,
          error: {
            code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
            message: 'Transaction failed',
            details: 'Insufficient funds',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'failed',
          expect.objectContaining({
            error: expect.stringContaining('Transaction failed'),
          })
        );
      });

      it('should handle unknown transaction types gracefully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'unknown',
                params: {},
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'failed',
          expect.objectContaining({
            error: expect.stringContaining('Unknown job type'),
          })
        );
      });

      it('should handle missing required fields gracefully', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'mint',
                params: {
                  // Missing recipient and amount
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'failed',
          expect.objectContaining({
            error: expect.stringContaining(
              'Cannot read properties of undefined'
            ),
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large batch transfers', async () => {
        const largeTransfers = Array.from({ length: 100 }, (_, i) => ({
          recipient: `0x${i.toString(16).padStart(16, '0')}`,
          amount: '1.0',
        }));

        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'batchTransfer',
                params: {
                  sender: '0x1234567890abcdef',
                  transfers: largeTransfers,
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.batchTransferTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-large-batch',
            transferCount: 100,
            totalAmount: '100.0',
            totalTax: '5.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.batchTransferTokens).toHaveBeenCalledWith(
          largeTransfers,
          '0x1234567890abcdef'
        );
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledWith(
          'job-1',
          'completed',
          expect.objectContaining({
            txId: 'tx-large-batch',
          })
        );
      });

      it('should handle concurrent processing of different transaction types', async () => {
        const mockSqsEvent: SQSEvent = {
          Records: [
            {
              messageId: 'msg-1',
              receiptHandle: 'receipt-1',
              body: JSON.stringify({
                jobId: 'job-1',
                type: 'setup',
                params: {
                  address: '0x1111111111111111',
                },
                messageId: 'msg-1',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-1',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
            {
              messageId: 'msg-2',
              receiptHandle: 'receipt-2',
              body: JSON.stringify({
                jobId: 'job-2',
                type: 'mint',
                params: {
                  recipient: '0x2222222222222222',
                  amount: '100.0',
                },
                messageId: 'msg-2',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-2',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
            {
              messageId: 'msg-3',
              receiptHandle: 'receipt-3',
              body: JSON.stringify({
                jobId: 'job-3',
                type: 'transfer',
                params: {
                  sender: '0x3333333333333333',
                  recipient: '0x4444444444444444',
                  amount: '50.0',
                },
                messageId: 'msg-3',
              }),
              attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890000',
                SenderId: 'sender-123',
                ApproximateFirstReceiveTimestamp: '1234567890000',
              },
              messageAttributes: {},
              md5OfBody: 'md5-3',
              eventSource: 'aws:sqs',
              eventSourceARN: 'arn:aws:sqs:region:account:queue',
              awsRegion: 'ap-northeast-1',
            },
          ],
        };

        mockFlowService.setupAccount.mockResolvedValue({
          success: true,
          data: {
            address: '0x1111111111111111',
            setupComplete: true,
            vaultPath: '/storage/heartVault',
            publicPath: '/public/heartBalance',
          },
          timestamp: new Date().toISOString(),
        });

        mockFlowService.mintTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-mint',
            recipient: '0x2222222222222222',
            amount: '100.0',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        mockFlowService.transferTokens.mockResolvedValue({
          success: true,
          data: {
            txId: 'tx-transfer',
            sender: '0x3333333333333333',
            recipient: '0x4444444444444444',
            amount: '50.0',
            taxAmount: '2.5',
            netAmount: '47.5',
            status: 'sealed',
          },
          timestamp: new Date().toISOString(),
        });

        await transactionWorkerHandler(mockSqsEvent);

        expect(mockFlowService.setupAccount).toHaveBeenCalledTimes(1);
        expect(mockFlowService.mintTokens).toHaveBeenCalledTimes(1);
        expect(mockFlowService.transferTokens).toHaveBeenCalledTimes(1);
        expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(6); // processing + completed for each job
      });
    });
  });

  describe('Job Cleanup Worker Enhanced Tests', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.AWS_REGION = 'ap-northeast-1';
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'heartland-contract-cadence-api';
      process.env.MAX_JOB_RETENTION_HOURS = '72';
    });

    afterEach(() => {
      // Clean up environment variables
      delete process.env.AWS_REGION;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.MAX_JOB_RETENTION_HOURS;
    });

    it('should execute job cleanup handler successfully', async () => {
      const { CloudWatchLogsClient } = await import(
        '@aws-sdk/client-cloudwatch-logs'
      );

      const mockClient = {
        send: jest.fn().mockResolvedValue({
          logStreams: [
            {
              logStreamName: 'stream-1',
              creationTime: Date.now() - 100 * 60 * 60 * 1000, // 100 hours ago
            },
            {
              logStreamName: 'stream-2',
              creationTime: Date.now() - 50 * 60 * 60 * 1000, // 50 hours ago
            },
          ],
        }),
      };

      (
        CloudWatchLogsClient as jest.MockedClass<typeof CloudWatchLogsClient>
      ).mockImplementation(() => mockClient as any);

      await expect(jobCleanupHandler()).resolves.not.toThrow();
    });

    it('should handle CloudWatch errors gracefully', async () => {
      const { CloudWatchLogsClient } = await import(
        '@aws-sdk/client-cloudwatch-logs'
      );

      const mockClient = {
        send: jest.fn().mockRejectedValue(new Error('CloudWatch error')),
      };

      (
        CloudWatchLogsClient as jest.MockedClass<typeof CloudWatchLogsClient>
      ).mockImplementation(() => mockClient as any);

      await expect(jobCleanupHandler()).rejects.toThrow('CloudWatch error');
    });

    it('should use default values when environment variables are not set', async () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.MAX_JOB_RETENTION_HOURS;

      const { CloudWatchLogsClient } = await import(
        '@aws-sdk/client-cloudwatch-logs'
      );

      const mockClient = {
        send: jest.fn().mockResolvedValue({ logStreams: [] }),
      };

      (
        CloudWatchLogsClient as jest.MockedClass<typeof CloudWatchLogsClient>
      ).mockImplementation(() => mockClient as any);

      await expect(jobCleanupHandler()).resolves.not.toThrow();
    });

    it('should process log streams older than retention period', async () => {
      const {
        CloudWatchLogsClient,
        DescribeLogStreamsCommand,
        DeleteLogStreamCommand,
      } = await import('@aws-sdk/client-cloudwatch-logs');

      const mockClient = {
        send: jest
          .fn()
          .mockResolvedValueOnce({
            logStreams: [
              {
                logStreamName: 'old-stream',
                creationTime: Date.now() - 100 * 60 * 60 * 1000, // 100 hours ago
                lastEventTime: Date.now() - 100 * 60 * 60 * 1000, // 100 hours ago
              },
              {
                logStreamName: 'new-stream',
                creationTime: Date.now() - 10 * 60 * 60 * 1000, // 10 hours ago
                lastEventTime: Date.now() - 10 * 60 * 60 * 1000, // 10 hours ago
              },
            ],
          })
          .mockResolvedValueOnce({}), // DeleteLogStreamCommand response
      };

      (
        CloudWatchLogsClient as jest.MockedClass<typeof CloudWatchLogsClient>
      ).mockImplementation(() => mockClient as any);

      await jobCleanupHandler();

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(DescribeLogStreamsCommand)
      );
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(DeleteLogStreamCommand)
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high volume of SQS messages efficiently', async () => {
      const records: SQSRecord[] = Array.from({ length: 50 }, (_, i) => ({
        messageId: `msg-${i}`,
        receiptHandle: `receipt-${i}`,
        body: JSON.stringify({
          jobId: `job-${i}`,
          type: 'setup',
          params: {
            address: `0x${i.toString(16).padStart(16, '0')}`,
          },
          messageId: `msg-${i}`,
        }),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1234567890000',
          SenderId: 'sender-123',
          ApproximateFirstReceiveTimestamp: '1234567890000',
        },
        messageAttributes: {},
        md5OfBody: `md5-${i}`,
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:region:account:queue',
        awsRegion: 'ap-northeast-1',
      }));

      const mockSqsEvent: SQSEvent = { Records: records };

      mockFlowService.setupAccount.mockResolvedValue({
        success: true,
        data: {
          address: '0x1234567890abcdef',
          setupComplete: true,
          vaultPath: '/storage/heartVault',
          publicPath: '/public/heartBalance',
        },
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();
      await transactionWorkerHandler(mockSqsEvent);
      const endTime = Date.now();

      expect(mockFlowService.setupAccount).toHaveBeenCalledTimes(50);
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(100); // processing + completed for each job
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain transaction order processing', async () => {
      const mockSqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({
              jobId: 'job-1',
              type: 'setup',
              params: {
                address: '0x1111111111111111',
              },
              messageId: 'msg-1',
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1234567890000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'ap-northeast-1',
          },
          {
            messageId: 'msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({
              jobId: 'job-2',
              type: 'mint',
              params: {
                recipient: '0x2222222222222222',
                amount: '100.0',
              },
              messageId: 'msg-2',
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890000',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1234567890000',
            },
            messageAttributes: {},
            md5OfBody: 'md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:region:account:queue',
            awsRegion: 'ap-northeast-1',
          },
        ],
      };

      mockFlowService.setupAccount.mockResolvedValue({
        success: true,
        data: {
          address: '0x1111111111111111',
          setupComplete: true,
          vaultPath: '/storage/heartVault',
          publicPath: '/public/heartBalance',
        },
        timestamp: new Date().toISOString(),
      });

      mockFlowService.mintTokens.mockResolvedValue({
        success: true,
        data: {
          txId: 'tx-mint',
          recipient: '0x2222222222222222',
          amount: '100.0',
          status: 'sealed',
        },
        timestamp: new Date().toISOString(),
      });

      await transactionWorkerHandler(mockSqsEvent);

      // Verify that both transactions were processed
      expect(mockFlowService.setupAccount).toHaveBeenCalledWith(
        '0x1111111111111111'
      );
      expect(mockFlowService.mintTokens).toHaveBeenCalledWith(
        '0x2222222222222222',
        '100.0'
      );
      expect(mockSqsService.logJobStatusUpdate).toHaveBeenCalledTimes(4); // processing + completed for each job
    });
  });
});
