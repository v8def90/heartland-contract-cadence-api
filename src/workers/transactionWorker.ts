/**
 * Transaction Worker
 *
 * @description AWS Lambda function that processes transaction jobs from SQS queue
 * and executes them against the Flow blockchain
 */

import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { FlowService } from '../services/FlowService';
import { SqsService } from '../services/SqsService';
import type { TransactionJobRequest } from '../models/requests';

/**
 * Transaction Worker Handler
 *
 * @description Processes SQS messages containing transaction job requests
 * and executes them using FlowService
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`[WORKER_START] Processing ${event.Records.length} SQS messages`);

  const flowService = new FlowService();

  // Process each SQS message
  for (const record of event.Records) {
    await processTransactionJob(record, flowService);
  }

  console.log('[WORKER_END] All messages processed');
};

/**
 * Process individual transaction job from SQS record
 *
 * @param record - SQS record containing job data
 * @param flowService - FlowService instance
 */
async function processTransactionJob(
  record: SQSRecord,
  flowService: FlowService
): Promise<void> {
  let jobRequest: TransactionJobRequest | undefined;

  try {
    // Parse job request from SQS message
    jobRequest = JSON.parse(record.body) as TransactionJobRequest;

    console.log(
      `[JOB_PROCESSING] ${jobRequest.jobId}: Starting job processing`,
      {
        type: jobRequest.type,
        userAddress: jobRequest.userAddress,
        messageId: record.messageId,
      }
    );

    // Log job status update
    SqsService.logJobStatusUpdate(jobRequest.jobId, 'processing', {
      messageId: record.messageId,
      attemptNumber: record.attributes.ApproximateReceiveCount,
    });

    // Execute transaction based on job type
    const result = await executeTransactionJob(jobRequest, flowService);

    if (result.success) {
      console.log(
        `[JOB_COMPLETED] ${jobRequest.jobId}: Transaction completed successfully`,
        {
          txId: result.txId,
          blockHeight: result.blockHeight,
        }
      );

      SqsService.logJobStatusUpdate(jobRequest.jobId, 'completed', {
        txId: result.txId,
        blockHeight: result.blockHeight,
        completionTime: new Date().toISOString(),
      });
    } else {
      console.error(`[JOB_FAILED] ${jobRequest.jobId}: Transaction failed`, {
        error: result.error,
      });

      SqsService.logJobStatusUpdate(jobRequest.jobId, 'failed', {
        error: result.error,
        failureTime: new Date().toISOString(),
      });
    }
  } catch (error) {
    const jobId = jobRequest?.jobId || 'unknown';
    console.error(
      `[JOB_ERROR] ${jobId}: Unexpected error during job processing`,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: record.messageId,
      }
    );

    SqsService.logJobStatusUpdate(jobId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      failureTime: new Date().toISOString(),
      messageId: record.messageId,
    });

    // Re-throw error to send message to DLQ
    throw error;
  }
}

/**
 * Execute transaction job based on job type
 *
 * @param jobRequest - Transaction job request
 * @param flowService - FlowService instance
 * @returns Promise resolving to execution result
 */
async function executeTransactionJob(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  try {
    switch (jobRequest.type) {
      case 'setup':
        return await executeSetupAccount(jobRequest, flowService);

      case 'mint':
        return await executeMintTokens(jobRequest, flowService);

      case 'transfer':
        return await executeTransferTokens(jobRequest, flowService);

      case 'pause':
        return await executePauseContract(jobRequest, flowService);

      case 'unpause':
        return await executeUnpauseContract(jobRequest, flowService);

      case 'setTaxRate':
        return await executeSetTaxRate(jobRequest, flowService);

      case 'burn':
        return await executeBurnTokens(jobRequest, flowService);

      default:
        throw new Error(`Unknown job type: ${jobRequest.type}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute setup account transaction
 */
async function executeSetupAccount(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  try {
    const { address, setupType } = jobRequest.params as {
      address?: string;
      setupType?: string;
    };

    let result;

    // Handle different setup types
    if (setupType === 'adminMinter') {
      result = await flowService.setupAdminWithMinter();
    } else if (setupType === 'adminRoles') {
      result = await flowService.setupAdminRoles();
    } else if (address) {
      result = await flowService.setupAccount(address);
    } else {
      throw new Error(
        'Invalid setup parameters: address or setupType required'
      );
    }

    if (result.success) {
      // Handle different result data structures
      if ('txId' in result.data) {
        // Admin setup responses
        return {
          success: true,
          txId: result.data.txId,
        };
      } else {
        // Account setup response
        return {
          success: true,
          txId: 'account_setup_completed', // Placeholder for account setup
        };
      }
    } else {
      return {
        success: false,
        error: result.error?.message || 'Setup operation failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Setup operation failed',
    };
  }
}

/**
 * Execute mint tokens transaction
 */
async function executeMintTokens(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  try {
    const { recipient, amount } = jobRequest.params as {
      recipient: string;
      amount: string;
    };

    const result = await flowService.mintTokens(recipient, amount);

    if (result.success) {
      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      // Only add blockHeight if it exists
      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      return {
        success: false,
        error: result.error?.message || 'Mint tokens failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Mint tokens failed',
    };
  }
}

/**
 * Execute transfer tokens transaction
 */
async function executeTransferTokens(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  // Note: Transfer implementation would go here when TransferService is ready
  // For now, return a placeholder
  return {
    success: false,
    error: 'Transfer tokens not yet implemented',
  };
}

/**
 * Execute pause contract transaction
 */
async function executePauseContract(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  // Note: Pause implementation would go here when implemented
  return {
    success: false,
    error: 'Pause contract not yet implemented',
  };
}

/**
 * Execute unpause contract transaction
 */
async function executeUnpauseContract(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  // Note: Unpause implementation would go here when implemented
  return {
    success: false,
    error: 'Unpause contract not yet implemented',
  };
}

/**
 * Execute set tax rate transaction
 */
async function executeSetTaxRate(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  // Note: Set tax rate implementation would go here when implemented
  return {
    success: false,
    error: 'Set tax rate not yet implemented',
  };
}

/**
 * Execute burn tokens transaction
 */
async function executeBurnTokens(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  // Note: Burn tokens implementation would go here when implemented
  return {
    success: false,
    error: 'Burn tokens not yet implemented',
  };
}
