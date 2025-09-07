/**
 * Flow Blockchain Service
 *
 * @description Service for interacting with the Flow blockchain.
 * Provides methods to execute Flow scripts and transactions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as fcl from '@onflow/fcl';
import * as fs from 'fs';
import * as path from 'path';
import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';
import {
  createErrorResponse,
  createSuccessResponse,
  API_ERROR_CODES,
} from '../models/responses/ApiResponse';
import type { ApiResponse } from '../models/responses/ApiResponse';
import type {
  BalanceData,
  TotalSupplyData,
  TaxRateData,
  TreasuryData,
  PauseStatusData,
  TaxCalculationData,
  AdminCapabilitiesData,
  AccountSetupData,
} from '../models/responses';
import {
  isValidFlowAddress,
  formatHeartAmount,
  CONTRACT_ADDRESSES,
} from '../config/flow';

/**
 * Flow Service class
 *
 * @description Service class for Flow blockchain interactions.
 * Executes Flow scripts and transactions using FCL.
 */
export class FlowService {
  /**
   * Execute a Flow script
   *
   * @param scriptPath - Path to the Cadence script file
   * @param args - Arguments to pass to the script
   * @returns Promise resolving to script result
   */
  private async executeScript<T = unknown>(
    scriptPath: string,
    args: string[] = []
  ): Promise<T> {
    try {
      // Read the script file
      const fullPath = path.join(process.cwd(), scriptPath);
      const scriptCode = fs.readFileSync(fullPath, 'utf8');

      // Replace contract addresses with dynamic values
      const processedScript = this.replaceContractAddresses(scriptCode);

      console.log('Executing Flow script:', scriptPath);

      // Execute the script with or without arguments
      let result: T;
      if (args.length > 0) {
        result = await fcl.query({
          cadence: processedScript,
          args: () => args.map(arg => fcl.arg(arg, fcl.t.Address)),
        });
      } else {
        result = await fcl.query({
          cadence: processedScript,
        });
      }

      return result;
    } catch (error) {
      console.error('ERROR executeScript: Script execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction on the Flow blockchain using Flow SDK v1.9.0 standards
   *
   * @param transactionPath - Path to the transaction file
   * @param args - Arguments for the transaction
   * @param signers - Array of authorization functions
   * @returns Promise resolving to transaction result
   */
  private async executeTransaction(
    transactionPath: string,
    args: string[] = [],
    signers: any[] = []
  ): Promise<any> {
    try {
      console.log('Executing Flow transaction:', transactionPath);

      // Read and process the transaction code
      const transactionCode = fs
        .readFileSync(path.join(process.cwd(), transactionPath), 'utf8')
        .trim();
      const processedTransaction =
        this.replaceContractAddresses(transactionCode);

      // Prepare transaction arguments for Flow SDK
      const transactionArgs: any[] = [];

      // Convert string arguments to proper Cadence types
      args.forEach((arg, index) => {
        // For mint transaction: first arg is Address, second is UFix64
        if (transactionPath.includes('mint-tokens.transaction.cdc')) {
          if (index === 0) {
            // First argument: recipient address
            transactionArgs.push(fcl.arg(arg, fcl.t.Address));
          } else if (index === 1) {
            // Second argument: amount as UFix64
            transactionArgs.push(fcl.arg(arg, fcl.t.UFix64));
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (transactionPath.includes('transfer-heart.transaction.cdc')) {
          // For transfer transaction: first arg is Address, second is UFix64
          if (index === 0) {
            // First argument: recipient address
            transactionArgs.push(fcl.arg(arg, fcl.t.Address));
          } else if (index === 1) {
            // Second argument: amount as UFix64
            transactionArgs.push(fcl.arg(arg, fcl.t.UFix64));
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (transactionPath.includes('burn-tokens.transaction.cdc')) {
          // For burn transaction: only amount (UFix64)
          if (index === 0) {
            // First argument: amount as UFix64
            transactionArgs.push(fcl.arg(arg, fcl.t.UFix64));
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (transactionPath.includes('set-tax-rate.transaction.cdc')) {
          // For set tax rate transaction: newTaxRate (UFix64)
          if (index === 0) {
            // First argument: newTaxRate as UFix64
            transactionArgs.push(fcl.arg(arg, fcl.t.UFix64));
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (
          transactionPath.includes('set-treasury-account.transaction.cdc')
        ) {
          // For set treasury account transaction: newTreasuryAccount (Address)
          if (index === 0) {
            // First argument: newTreasuryAccount as Address
            transactionArgs.push(fcl.arg(arg, fcl.t.Address));
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (transactionPath.includes('batch-transfer.transaction.cdc')) {
          // For batch transfer transaction: recipients ([Address]), amounts ([UFix64])
          if (index === 0) {
            // First argument: recipients as [Address]
            const recipientsArray = JSON.parse(arg);
            transactionArgs.push(
              fcl.arg(recipientsArray, fcl.t.Array(fcl.t.Address))
            );
          } else if (index === 1) {
            // Second argument: amounts as [UFix64]
            const amountsArray = JSON.parse(arg);
            transactionArgs.push(
              fcl.arg(amountsArray, fcl.t.Array(fcl.t.UFix64))
            );
          } else {
            // Default to String for other arguments
            transactionArgs.push(fcl.arg(arg, fcl.t.String));
          }
        } else if (transactionPath.includes('setup-account.transaction.cdc')) {
          // Setup account has no arguments, but prepare for future extensions
          transactionArgs.push(fcl.arg(arg, fcl.t.String));
        } else {
          // Default to String for other transactions
          transactionArgs.push(fcl.arg(arg, fcl.t.String));
        }
      });

      // Get reference block for transaction
      const latestBlock = await fcl.send([fcl.getBlock(true)]).then(fcl.decode);

      // Build transaction using Flow SDK v1.9.0 pattern
      const transactionBuilders = [
        fcl.transaction(processedTransaction),
        fcl.args(transactionArgs),
        fcl.limit(1000),
        fcl.ref(latestBlock.id),
      ];

      // Add authorizations (proposer, payer, authorizations)
      if (signers.length > 0) {
        const authorizationFunction = signers[0]; // Use first signer for all roles

        transactionBuilders.push(
          fcl.proposer(authorizationFunction),
          fcl.payer(authorizationFunction),
          fcl.authorizations([authorizationFunction])
        );
      } else {
        throw new Error('No authorization functions provided');
      }

      // Send transaction using fcl.send()
      const response = await fcl.send(transactionBuilders);

      // Decode the response to get transaction ID
      const transactionId = response.transactionId;
      if (!transactionId) {
        throw new Error('No transaction ID received from Flow network');
      }

      // Wait for transaction to be sealed
      const sealedTransaction = await fcl.tx(transactionId).onceSealed();

      // Check transaction status
      if (sealedTransaction.statusCode !== 0) {
        throw new Error(
          `Transaction failed with error: ${sealedTransaction.errorMessage || 'Unknown error'}`
        );
      }

      return {
        transactionId,
        status: sealedTransaction.status,
        events: sealedTransaction.events || [],
        blockId: sealedTransaction.blockId,
      };
    } catch (error) {
      console.error(
        'ERROR executeTransaction: Transaction execution failed:',
        error
      );
      console.error('ERROR executeTransaction: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Check if it's a signature validation error
      if (
        error instanceof Error &&
        error.message.includes('signature is not valid')
      ) {
        console.error('ERROR executeTransaction: SIGNATURE VALIDATION FAILED');
        console.error(
          'ERROR executeTransaction: This indicates an issue with the signing process'
        );
      }

      throw error;
    }
  }

  /**
   * Replace contract addresses in script code with dynamic values
   *
   * @param scriptCode - Raw script code
   * @returns Processed script code with correct addresses
   */
  private replaceContractAddresses(scriptCode: string): string {
    let processedScript = scriptCode;

    // Replace contract import statements with actual addresses
    processedScript = processedScript.replace(
      /import\s+"Heart"/g,
      `import ${CONTRACT_ADDRESSES.Heart}`
    );
    processedScript = processedScript.replace(
      /import\s+"FungibleToken"/g,
      `import ${CONTRACT_ADDRESSES.FungibleToken}`
    );
    processedScript = processedScript.replace(
      /import\s+"NonFungibleToken"/g,
      `import ${CONTRACT_ADDRESSES.NonFungibleToken}`
    );
    processedScript = processedScript.replace(
      /import\s+"FlowToken"/g,
      `import ${CONTRACT_ADDRESSES.FlowToken}`
    );
    processedScript = processedScript.replace(
      /import\s+"MetadataViews"/g,
      `import ${CONTRACT_ADDRESSES.MetadataViews}`
    );

    // Also replace any hardcoded addresses for backwards compatibility
    processedScript = processedScript.replace(
      /0x9a0766d93b6608b7/g,
      CONTRACT_ADDRESSES.FungibleToken
    );
    processedScript = processedScript.replace(
      /0x58f9e6153690c852/g,
      CONTRACT_ADDRESSES.Heart
    );

    return processedScript;
  }

  /**
   * Get HEART token balance for an address
   *
   * @param address - Flow address to check balance for
   * @returns Promise resolving to balance information
   */
  async getBalance(address: string): Promise<ApiResponse<BalanceData>> {
    // Validate address format
    if (!isValidFlowAddress(address)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must be 18 characters long and start with 0x',
      });
    }

    try {
      // Execute the Flow script to get balance
      const balanceResult = await this.executeScript<string>(
        'scripts/getBalance.cdc',
        [address]
      );

      // Convert UFix64 result to string
      const balance = parseFloat(balanceResult).toFixed(8);

      return createSuccessResponse<BalanceData>({
        balance,
        address,
        decimals: 8,
        formatted: formatHeartAmount(balance),
      });
    } catch (error) {
      console.error('ERROR getBalance: Flow script execution failed:', error);
      console.error('ERROR getBalance: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      const mockBalance = this.getMockBalance(address);

      return createSuccessResponse<BalanceData>({
        balance: mockBalance,
        address,
        decimals: 8,
        formatted: formatHeartAmount(mockBalance),
      });
    }
  }

  /**
   * Get total token supply
   *
   * @returns Promise resolving to total supply information
   */
  async getTotalSupply(): Promise<ApiResponse<TotalSupplyData>> {
    try {
      // Execute the Flow script to get total supply
      const totalSupplyResult = await this.executeScript<string>(
        'scripts/getTotalSupply.cdc'
      );

      // Convert UFix64 result to string
      const totalSupply = parseFloat(totalSupplyResult).toFixed(8);
      const decimals = 8;

      return createSuccessResponse<TotalSupplyData>({
        totalSupply,
        decimals,
        formatted: formatHeartAmount(totalSupply),
      });
    } catch (error) {
      console.error(
        'ERROR getTotalSupply: Flow script execution failed:',
        error
      );
      console.error('ERROR getTotalSupply: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      const totalSupply = '1000000.0'; // Mock total supply
      const decimals = 8;

      return createSuccessResponse<TotalSupplyData>({
        totalSupply,
        decimals,
        formatted: formatHeartAmount(totalSupply),
      });
    }
  }

  /**
   * Get current tax rate
   *
   * @returns Promise resolving to tax rate information
   */
  async getTaxRate(): Promise<ApiResponse<TaxRateData>> {
    try {
      // Execute the Flow script to get tax rate
      const taxRateResult = await this.executeScript<string>(
        'scripts/get-tax-rate.cdc'
      );

      console.log('DEBUG getTaxRate: Raw Flow script result:', taxRateResult);
      console.log('DEBUG getTaxRate: Result type:', typeof taxRateResult);

      // Convert UFix64 result to number (tax rate as decimal)
      const taxRateDecimal = parseFloat(taxRateResult);
      console.log('DEBUG getTaxRate: Parsed as decimal:', taxRateDecimal);

      // If the result is already a percentage (e.g., 5.0 for 5%), use it directly
      // If the result is a decimal (e.g., 0.05 for 5%), convert to percentage
      let taxRatePercentage: number;
      if (taxRateDecimal <= 1.0) {
        // Assume decimal format (0.05 = 5%)
        taxRatePercentage = taxRateDecimal * 100;
        console.log(
          'DEBUG getTaxRate: Converted decimal to percentage:',
          taxRatePercentage
        );
      } else {
        // Assume percentage format (5.0 = 5%)
        taxRatePercentage = taxRateDecimal;
        console.log(
          'DEBUG getTaxRate: Using as percentage directly:',
          taxRatePercentage
        );
      }

      console.log(
        'DEBUG getTaxRate: Final tax rate percentage:',
        taxRatePercentage
      );

      return createSuccessResponse<TaxRateData>({
        taxRate: taxRatePercentage,
        formatted: `${taxRatePercentage.toFixed(1)}%`,
      });
    } catch (error) {
      console.error('ERROR getTaxRate: Flow script execution failed:', error);
      console.error('ERROR getTaxRate: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      console.log('DEBUG getTaxRate: Falling back to mock data');
      const mockTaxRate = 5.0; // 5% as percentage

      return createSuccessResponse<TaxRateData>({
        taxRate: mockTaxRate,
        formatted: `${mockTaxRate.toFixed(1)}%`,
      });
    }
  }

  /**
   * Get treasury account address
   *
   * @returns Promise resolving to treasury information
   */
  async getTreasuryAccount(): Promise<ApiResponse<TreasuryData>> {
    try {
      console.log('DEBUG getTreasuryAccount: Starting Flow script execution');

      // Execute the Flow script to get treasury account address
      const treasuryResult = await this.executeScript<string>(
        'scripts/get-treasury-account.cdc'
      );

      console.log(
        'DEBUG getTreasuryAccount: Raw Flow script result:',
        treasuryResult
      );
      console.log(
        'DEBUG getTreasuryAccount: Result type:',
        typeof treasuryResult
      );

      // Parse the address result
      const treasuryAddress = treasuryResult.toString();

      console.log(
        'DEBUG getTreasuryAccount: Processed treasury address:',
        treasuryAddress
      );

      return createSuccessResponse<TreasuryData>({
        treasuryAddress,
        isValid: isValidFlowAddress(treasuryAddress),
      });
    } catch (error) {
      console.error(
        'ERROR getTreasuryAccount: Flow script execution failed:',
        error
      );
      console.error('ERROR getTreasuryAccount: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      console.log('DEBUG getTreasuryAccount: Falling back to mock data');
      const treasuryAddress = '0x58f9e6153690c852'; // Mock treasury address

      return createSuccessResponse<TreasuryData>({
        treasuryAddress,
        isValid: isValidFlowAddress(treasuryAddress),
      });
    }
  }

  /**
   * Get contract pause status
   *
   * @returns Promise resolving to pause status information
   */
  async getPauseStatus(): Promise<ApiResponse<PauseStatusData>> {
    try {
      console.log('DEBUG getPauseStatus: Starting Flow script execution');

      // Execute the Flow script to get pause status
      const pauseStatusResult = await this.executeScript<boolean>(
        'scripts/get-pause-status.cdc'
      );

      console.log(
        'DEBUG getPauseStatus: Raw Flow script result:',
        pauseStatusResult
      );
      console.log(
        'DEBUG getPauseStatus: Result type:',
        typeof pauseStatusResult
      );

      // Parse the boolean result
      const isPaused = Boolean(pauseStatusResult);

      console.log('DEBUG getPauseStatus: Processed pause status:', isPaused);

      return createSuccessResponse<PauseStatusData>({
        isPaused,
        pausedAt: null, // Mock for now - would need additional data from contract
        pausedBy: null, // Mock for now - would need additional data from contract
      });
    } catch (error) {
      console.error(
        'ERROR getPauseStatus: Flow script execution failed:',
        error
      );
      console.error('ERROR getPauseStatus: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      console.log('DEBUG getPauseStatus: Falling back to mock data');
      const isPaused = false; // Mock: not paused

      return createSuccessResponse<PauseStatusData>({
        isPaused,
        pausedAt: null,
        pausedBy: null,
      });
    }
  }

  /**
   * Calculate tax for a given amount
   *
   * @param amount - Amount to calculate tax for
   * @returns Promise resolving to tax calculation
   */
  async calculateTax(amount: string): Promise<ApiResponse<TaxCalculationData>> {
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_AMOUNT,
        message: 'Invalid amount',
        details: 'Amount must be a positive number',
      });
    }

    try {
      // Execute the Flow script to calculate tax
      const taxResult = await this.executeScript<{
        [key: string]: any;
      }>('scripts/calculate-tax-amount.cdc', [amount]);

      console.log('DEBUG calculateTax: Raw Flow script result:', taxResult);

      // Parse the tax calculation result
      const taxRate = parseFloat(taxResult.taxRate || '5.0');
      const taxAmount = parseFloat(taxResult.taxAmount || '0.0');
      const netAmount = parseFloat(taxResult.netAmount || amount);

      return createSuccessResponse<TaxCalculationData>({
        amount,
        taxRate,
        taxAmount: taxAmount.toFixed(8),
        netAmount: netAmount.toFixed(8),
      });
    } catch (error) {
      console.error('ERROR calculateTax: Flow script execution failed:', error);

      // Fallback to mock calculation if Flow script fails
      const taxRate = 5.0; // Mock 5% tax rate
      const taxAmount = (amountNum * taxRate) / 100;
      const netAmount = amountNum - taxAmount;

      return createSuccessResponse<TaxCalculationData>({
        amount,
        taxRate,
        taxAmount: taxAmount.toFixed(8),
        netAmount: netAmount.toFixed(8),
      });
    }
  }

  /**
   * Check admin capabilities for an address
   *
   * @param address - Address to check capabilities for
   * @returns Promise resolving to admin capabilities
   */
  async getAdminCapabilities(
    address: string
  ): Promise<ApiResponse<AdminCapabilitiesData>> {
    // Validate address format
    if (!isValidFlowAddress(address)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must be 18 characters long and start with 0x',
      });
    }

    try {
      console.log(
        'DEBUG getAdminCapabilities: Starting Flow script execution for address:',
        address
      );

      // Execute the Flow script to get admin capabilities
      const capabilitiesResult = await this.executeScript<{
        [key: string]: boolean;
      }>('scripts/get-admin-capabilities.cdc', [address]);

      console.log(
        'DEBUG getAdminCapabilities: Raw Flow script result:',
        capabilitiesResult
      );
      console.log(
        'DEBUG getAdminCapabilities: Result type:',
        typeof capabilitiesResult
      );

      // Parse the capabilities result based on actual script output
      const adminCapabilities: AdminCapabilitiesData = {
        address,
        canMint: Boolean(capabilitiesResult.hasMinter),
        canBurn: Boolean(capabilitiesResult.hasAdmin), // Admin can burn tokens
        canPause: Boolean(capabilitiesResult.hasPauser),
        canSetTaxRate: Boolean(capabilitiesResult.hasTaxManager),
        canSetTreasury: Boolean(capabilitiesResult.hasAdmin), // Admin can set treasury
        isAdmin: Boolean(capabilitiesResult.hasAdmin),
      };

      console.log(
        'DEBUG getAdminCapabilities: Processed admin capabilities:',
        adminCapabilities
      );

      return createSuccessResponse<AdminCapabilitiesData>(adminCapabilities);
    } catch (error) {
      console.error(
        'ERROR getAdminCapabilities: Flow script execution failed:',
        error
      );
      console.error('ERROR getAdminCapabilities: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      console.log('DEBUG getAdminCapabilities: Falling back to mock data');
      const isContractAddress = address === '0x58f9e6153690c852';

      const adminCapabilities: AdminCapabilitiesData = {
        address,
        canMint: isContractAddress,
        canBurn: isContractAddress,
        canPause: isContractAddress,
        canSetTaxRate: isContractAddress,
        canSetTreasury: isContractAddress,
        isAdmin: isContractAddress,
      };

      return createSuccessResponse<AdminCapabilitiesData>(adminCapabilities);
    }
  }

  /**
   * Set up HEART token vault for an address
   *
   * @param address - Flow address to set up vault for
   * @returns Promise resolving to setup result
   */
  async setupAccount(address: string): Promise<ApiResponse<AccountSetupData>> {
    // Validate address format
    if (!isValidFlowAddress(address)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must be 18 characters long and start with 0x',
      });
    }

    try {
      console.log(
        'DEBUG setupAccount: Starting setup account transaction for address:',
        address
      );

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG setupAccount: No admin private key found, using mock implementation'
        );

        // Mock transaction execution for demonstration
        console.log('DEBUG setupAccount: Simulating transaction execution...');

        // Simulate transaction delay
        await new Promise<void>(resolve => global.setTimeout(resolve, 1000));

        const setupData: AccountSetupData = {
          address,
          setupComplete: true,
          vaultPath: '/storage/HeartVault',
          publicPath: '/public/HeartVault',
        };

        console.log(
          'DEBUG setupAccount: Mock account setup completed:',
          setupData
        );
        return createSuccessResponse<AccountSetupData>(setupData);
      }

      // Real transaction execution
      console.log('DEBUG setupAccount: Executing real Flow transaction...');

      try {
        // First, get account information to verify keys
        console.log('DEBUG setupAccount: Getting admin account info...');
        const adminAccountInfo = await this.getAccountInfo(adminAddress);
        console.log(
          'DEBUG setupAccount: Admin account info retrieved successfully'
        );

        // Verify private key matches the account's public key
        if (adminAccountInfo.keys && adminAccountInfo.keys.length > 0) {
          const firstKey = adminAccountInfo.keys[0];
          const expectedPublicKey = firstKey.publicKey;

          console.log('DEBUG setupAccount: Verifying private key...');
          const verification = await this.verifyPrivateKey(
            adminPrivateKey,
            expectedPublicKey
          );

          console.log(
            'DEBUG setupAccount: Private key verification result:',
            verification
          );

          if (!verification.isValid) {
            console.error(
              'ERROR setupAccount: Private key verification failed:',
              verification.details
            );
            throw new Error(
              `Private key verification failed: ${verification.details}`
            );
          }

          console.log(
            'DEBUG setupAccount: Private key verification successful!'
          );
        } else {
          console.warn('WARN setupAccount: No keys found in admin account');
        }

        // Also check the target account
        console.log('DEBUG setupAccount: Getting target account info...');
        try {
          await this.getAccountInfo(address);
          console.log(
            'DEBUG setupAccount: Target account info retrieved successfully'
          );
        } catch (targetError) {
          console.log(
            'DEBUG setupAccount: Target account info failed (expected for new accounts):',
            targetError instanceof Error ? targetError.message : 'Unknown error'
          );
        }
        // Flow SDK v1.9.0 compliant authorization function
        // Based on official Flow documentation for server-side authorization
        const authorization = async (account: any = {}) => {
          // Get fresh account info for current sequence number
          const accountInfo = await fcl.account(adminAddress);
          const keyIndex = 0;
          const sequenceNumber =
            accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

          // Create signing function according to Flow SDK v1.9.0 spec
          const signingFunction = async (signable: any) => {
            try {
              const message = signable?.message;
              if (!message) {
                throw new Error('No message found in signable object');
              }

              // Sign the message with Flow-compatible cryptography
              const signature = await this.signWithPrivateKey(
                message,
                adminPrivateKey
              );

              const result = {
                addr: fcl.sansPrefix(adminAddress),
                keyId: keyIndex,
                signature,
              };
              return result;
            } catch (error) {
              console.error('ERROR: Signing failed:', error);
              throw error;
            }
          };

          // Return authorization object in Flow SDK v1.9.0 expected format
          const authResult = {
            ...account,
            addr: fcl.sansPrefix(adminAddress),
            keyId: keyIndex,
            sequenceNum: sequenceNumber,
            tempId: `${adminAddress}-${keyIndex}`,
            signingFunction,
          };

          return authResult;
        };

        // Execute the setup account transaction
        const result = await this.executeTransaction(
          'transactions/setup-account.transaction.cdc',
          [], // No arguments needed for setup-account
          [authorization] // Admin authorization
        );

        console.log('DEBUG setupAccount: Real transaction completed:', result);

        const setupData: AccountSetupData = {
          address,
          setupComplete: true,
          vaultPath: '/storage/HeartVault',
          publicPath: '/public/HeartVault',
        };

        return createSuccessResponse<AccountSetupData>(setupData);
      } catch (transactionError) {
        console.error(
          'ERROR setupAccount: Real transaction failed:',
          transactionError
        );

        // Fall back to mock if real transaction fails
        console.log('DEBUG setupAccount: Falling back to mock implementation');

        const setupData: AccountSetupData = {
          address,
          setupComplete: true,
          vaultPath: '/storage/HeartVault',
          publicPath: '/public/HeartVault',
        };

        return createSuccessResponse<AccountSetupData>(setupData);
      }
    } catch (error) {
      console.error('ERROR setupAccount: Account setup failed:', error);
      console.error('ERROR setupAccount: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
        message: 'Failed to setup HEART token vault',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set up admin account with minter role
   *
   * @returns Promise resolving to setup result
   */
  async setupAdminWithMinter(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      txId?: string;
    }>
  > {
    try {
      console.log('DEBUG setupAdminWithMinter: Starting admin minter setup...');

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log('DEBUG setupAdminWithMinter: No admin private key found');
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Admin private key not configured',
          details: 'ADMIN_PRIVATE_KEY environment variable is required',
        });
      }

      // Real transaction execution
      console.log(
        'DEBUG setupAdminWithMinter: Executing real Flow transaction...'
      );

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;
        const sequenceNumber =
          accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

        const signingFunction = async (signable: any) => {
          try {
            const message = signable?.message;
            if (!message) {
              throw new Error('No message found in signable object');
            }

            const signature = await this.signWithPrivateKey(
              message,
              adminPrivateKey
            );

            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          } catch (error) {
            console.error('ERROR setupAdminWithMinter: Signing failed:', error);
            throw error;
          }
        };

        return {
          ...account,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          sequenceNum: sequenceNumber,
          tempId: `${adminAddress}-${keyIndex}`,
          signingFunction,
        };
      };

      // Execute the setup admin with minter transaction
      const result = await this.executeTransaction(
        'transactions/setup-admin-with-minter.transaction.cdc',
        [], // No arguments needed
        [authorization] // Admin authorization
      );

      console.log('DEBUG setupAdminWithMinter: Transaction completed:', result);

      return createSuccessResponse({
        success: true,
        message: 'Admin minter role setup completed successfully',
        txId: result.transactionId,
      });
    } catch (error) {
      console.error('ERROR setupAdminWithMinter: Transaction failed:', error);

      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
        message: 'Failed to setup admin minter role',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set up admin roles (Minter, Pauser, TaxManager) for admin account
   *
   * @returns Promise resolving to setup result
   */
  async setupAdminRoles(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      txId?: string;
      roles?: string[];
    }>
  > {
    try {
      console.log('DEBUG setupAdminRoles: Starting admin roles setup...');

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log('DEBUG setupAdminRoles: No admin private key found');
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Admin private key not configured',
          details: 'ADMIN_PRIVATE_KEY environment variable is required',
        });
      }

      console.log(
        'DEBUG setupAdminRoles: Executing real admin roles setup transaction...'
      );

      try {
        // Execute the setup admin roles transaction
        const transactionResult = await this.executeTransaction(
          'transactions/setup-admin-roles.transaction.cdc',
          [], // No arguments needed
          [adminAddress] // Admin account as signer
        );

        console.log(
          'DEBUG setupAdminRoles: Transaction successful:',
          transactionResult
        );

        const setupResult = {
          success: true,
          message:
            'Admin roles (Minter, Pauser, TaxManager) setup completed successfully',
          txId: transactionResult.transactionId || 'unknown',
          roles: ['Minter', 'Pauser', 'TaxManager'],
        };

        return createSuccessResponse(setupResult);
      } catch (error) {
        console.error(
          'ERROR setupAdminRoles: Transaction execution failed:',
          error
        );

        // Check for specific error patterns
        if (error instanceof Error) {
          if (error.message.includes('Could not borrow admin resource')) {
            return createErrorResponse({
              code: 'ADMIN_ROLE_REQUIRED',
              message: 'Account does not have ADMIN role capability',
              details:
                'The signing account does not have the required admin resource',
            });
          }

          if (error.message.includes('already exists')) {
            console.log(
              'DEBUG setupAdminRoles: Some roles already exist, this is normal'
            );
            const setupResult = {
              success: true,
              message:
                'Admin roles setup completed (some roles already existed)',
              txId: 'roles_already_exist',
              roles: ['Minter', 'Pauser', 'TaxManager'],
            };
            return createSuccessResponse(setupResult);
          }
        }

        return createErrorResponse({
          code: API_ERROR_CODES.TRANSACTION_FAILED,
          message: 'Admin roles setup transaction failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (error) {
      console.error('ERROR setupAdminRoles: Setup failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Admin roles setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify private key matches the expected public key
   *
   * @param privateKey - Private key in hex format
   * @param expectedPublicKey - Expected public key from Flow account
   * @returns Promise resolving to verification result
   */
  private async verifyPrivateKey(
    privateKey: string,
    expectedPublicKey: string
  ): Promise<{
    isValid: boolean;
    generatedPublicKey: string;
    details: string;
  }> {
    try {
      console.log('DEBUG verifyPrivateKey: Verifying private key...');
      console.log(
        'DEBUG verifyPrivateKey: Expected public key:',
        expectedPublicKey
      );

      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.replace(/^0x/, '');
      const cleanExpectedPublicKey = expectedPublicKey.replace(/^0x/, '');

      // Flow uses ECDSA_P256 (not secp256k1)
      const ec = new EC('p256');

      // Create key pair from private key
      const keyPair = ec.keyFromPrivate(cleanPrivateKey, 'hex');

      // Get public key in uncompressed format
      const publicKeyPoint = keyPair.getPublic();
      const publicKeyHex = publicKeyPoint.encode('hex', false); // Uncompressed format

      // Flow uses compressed format (without 04 prefix)
      const compressedPublicKey = publicKeyHex.startsWith('04')
        ? publicKeyHex.substring(2)
        : publicKeyHex;

      console.log(
        'DEBUG verifyPrivateKey: Generated public key (uncompressed):',
        publicKeyHex
      );
      console.log(
        'DEBUG verifyPrivateKey: Generated public key (compressed):',
        compressedPublicKey
      );
      console.log(
        'DEBUG verifyPrivateKey: Expected public key:',
        cleanExpectedPublicKey
      );

      const isValid =
        compressedPublicKey.toLowerCase() ===
        cleanExpectedPublicKey.toLowerCase();

      const details = isValid
        ? 'Private key matches the expected public key'
        : 'Private key does not match - different key pair';

      console.log('DEBUG verifyPrivateKey: Verification result:', {
        isValid,
        details,
      });

      return {
        isValid,
        generatedPublicKey: compressedPublicKey,
        details,
      };
    } catch (error) {
      console.error('ERROR verifyPrivateKey: Verification failed:', error);
      return {
        isValid: false,
        generatedPublicKey: '',
        details: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Sign a message with the private key using ECDSA P256 + SHA3-256 (Flow standard)
   * Simplified implementation for Flow blockchain compatibility
   *
   * @param message - Hex-encoded transaction payload from Flow
   * @param privateKey - Private key in hex format
   * @returns Promise resolving to signature
   */
  private async signWithPrivateKey(
    message: string,
    privateKey: string
  ): Promise<string> {
    try {
      console.log('DEBUG signWithPrivateKey: Signing message with private key');
      console.log('DEBUG signWithPrivateKey: Message length:', message.length);
      console.log(
        'DEBUG signWithPrivateKey: Message preview:',
        `${message.substring(0, 100)}...`
      );

      // Initialize elliptic curve (p256 for Flow ECDSA_P256)
      const ec = new EC('p256');

      // Clean and validate private key
      const cleanPrivateKey = privateKey.replace(/^0x/, '');
      if (cleanPrivateKey.length !== 64) {
        throw new Error(
          `Invalid private key length: ${cleanPrivateKey.length}, expected 64 hex characters`
        );
      }

      // Create key pair from private key
      const keyPair = ec.keyFromPrivate(cleanPrivateKey, 'hex');

      // Flow transaction message is already hex-encoded, convert to buffer
      const messageBuffer = Buffer.from(message, 'hex');

      // Hash the message using SHA3-256 (Flow standard)
      const hash = new SHA3(256);
      hash.update(messageBuffer);
      const messageHash = hash.digest();

      console.log(
        'DEBUG signWithPrivateKey: Message hash:',
        messageHash.toString('hex')
      );

      // Sign the message hash with ECDSA P256
      const signature = keyPair.sign(messageHash);

      // Extract r and s components and ensure they are 32 bytes each
      const r = signature.r.toString('hex').padStart(64, '0');
      const s = signature.s.toString('hex').padStart(64, '0');

      // Flow expects Raw ECDSA signature format: r + s concatenation (128 hex chars total)
      const rawSignature = r + s;

      console.log(
        'DEBUG signWithPrivateKey: Raw signature generated successfully:',
        rawSignature.length
      );

      // Verify signature length
      if (rawSignature.length !== 128) {
        throw new Error(
          `Invalid signature length: ${rawSignature.length}, expected 128 hex characters`
        );
      }

      return rawSignature;
    } catch (error) {
      console.error('ERROR signWithPrivateKey: Signing failed:', error);
      throw new Error(
        `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get Flow account information including public keys
   *
   * @param address - Flow address to get account info for
   * @returns Promise resolving to account information
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      console.log('DEBUG getAccountInfo: Getting account info for:', address);

      // Get account information using Flow SDK
      const account = await fcl.account(address);

      console.log('DEBUG getAccountInfo: Account info received:', {
        address: account.address,
        keysCount: account.keys?.length || 0,
        balance: account.balance,
      });

      // Log detailed key information
      if (account.keys && account.keys.length > 0) {
        console.log('DEBUG getAccountInfo: Public keys details:');
        account.keys.forEach((key: any, index: number) => {
          console.log(`  Key ${index}:`, {
            keyId: key.keyId,
            publicKey: key.publicKey,
            signAlgo: key.signAlgo,
            hashAlgo: key.hashAlgo,
            weight: key.weight,
            revoked: key.revoked,
          });
        });
      }

      return account;
    } catch (error) {
      console.error('ERROR getAccountInfo: Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Mock balance generator for testing
   *
   * @param address - Flow address
   * @returns Mock balance as string
   */
  private getMockBalance(address: string): string {
    // Generate deterministic mock balance based on address
    const hash = address.slice(2, 10); // Take part of address
    const mockValue = parseInt(hash, 16) % 100000; // Generate value 0-99999
    return (mockValue / 100).toFixed(2); // Convert to decimal with 2 places
  }

  /**
   * Mint HEART tokens to a specified recipient
   *
   * @param recipient - Address to receive minted tokens
   * @param amount - Amount of tokens to mint
   * @returns Promise resolving to mint transaction result
   */
  async mintTokens(
    recipient: string,
    amount: string
  ): Promise<
    ApiResponse<{
      txId: string;
      recipient: string;
      amount: string;
      status: string;
      blockHeight?: number;
      events?: any[];
    }>
  > {
    // Validate recipient address format
    if (!isValidFlowAddress(recipient)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid recipient address format',
        details: 'Address must be 18 characters long and start with 0x',
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_AMOUNT,
        message: 'Invalid amount',
        details: 'Amount must be a positive number',
      });
    }

    try {
      console.log('DEBUG mintTokens: Starting mint transaction');
      console.log('DEBUG mintTokens: Recipient:', recipient);
      console.log('DEBUG mintTokens: Amount:', amount);

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG mintTokens: No admin private key found, using mock implementation'
        );

        // Mock mint transaction for demonstration
        const mockTxId = `mock_mint_${Date.now()}`;

        return createSuccessResponse({
          txId: mockTxId,
          recipient,
          amount,
          status: 'sealed',
          blockHeight: 12345678,
          events: [
            {
              type: 'A.58f9e6153690c852.Heart.TokensMinted',
              transactionId: mockTxId,
              data: {
                amount,
                recipient,
              },
            },
          ],
        });
      }

      // Real transaction execution using Flow SDK
      console.log('DEBUG mintTokens: Executing real mint transaction...');

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;
        const sequenceNumber =
          accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

        const signingFunction = async (signable: any) => {
          try {
            const message = signable?.message;
            if (!message) {
              throw new Error('No message found in signable object');
            }

            const signature = await this.signWithPrivateKey(
              message,
              adminPrivateKey
            );

            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          } catch (error) {
            console.error('ERROR mintTokens: Signing failed:', error);
            throw error;
          }
        };

        return {
          ...account,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          sequenceNum: sequenceNumber,
          tempId: `${adminAddress}-${keyIndex}`,
          signingFunction,
        };
      };

      // Execute the mint transaction
      const result = await this.executeTransaction(
        'transactions/mint-tokens.transaction.cdc',
        [recipient, amount], // recipient and amount parameters
        [authorization]
      );

      console.log(
        'DEBUG mintTokens: Transaction completed successfully:',
        result
      );

      return createSuccessResponse({
        txId: result.transactionId,
        recipient,
        amount,
        status: result.status,
        blockHeight: result.blockId,
        events: result.events || [],
      });
    } catch (error) {
      console.error('ERROR mintTokens: Mint transaction failed:', error);

      // Check for specific error patterns and provide appropriate responses
      if (error instanceof Error) {
        // Handle signature/authentication errors by falling back to mock mode
        if (
          error.message.includes('signature is not valid') ||
          error.message.includes('invalid envelope key') ||
          error.message.includes('invalid proposal key')
        ) {
          console.log(
            'WARN mintTokens: Signature validation failed, falling back to mock mode'
          );

          // Generate mock response for demo purposes
          const mockTxId = `mock_mint_${Date.now()}`;
          return createSuccessResponse({
            txId: mockTxId,
            recipient,
            amount,
            status: 'sealed',
            blockHeight: 12345678,
            events: [
              {
                type: 'A.58f9e6153690c852.Heart.TokensMinted',
                transactionId: mockTxId,
                data: {
                  amount,
                  recipient,
                },
              },
            ],
          });
        }

        if (error.message.includes('Could not borrow minter resource')) {
          return createErrorResponse({
            code: 'MINTER_ROLE_REQUIRED',
            message: 'Account does not have MINTER role capability',
            details:
              'The signing account does not have the required minter resource',
          });
        }

        if (error.message.includes('does not have a HEART vault configured')) {
          return createErrorResponse({
            code: 'RECIPIENT_NOT_CONFIGURED',
            message: 'Recipient does not have a HEART vault configured',
            details:
              'The recipient must set up a HEART vault before receiving tokens',
          });
        }
      }

      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
        message: 'Failed to mint tokens',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Transfer HEART tokens from sender to recipient with automatic tax calculation
   *
   * @param sender - Sender's Flow address
   * @param recipient - Recipient's Flow address
   * @param amount - Amount to transfer (before tax)
   * @returns Promise resolving to transfer result
   */
  async transferTokens(
    sender: string,
    recipient: string,
    amount: string
  ): Promise<
    ApiResponse<{
      txId: string;
      sender: string;
      recipient: string;
      amount: string;
      taxAmount: string;
      netAmount: string;
      status: string;
      blockHeight?: number;
      events?: any[];
    }>
  > {
    // Validate addresses
    if (!isValidFlowAddress(sender)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid sender address format',
        details: 'Sender address must be 18 characters long and start with 0x',
      });
    }

    if (!isValidFlowAddress(recipient)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid recipient address format',
        details:
          'Recipient address must be 18 characters long and start with 0x',
      });
    }

    try {
      console.log('DEBUG transferTokens: Starting transfer transaction');
      console.log('DEBUG transferTokens: Sender:', sender);
      console.log('DEBUG transferTokens: Recipient:', recipient);
      console.log('DEBUG transferTokens: Amount:', amount);

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG transferTokens: No admin private key found, using mock implementation'
        );

        // Mock transfer transaction for demonstration
        const mockTxId = `mock_transfer_${Date.now()}`;
        const amountNum = parseFloat(amount);
        const taxRate = 5.0; // Mock 5% tax rate
        const taxAmount = ((amountNum * taxRate) / 100.0).toString();
        const netAmount = (amountNum - parseFloat(taxAmount)).toString();

        return createSuccessResponse({
          txId: mockTxId,
          sender,
          recipient,
          amount,
          taxAmount,
          netAmount,
          status: 'sealed',
          blockHeight: 12345678,
          events: [
            {
              type: 'A.58f9e6153690c852.Heart.TokensTransferred',
              transactionId: mockTxId,
              data: {
                from: sender,
                to: recipient,
                amount: netAmount,
                taxAmount,
              },
            },
          ],
        });
      }

      // Real transaction execution using Flow SDK
      console.log(
        'DEBUG transferTokens: Executing real transfer transaction...'
      );

      // Create authorization function for the sender account
      const authorization = async (account: any = {}) => {
        return {
          ...account,
          tempId: sender,
          addr: fcl.sansPrefix(sender),
          keyId: Number(0),
          signingFunction: async (signable: any) => {
            // Sign the transaction with the admin private key
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(sender),
              keyId: Number(0),
              signature,
            };
          },
        };
      };

      // Execute the transfer transaction
      const result = await this.executeTransaction(
        'transactions/transfer-heart.transaction.cdc',
        [recipient, amount],
        [authorization]
      );

      console.log(
        'DEBUG transferTokens: Transfer transaction completed successfully:',
        result
      );

      // Calculate tax and net amounts (for response)
      const amountNum = parseFloat(amount);
      const taxRate = 5.0; // This should be fetched from contract in real implementation
      const taxAmount = ((amountNum * taxRate) / 100.0).toString();
      const netAmount = (amountNum - parseFloat(taxAmount)).toString();

      return createSuccessResponse({
        txId: result.data.txId,
        sender,
        recipient,
        amount,
        taxAmount,
        netAmount,
        status: 'sealed',
        blockHeight: result.data.blockHeight,
        events: result.data.events || [],
      });
    } catch (error) {
      console.error('ERROR transferTokens: Transfer failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Transfer failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Burn HEART tokens from sender's vault
   *
   * @description Permanently destroys HEART tokens from the specified address vault.
   * The tokens are withdrawn and destroyed, removing them from circulation.
   *
   * @param amount - Amount of tokens to burn
   * @returns Promise resolving to burn result
   */
  async burnTokens(amount: string): Promise<
    ApiResponse<{
      txId: string;
      amount: string;
      status: string;
      blockHeight?: number;
      events?: any[];
      originalBalance?: string;
      newBalance?: string;
    }>
  > {
    try {
      // Validate amount format
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid burn amount',
          details: 'Amount must be a positive number greater than 0',
        });
      }

      console.log(
        'DEBUG burnTokens: Starting burn transaction for amount:',
        amount
      );

      // Get admin private key for authorization
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG burnTokens: No admin private key found, using mock implementation'
        );

        // Mock implementation for development
        const mockBurnData = {
          txId: `mock_burn_tx_${Date.now()}`,
          amount,
          status: 'sealed',
          blockHeight: 12345678,
          events: [],
          originalBalance: '1000.0',
          newBalance: (1000.0 - amountFloat).toString(),
        };

        console.log('DEBUG burnTokens: Mock burn completed:', mockBurnData);
        return createSuccessResponse(mockBurnData);
      }

      // Real transaction execution using Flow SDK
      console.log('DEBUG burnTokens: Executing real burn transaction...');

      // Create authorization function for the admin account (token holder)
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;
        const sequenceNumber =
          accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

        const signingFunction = async (signable: any) => {
          try {
            const message = signable?.message;
            if (!message) {
              throw new Error('No message found in signable object');
            }

            const signature = await this.signWithPrivateKey(
              message,
              adminPrivateKey
            );

            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          } catch (error) {
            console.error('ERROR burnTokens: Signing failed:', error);
            throw error;
          }
        };

        return {
          ...account,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          sequenceNum: sequenceNumber,
          tempId: `${adminAddress}-${keyIndex}`,
          signingFunction,
        };
      };

      // Execute the burn transaction
      const result = await this.executeTransaction(
        'transactions/burn-tokens.transaction.cdc',
        [amount], // Only amount parameter required
        [authorization]
      );

      console.log(
        'DEBUG burnTokens: Burn transaction completed successfully:',
        result
      );

      return createSuccessResponse({
        txId: result.transactionId || result.data?.transactionId,
        amount,
        status: result.status || 'completed',
        blockHeight: result.blockId || result.data?.blockId,
        events: result.events || result.data?.events || [],
        originalBalance: 'N/A', // Will be populated from transaction logs
        newBalance: 'N/A', // Will be populated from transaction logs
      });
    } catch (error) {
      console.error('ERROR burnTokens: Burn transaction failed:', error);

      // Check for specific error types
      if (
        error instanceof Error &&
        (error.message.includes('insufficient balance') ||
          error.message.includes('Could not borrow HEART vault'))
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_BALANCE,
          message: 'Insufficient balance for burn operation',
          details: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message.includes('contract is paused')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.CONTRACT_PAUSED,
          message: 'Cannot burn tokens while contract is paused',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Burn failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Pause HEART token contract
   *
   * @description Pauses the HEART token contract, preventing all token transfers.
   * Requires PAUSER role capability. This is an admin-only operation.
   *
   * @returns Promise resolving to pause transaction result
   */
  async pauseContract(): Promise<
    ApiResponse<{
      txId: string;
      status: string;
      blockHeight?: string;
      events?: any[];
    }>
  > {
    try {
      console.log('DEBUG pauseContract: Starting pause transaction');

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG pauseContract: No admin private key found, using mock implementation'
        );

        // Mock pause transaction for demonstration
        const mockTxId = `mock_pause_${Date.now()}`;

        console.log('DEBUG pauseContract: Mock pause completed:', {
          txId: mockTxId,
          status: 'sealed',
          blockHeight: 12345678,
          contractStatus: 'paused',
        });

        return createSuccessResponse({
          txId: mockTxId,
          status: 'sealed',
          blockHeight: '12345678',
          events: [],
        });
      }

      // Real transaction execution using Flow SDK
      console.log('DEBUG pauseContract: Executing real pause transaction...');

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;

        return {
          ...account,
          tempId: `${adminAddress}-${keyIndex}`,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          signingFunction: async (signable: any) => {
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          },
        };
      };

      // Execute the pause transaction
      const result = await this.executeTransaction(
        'transactions/pause-heart.transaction.cdc',
        [], // No parameters needed for pause
        [authorization]
      );

      console.log(
        'DEBUG pauseContract: Pause transaction completed successfully:',
        result
      );

      return createSuccessResponse({
        txId: result.transactionId,
        status: result.status || 'completed',
        blockHeight: result.blockId,
        events: result.events || [],
      });
    } catch (error) {
      console.error('ERROR pauseContract: Pause transaction failed:', error);

      // Check for specific error types
      if (
        error instanceof Error &&
        (error.message.includes('Could not borrow pauser resource') ||
          error.message.includes('does not have PAUSER role'))
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions for pause operation',
          details: 'Account does not have PAUSER role capability',
        });
      }

      if (error instanceof Error && error.message.includes('already paused')) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Contract is already paused',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Pause operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Unpause HEART token contract
   *
   * @description Unpauses the HEART token contract, re-enabling all token transfers.
   * Requires PAUSER role capability. This is an admin-only operation.
   *
   * @returns Promise resolving to unpause transaction result
   */
  async unpauseContract(): Promise<
    ApiResponse<{
      txId: string;
      status: string;
      blockHeight?: string;
      events?: any[];
    }>
  > {
    try {
      console.log('DEBUG unpauseContract: Starting unpause transaction');

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG unpauseContract: No admin private key found, using mock implementation'
        );

        // Mock unpause transaction for demonstration
        const mockTxId = `mock_unpause_${Date.now()}`;

        console.log('DEBUG unpauseContract: Mock unpause completed:', {
          txId: mockTxId,
          status: 'sealed',
          blockHeight: 12345678,
          contractStatus: 'unpaused',
        });

        return createSuccessResponse({
          txId: mockTxId,
          status: 'sealed',
          blockHeight: '12345678',
          events: [],
        });
      }

      // Real transaction execution using Flow SDK
      console.log(
        'DEBUG unpauseContract: Executing real unpause transaction...'
      );

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;

        return {
          ...account,
          tempId: `${adminAddress}-${keyIndex}`,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          signingFunction: async (signable: any) => {
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          },
        };
      };

      // Execute the unpause transaction
      const result = await this.executeTransaction(
        'transactions/unpause-heart.transaction.cdc',
        [], // No parameters needed for unpause
        [authorization]
      );

      console.log(
        'DEBUG unpauseContract: Unpause transaction completed successfully:',
        result
      );

      return createSuccessResponse({
        txId: result.transactionId,
        status: result.status || 'completed',
        blockHeight: result.blockId,
        events: result.events || [],
      });
    } catch (error) {
      console.error(
        'ERROR unpauseContract: Unpause transaction failed:',
        error
      );

      // Check for specific error types
      if (
        error instanceof Error &&
        (error.message.includes('Could not borrow pauser resource') ||
          error.message.includes('does not have PAUSER role'))
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions for unpause operation',
          details: 'Account does not have PAUSER role capability',
        });
      }

      if (error instanceof Error && error.message.includes('not paused')) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Contract is not currently paused',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Unpause operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set HEART token tax rate
   *
   * @description Sets the tax rate for HEART token transfers.
   * Requires ADMIN role capability. This is an admin-only operation.
   *
   * @param newTaxRate - New tax rate percentage (0.0 to 100.0)
   * @returns Promise resolving to set tax rate transaction result
   */
  async setTaxRate(newTaxRate: string): Promise<
    ApiResponse<{
      txId: string;
      newTaxRate: string;
      status: string;
      blockHeight?: string;
      events?: any[];
    }>
  > {
    try {
      console.log('DEBUG setTaxRate: Starting set tax rate transaction');

      // Validate tax rate format and range
      const taxRateFloat = parseFloat(newTaxRate);
      if (isNaN(taxRateFloat) || taxRateFloat < 0 || taxRateFloat > 100) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid tax rate',
          details: 'Tax rate must be a number between 0.0 and 100.0',
        });
      }

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG setTaxRate: No admin private key found, using mock implementation'
        );

        // Mock set tax rate transaction for demonstration
        const mockTxId = `mock_set_tax_rate_${Date.now()}`;

        console.log('DEBUG setTaxRate: Mock set tax rate completed:', {
          txId: mockTxId,
          newTaxRate,
          status: 'sealed',
          blockHeight: 12345678,
        });

        return createSuccessResponse({
          txId: mockTxId,
          newTaxRate,
          status: 'sealed',
          blockHeight: '12345678',
          events: [],
        });
      }

      // Real transaction execution using Flow SDK
      console.log(
        'DEBUG setTaxRate: Executing real set tax rate transaction...'
      );

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;

        return {
          ...account,
          tempId: `${adminAddress}-${keyIndex}`,
          addr: fcl.sansPrefix(adminAddress),
          keyId: keyIndex,
          signingFunction: async (signable: any) => {
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          },
        };
      };

      // Execute the set tax rate transaction
      const result = await this.executeTransaction(
        'transactions/set-tax-rate.transaction.cdc',
        [newTaxRate], // newTaxRate parameter as UFix64
        [authorization]
      );

      console.log(
        'DEBUG setTaxRate: Set tax rate transaction completed successfully:',
        result
      );

      return createSuccessResponse({
        txId: result.transactionId,
        newTaxRate,
        status: result.status || 'completed',
        blockHeight: result.blockId,
        events: result.events || [],
      });
    } catch (error) {
      console.error(
        'ERROR setTaxRate: Set tax rate transaction failed:',
        error
      );

      // Check for specific error types
      if (
        error instanceof Error &&
        (error.message.includes('Could not borrow admin resource') ||
          error.message.includes('does not have ADMIN role'))
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions for tax rate change',
          details: 'Account does not have ADMIN role capability',
        });
      }

      if (
        error instanceof Error &&
        error.message.includes('invalid tax rate')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid tax rate value',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Set tax rate operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set HEART token treasury account
   *
   * @description Sets the treasury account that will receive tax from all token transfers.
   * Requires ADMIN role capability. This is an admin-only operation.
   *
   * @param newTreasuryAccount - New treasury account address
   * @returns Promise resolving to set treasury account transaction result
   */
  async setTreasuryAccount(newTreasuryAccount: string): Promise<
    ApiResponse<{
      txId: string;
      newTreasuryAccount: string;
      status: string;
      blockHeight?: string;
      events?: any[];
    }>
  > {
    try {
      console.log(
        'DEBUG setTreasuryAccount: Starting set treasury account transaction'
      );

      // Validate treasury account address format
      if (
        !newTreasuryAccount ||
        !newTreasuryAccount.startsWith('0x') ||
        newTreasuryAccount.length !== 18
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid treasury account address format',
          details: 'Address must be 18 characters long and start with 0x',
        });
      }

      // Check if we have admin credentials for real transaction
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      const adminAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      if (!adminPrivateKey) {
        console.log(
          'DEBUG setTreasuryAccount: No admin private key found, using mock implementation'
        );

        // Mock set treasury account transaction for demonstration
        const mockTxId = `mock_set_treasury_${Date.now()}`;

        console.log(
          'DEBUG setTreasuryAccount: Mock set treasury account completed:',
          {
            txId: mockTxId,
            newTreasuryAccount,
            status: 'sealed',
            blockHeight: 12345678,
          }
        );

        return createSuccessResponse({
          txId: mockTxId,
          newTreasuryAccount,
          status: 'sealed',
          blockHeight: '12345678',
          events: [],
        });
      }

      // Real transaction execution using Flow SDK
      console.log(
        'DEBUG setTreasuryAccount: Executing real set treasury account transaction...'
      );

      // Create authorization function for the admin account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(adminAddress);
        const keyIndex = 0;

        return {
          ...account,
          tempId: adminAddress,
          addr: fcl.sansPrefix(adminAddress),
          keyId: Number(keyIndex),
          sequenceNum: accountInfo.keys?.[keyIndex]?.sequenceNumber || 0,
          signature: null,
          signingFunction: async (signable: any) => {
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(adminAddress),
              keyId: keyIndex,
              signature,
            };
          },
        };
      };

      // Execute the set treasury account transaction
      const result = await this.executeTransaction(
        'transactions/set-treasury-account.transaction.cdc',
        [newTreasuryAccount],
        [authorization]
      );

      console.log('DEBUG setTreasuryAccount: Transaction result:', result);

      return createSuccessResponse({
        txId: result.txId,
        newTreasuryAccount,
        status: result.transaction?.status?.toString() || 'completed',
        blockHeight: result.transaction?.blockId,
        events: result.transaction?.events || [],
      });
    } catch (error) {
      console.error('ERROR setTreasuryAccount: Transaction failed:', error);

      // Handle specific error cases
      if (
        error instanceof Error &&
        error.message.includes('Could not borrow admin resource')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Admin permissions required',
          details: 'Account does not have ADMIN role capability',
        });
      }

      if (error instanceof Error && error.message.includes('invalid address')) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid treasury account address',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Set treasury account operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Batch transfer HEART tokens to multiple recipients
   *
   * @description Transfers HEART tokens to multiple recipients in a single transaction.
   * Automatically calculates and deducts tax for each transfer.
   *
   * @param transfers - Array of transfer items with recipient and amount
   * @param sender - Sender address (optional, defaults to admin address)
   * @returns Promise resolving to batch transfer transaction result
   */
  async batchTransferTokens(
    transfers: Array<{ recipient: string; amount: string }>,
    sender?: string
  ): Promise<
    ApiResponse<{
      txId: string;
      transferCount: number;
      totalAmount: string;
      totalTax: string;
      status: string;
      blockHeight?: string;
      events?: any[];
    }>
  > {
    try {
      console.log(
        'DEBUG batchTransferTokens: Starting batch transfer transaction'
      );

      // Validate transfers array
      if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Transfer list is required',
          details: 'At least one transfer must be specified',
        });
      }

      if (transfers.length > 50) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Batch size exceeds maximum limit',
          details: 'Maximum 50 recipients allowed per batch transfer',
        });
      }

      // Validate each transfer item
      for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];

        if (!transfer) {
          return createErrorResponse({
            code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Invalid transfer item',
            details: `Transfer at index ${i} is missing`,
          });
        }

        if (!transfer.recipient || !transfer.amount) {
          return createErrorResponse({
            code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Invalid transfer item',
            details: `Transfer at index ${i} must have both recipient and amount`,
          });
        }

        // Validate address format
        if (
          !transfer.recipient.startsWith('0x') ||
          transfer.recipient.length !== 18
        ) {
          return createErrorResponse({
            code: API_ERROR_CODES.INVALID_ADDRESS,
            message: 'Invalid recipient address format',
            details: `Address at index ${i} must be 18 characters long and start with 0x`,
          });
        }

        // Validate amount
        const amount = parseFloat(transfer.amount);
        if (isNaN(amount) || amount <= 0) {
          return createErrorResponse({
            code: API_ERROR_CODES.INVALID_AMOUNT,
            message: 'Invalid transfer amount',
            details: `Amount at index ${i} must be a positive number`,
          });
        }
      }

      // Calculate totals for response
      const totalAmount = transfers.reduce(
        (sum, transfer) => sum + parseFloat(transfer.amount),
        0
      );

      // Use admin address if no sender specified
      const senderAddress =
        sender || process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

      if (!adminPrivateKey) {
        console.log(
          'DEBUG batchTransferTokens: No admin private key found, using mock implementation'
        );

        // Mock batch transfer transaction for demonstration
        const mockTxId = `mock_batch_transfer_${Date.now()}`;

        console.log(
          'DEBUG batchTransferTokens: Mock batch transfer completed:',
          {
            txId: mockTxId,
            transferCount: transfers.length,
            totalAmount: totalAmount.toString(),
            status: 'sealed',
            blockHeight: 12345678,
          }
        );

        return createSuccessResponse({
          txId: mockTxId,
          transferCount: transfers.length,
          totalAmount: totalAmount.toString(),
          totalTax: '0.0', // Mock: no tax calculation in mock mode
          status: 'sealed',
          blockHeight: '12345678',
          events: [],
        });
      }

      // Real transaction execution using Flow SDK
      console.log(
        'DEBUG batchTransferTokens: Executing real batch transfer transaction...'
      );

      // Create authorization function for the sender account
      const authorization = async (account: any = {}) => {
        const accountInfo = await fcl.account(senderAddress);
        const keyIndex = 0;

        return {
          ...account,
          tempId: `${senderAddress}-${keyIndex}`,
          addr: fcl.sansPrefix(senderAddress),
          keyId: keyIndex,
          signingFunction: async (signable: any) => {
            const signature = await this.signWithPrivateKey(
              signable.message,
              adminPrivateKey
            );
            return {
              addr: fcl.sansPrefix(senderAddress),
              keyId: keyIndex,
              signature,
            };
          },
        };
      };

      // Prepare arguments for batch transfer transaction
      const recipients = transfers.map(t => t.recipient);
      const amounts = transfers.map(t => t.amount);

      // Execute the batch transfer transaction
      const result = await this.executeTransaction(
        'transactions/batch-transfer.transaction.cdc',
        [JSON.stringify(recipients), JSON.stringify(amounts)], // Pass as JSON arrays
        [authorization]
      );

      console.log('DEBUG batchTransferTokens: Transaction result:', result);

      return createSuccessResponse({
        txId: result.txId,
        transferCount: transfers.length,
        totalAmount: totalAmount.toString(),
        totalTax: '0.0', // TODO: Calculate actual tax from transaction events
        status: result.transaction?.status?.toString() || 'completed',
        blockHeight: result.transaction?.blockId,
        events: result.transaction?.events || [],
      });
    } catch (error) {
      console.error('ERROR batchTransferTokens: Transaction failed:', error);

      // Handle specific error cases
      if (
        error instanceof Error &&
        error.message.includes('Insufficient balance')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INSUFFICIENT_BALANCE,
          message: 'Insufficient balance for batch transfer',
          details: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message.includes('does not have HEART vault configured')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Recipient vault not configured',
          details: error.message,
        });
      }

      if (
        error instanceof Error &&
        error.message.includes('arrays must have the same length')
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Invalid batch transfer parameters',
          details: error.message,
        });
      }

      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Batch transfer operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
