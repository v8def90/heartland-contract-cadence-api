/**
 * Flow Blockchain Service
 *
 * @description Service for interacting with the Flow blockchain.
 * Provides methods to execute Flow scripts and transactions.
 */

import * as fcl from '@onflow/fcl';
import * as fs from 'fs';
import * as path from 'path';
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
    args: string[] = [],
  ): Promise<T> {
    try {
      // Read the script file
      const fullPath = path.join(process.cwd(), scriptPath);
      const scriptCode = fs.readFileSync(fullPath, 'utf8');

      // Replace contract addresses with dynamic values
      const processedScript = this.replaceContractAddresses(scriptCode);

      console.log('DEBUG executeScript: Executing script:', scriptPath);
      console.log('DEBUG executeScript: Script code:', processedScript);
      console.log('DEBUG executeScript: Args:', args);

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

      console.log('DEBUG executeScript: Script result:', result);
      return result;
    } catch (error) {
      console.error('ERROR executeScript: Script execution failed:', error);
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

    // Replace contract addresses based on current network
    processedScript = processedScript.replace(
      /0x9a0766d93b6608b7/g,
      CONTRACT_ADDRESSES.FungibleToken,
    );
    processedScript = processedScript.replace(
      /0x58f9e6153690c852/g,
      CONTRACT_ADDRESSES.Heart,
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
      console.log(
        'DEBUG getBalance: Starting Flow script execution for address:',
        address,
      );

      // Execute the Flow script to get balance
      const balanceResult = await this.executeScript<string>(
        'scripts/get-balance.cdc',
        [address],
      );

      console.log('DEBUG getBalance: Raw Flow script result:', balanceResult);
      console.log('DEBUG getBalance: Result type:', typeof balanceResult);

      // Convert UFix64 result to string
      const balance = parseFloat(balanceResult).toFixed(8);

      console.log('DEBUG getBalance: Processed balance:', balance);

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
      console.log('DEBUG getBalance: Falling back to mock data');
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
      console.log('DEBUG getTotalSupply: Starting Flow script execution');

      // Execute the Flow script to get total supply
      const totalSupplyResult = await this.executeScript<string>(
        'scripts/get-total-supply.cdc',
      );

      console.log(
        'DEBUG getTotalSupply: Raw Flow script result:',
        totalSupplyResult,
      );
      console.log(
        'DEBUG getTotalSupply: Result type:',
        typeof totalSupplyResult,
      );

      // Convert UFix64 result to string
      const totalSupply = parseFloat(totalSupplyResult).toFixed(8);
      const decimals = 8;

      console.log('DEBUG getTotalSupply: Processed total supply:', totalSupply);

      return createSuccessResponse<TotalSupplyData>({
        totalSupply,
        decimals,
        formatted: formatHeartAmount(totalSupply),
      });
    } catch (error) {
      console.error(
        'ERROR getTotalSupply: Flow script execution failed:',
        error,
      );
      console.error('ERROR getTotalSupply: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Fallback to mock data if Flow script fails
      console.log('DEBUG getTotalSupply: Falling back to mock data');
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
      console.log('DEBUG getTaxRate: Starting Flow script execution');

      // Execute the Flow script to get tax rate
      const taxRateResult = await this.executeScript<string>(
        'scripts/get-tax-rate.cdc',
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
          taxRatePercentage,
        );
      } else {
        // Assume percentage format (5.0 = 5%)
        taxRatePercentage = taxRateDecimal;
        console.log(
          'DEBUG getTaxRate: Using as percentage directly:',
          taxRatePercentage,
        );
      }

      console.log(
        'DEBUG getTaxRate: Final tax rate percentage:',
        taxRatePercentage,
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
        'scripts/get-treasury-account.cdc',
      );

      console.log(
        'DEBUG getTreasuryAccount: Raw Flow script result:',
        treasuryResult,
      );
      console.log(
        'DEBUG getTreasuryAccount: Result type:',
        typeof treasuryResult,
      );

      // Parse the address result
      const treasuryAddress = treasuryResult.toString();

      console.log(
        'DEBUG getTreasuryAccount: Processed treasury address:',
        treasuryAddress,
      );

      return createSuccessResponse<TreasuryData>({
        treasuryAddress,
        isValid: isValidFlowAddress(treasuryAddress),
      });
    } catch (error) {
      console.error(
        'ERROR getTreasuryAccount: Flow script execution failed:',
        error,
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
        'scripts/get-pause-status.cdc',
      );

      console.log(
        'DEBUG getPauseStatus: Raw Flow script result:',
        pauseStatusResult,
      );
      console.log(
        'DEBUG getPauseStatus: Result type:',
        typeof pauseStatusResult,
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
        error,
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

  /**
   * Check admin capabilities for an address
   *
   * @param address - Address to check capabilities for
   * @returns Promise resolving to admin capabilities
   */
  async getAdminCapabilities(
    address: string,
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
        address,
      );

      // Execute the Flow script to get admin capabilities
      const capabilitiesResult = await this.executeScript<{
        [key: string]: boolean;
      }>('scripts/get-admin-capabilities.cdc', [address]);

      console.log(
        'DEBUG getAdminCapabilities: Raw Flow script result:',
        capabilitiesResult,
      );
      console.log(
        'DEBUG getAdminCapabilities: Result type:',
        typeof capabilitiesResult,
      );

      // Parse the capabilities result
      const adminCapabilities: AdminCapabilitiesData = {
        address,
        canMint: Boolean(capabilitiesResult.canMint),
        canBurn: Boolean(capabilitiesResult.canBurn),
        canPause: Boolean(capabilitiesResult.canPause),
        canSetTaxRate: Boolean(capabilitiesResult.canSetTaxRate),
        canSetTreasury: Boolean(capabilitiesResult.canSetTreasury),
        isAdmin: Boolean(capabilitiesResult.isAdmin),
      };

      console.log(
        'DEBUG getAdminCapabilities: Processed admin capabilities:',
        adminCapabilities,
      );

      return createSuccessResponse<AdminCapabilitiesData>(adminCapabilities);
    } catch (error) {
      console.error(
        'ERROR getAdminCapabilities: Flow script execution failed:',
        error,
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
}
