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

      case 'setTreasury':
        return await executeSetTreasury(jobRequest, flowService);

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
  try {
    const { recipient, amount } = jobRequest.params as {
      recipient: string;
      amount: string;
      memo?: string;
    };

    // Use userAddress as sender (from JWT token in real implementation)
    const sender = jobRequest.userAddress;

    console.log(
      `[TRANSFER_START] Executing transfer: ${amount} HEART from ${sender} to ${recipient}`
    );

    const result = await flowService.transferTokens(sender, recipient, amount);

    if (result.success) {
      console.log(`[TRANSFER_SUCCESS] Transfer completed: ${result.data.txId}`);

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
      console.error('[TRANSFER_FAILED]', result.error);
      return {
        success: false,
        error: result.error?.message || 'Transfer tokens failed',
      };
    }
  } catch (error) {
    console.error('[TRANSFER_ERROR]', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Transfer execution failed',
    };
  }
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
  try {
    const { newTaxRate } = jobRequest.params as {
      newTaxRate: string;
    };

    if (!newTaxRate) {
      throw new Error('New tax rate is required');
    }

    console.log(
      `[SET_TAX_RATE_EXECUTING] ${jobRequest.jobId}: Setting tax rate to ${newTaxRate}%`
    );

    // Execute set tax rate transaction using FlowService
    const result = await flowService.setTaxRate(newTaxRate);

    if (result.success) {
      console.log(
        `[SET_TAX_RATE_SUCCESS] ${jobRequest.jobId}: Tax rate set successfully`,
        {
          txId: result.data.txId,
          newTaxRate: result.data.newTaxRate,
          status: result.data.status,
          blockHeight: result.data.blockHeight,
        }
      );

      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      console.error(
        `[SET_TAX_RATE_FAILED] ${jobRequest.jobId}: Set tax rate transaction failed`,
        {
          error: result.error,
        }
      );

      return {
        success: false,
        error: result.error?.message || 'Set tax rate transaction failed',
      };
    }
  } catch (error) {
    console.error(
      `[SET_TAX_RATE_ERROR] ${jobRequest.jobId}: Error executing set tax rate`,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set tax rate',
    };
  }
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
  try {
    const { amount } = jobRequest.params as {
      amount: string;
      memo?: string;
    };

    if (!amount) {
      throw new Error('Burn amount is required');
    }

    console.log(
      `[BURN_EXECUTING] ${jobRequest.jobId}: Burning ${amount} HEART tokens`
    );

    // Execute burn transaction using FlowService
    const result = await flowService.burnTokens(amount);

    if (result.success) {
      console.log(
        `[BURN_SUCCESS] ${jobRequest.jobId}: Burn completed successfully`,
        {
          txId: result.data.txId,
          amount: result.data.amount,
          blockHeight: result.data.blockHeight,
        }
      );

      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      console.error(
        `[BURN_FAILED] ${jobRequest.jobId}: Burn transaction failed`,
        {
          error: result.error,
        }
      );

      return {
        success: false,
        error: result.error?.message || 'Burn transaction failed',
      };
    }
  } catch (error) {
    console.error(`[BURN_ERROR] ${jobRequest.jobId}: Error executing burn`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to burn tokens',
    };
  }
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
  try {
    console.log(
      `[PAUSE_EXECUTING] ${jobRequest.jobId}: Pausing HEART contract`
    );

    // Execute pause transaction using FlowService
    const result = await flowService.pauseContract();

    if (result.success) {
      console.log(
        `[PAUSE_SUCCESS] ${jobRequest.jobId}: Contract paused successfully`,
        {
          txId: result.data.txId,
          status: result.data.status,
          blockHeight: result.data.blockHeight,
        }
      );

      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      console.error(
        `[PAUSE_FAILED] ${jobRequest.jobId}: Pause transaction failed`,
        {
          error: result.error,
        }
      );

      return {
        success: false,
        error: result.error?.message || 'Pause transaction failed',
      };
    }
  } catch (error) {
    console.error(`[PAUSE_ERROR] ${jobRequest.jobId}: Error executing pause`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to pause contract',
    };
  }
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
  try {
    console.log(
      `[UNPAUSE_EXECUTING] ${jobRequest.jobId}: Unpausing HEART contract`
    );

    // Execute unpause transaction using FlowService
    const result = await flowService.unpauseContract();

    if (result.success) {
      console.log(
        `[UNPAUSE_SUCCESS] ${jobRequest.jobId}: Contract unpaused successfully`,
        {
          txId: result.data.txId,
          status: result.data.status,
          blockHeight: result.data.blockHeight,
        }
      );

      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      console.error(
        `[UNPAUSE_FAILED] ${jobRequest.jobId}: Unpause transaction failed`,
        {
          error: result.error,
        }
      );

      return {
        success: false,
        error: result.error?.message || 'Unpause transaction failed',
      };
    }
  } catch (error) {
    console.error(
      `[UNPAUSE_ERROR] ${jobRequest.jobId}: Error executing unpause`,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to unpause contract',
    };
  }
}

/**
 * Execute set treasury account transaction
 */
async function executeSetTreasury(
  jobRequest: TransactionJobRequest,
  flowService: FlowService
): Promise<{
  success: boolean;
  txId?: string;
  blockHeight?: string;
  error?: string;
}> {
  try {
    const { newTreasuryAccount } = jobRequest.params as {
      newTreasuryAccount: string;
    };

    if (!newTreasuryAccount) {
      throw new Error('New treasury account is required');
    }

    console.log(
      `[SET_TREASURY_EXECUTING] ${jobRequest.jobId}: Setting treasury account to ${newTreasuryAccount}`
    );

    // Execute set treasury account transaction using FlowService
    const result = await flowService.setTreasuryAccount(newTreasuryAccount);

    if (result.success) {
      console.log(
        `[SET_TREASURY_SUCCESS] ${jobRequest.jobId}: Treasury account set successfully`,
        {
          txId: result.data.txId,
          newTreasuryAccount: result.data.newTreasuryAccount,
          status: result.data.status,
          blockHeight: result.data.blockHeight,
        }
      );

      const response: {
        success: boolean;
        txId?: string;
        blockHeight?: string;
        error?: string;
      } = {
        success: true,
        txId: result.data.txId,
      };

      if (result.data.blockHeight) {
        response.blockHeight = result.data.blockHeight.toString();
      }

      return response;
    } else {
      console.error(
        `[SET_TREASURY_FAILED] ${jobRequest.jobId}: Set treasury account transaction failed`,
        {
          error: result.error,
        }
      );

      return {
        success: false,
        error:
          result.error?.message || 'Set treasury account transaction failed',
      };
    }
  } catch (error) {
    console.error(
      `[SET_TREASURY_ERROR] ${jobRequest.jobId}: Error executing set treasury account`,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to set treasury account',
    };
  }
}
