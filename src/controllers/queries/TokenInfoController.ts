/**
 * Token Information Controller for Heart Token API
 *
 * @description Handles token information queries for HEART tokens.
 * All endpoints in this controller are read-only operations that provide
 * general information about the token contract state.
 */

import {
  Controller,
  Get,
  Route,
  Path,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';
import type { PauseStatusData } from '../../models/responses';
import { formatHeartAmount } from '../../config/flow';
import { FlowService } from '../../services/FlowService';

/**
 * Tax Rate Information
 *
 * @description Information about the current tax rate applied to transfers
 */
export interface TaxRateData {
  /** Current tax rate as percentage (e.g., 5.0 for 5%) */
  taxRate: number;
  /** Tax rate as decimal (e.g., 0.05 for 5%) */
  taxRateDecimal: number;
  /** Human-readable tax rate description */
  formatted: string;
  /** Last time the tax rate was updated */
  lastUpdated?: string;
}

/**
 * Tax Calculation Information
 *
 * @description Tax calculation details for a specific amount
 */
export interface TaxCalculationData {
  /** Original amount before tax */
  originalAmount: string;
  /** Tax amount to be deducted */
  taxAmount: string;
  /** Net amount after tax deduction */
  netAmount: string;
  /** Tax rate used for calculation */
  taxRate: number;
  /** Formatted original amount */
  formattedOriginal: string;
  /** Formatted tax amount */
  formattedTax: string;
  /** Formatted net amount */
  formattedNet: string;
}

/**
 * Total Supply Information
 *
 * @description Information about the total token supply
 */
export interface TotalSupplyData {
  /** Total supply as string (avoids precision issues) */
  totalSupply: string;
  /** Number of decimal places for the token */
  decimals: number;
  /** Human-readable formatted total supply */
  formatted: string;
  /** Maximum supply limit (if any) */
  maxSupply?: string;
  /** Circulating supply (if different from total) */
  circulatingSupply?: string;
}

/**
 * Treasury Account Information
 *
 * @description Information about the contract's treasury account
 */
export interface TreasuryAccountData {
  /** Treasury account address */
  treasuryAddress: string;
  /** Current balance in the treasury account */
  treasuryBalance: string;
  /** Formatted treasury balance */
  formattedBalance: string;
  /** Last time treasury was updated */
  lastUpdated?: string;
  /** Treasury account capabilities */
  capabilities: string[];
}

/**
 * Token Information Controller
 *
 * @description Handles all token information related API endpoints for the Flow Heart Token contract.
 * Provides functionality for retrieving contract state information, tax rates, and supply data.
 *
 * @tags Token Info
 */
@Route('/')
@Tags('Token Info')
export class TokenInfoController extends Controller {
  private flowService: FlowService;

  constructor() {
    super();
    this.flowService = new FlowService();
  }

  /**
   * Get current tax rate
   *
   * @description Retrieves the current tax rate percentage applied to all HEART token transfers.
   * This is a read-only operation that executes a Flow script.
   *
   * @returns Promise resolving to current tax rate information
   */
  @Get('/tax-rate')
  @SuccessResponse('200', 'Tax rate retrieved successfully')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<TaxRateData>>({
    success: true,
    data: {
      taxRate: 5.0,
      taxRateDecimal: 0.05,
      formatted: '5.00%',
      lastUpdated: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getTaxRate(): Promise<ApiResponse<TaxRateData>> {
    try {
      console.log(
        'DEBUG getTaxRate: Starting tax rate retrieval via FlowService'
      );

      // Use FlowService to get tax rate from Flow blockchain
      const flowResponse = await this.flowService.getTaxRate();

      if (!flowResponse.success) {
        return flowResponse;
      }

      // FlowService already returns tax rate as percentage (e.g., 5.0 for 5%)
      const taxRatePercentage = flowResponse.data.taxRate;

      // Convert FlowService response to controller response format
      const taxRateData: TaxRateData = {
        taxRate: taxRatePercentage,
        taxRateDecimal: taxRatePercentage / 100, // Convert percentage to decimal
        formatted: flowResponse.data.formatted,
        lastUpdated: new Date().toISOString(),
      };

      console.log(
        'DEBUG getTaxRate: Successfully retrieved tax rate via Flow script:',
        `${taxRatePercentage}%`
      );

      return createSuccessResponse<TaxRateData>(taxRateData);
    } catch (error) {
      console.error('ERROR in getTaxRate:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve tax rate',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check contract pause status
   *
   * @description Checks whether the Heart Token contract is currently paused.
   * When paused, most operations (transfers, minting) are disabled.
   *
   * @returns Promise resolving to contract pause status
   */
  @Get('/pause-status')
  @SuccessResponse('200', 'Pause status retrieved successfully')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<PauseStatusData>>({
    success: true,
    data: {
      isPaused: false,
      pausedAt: null,
      pausedBy: null,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPauseStatus(): Promise<ApiResponse<PauseStatusData>> {
    try {
      console.log(
        'DEBUG getPauseStatus: Starting pause status retrieval via FlowService'
      );

      // Use FlowService to get pause status from Flow blockchain
      const flowResponse = await this.flowService.getPauseStatus();

      if (!flowResponse.success) {
        return flowResponse;
      }

      console.log(
        'DEBUG getPauseStatus: FlowService response:',
        flowResponse.data
      );
      console.log(
        'DEBUG getPauseStatus: Successfully retrieved pause status via Flow script:',
        flowResponse.data.isPaused
      );

      return flowResponse;
    } catch (error) {
      console.error('ERROR in getPauseStatus:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve pause status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Calculate tax for a given amount
   *
   * @description Calculates the tax amount and net amount after tax for a given transfer amount.
   * Uses the current tax rate to perform the calculation.
   *
   * @param amount - Amount to calculate tax for (as string to avoid precision issues)
   * @returns Promise resolving to tax calculation details
   *
   * @example amount "100.0"
   */
  @Get('/tax-calculation/{amount}')
  @SuccessResponse('200', 'Tax calculation completed successfully')
  @Response<ErrorResponse>('400', 'Invalid amount format')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<TaxCalculationData>>({
    success: true,
    data: {
      originalAmount: '100.0',
      taxAmount: '5.0',
      netAmount: '95.0',
      taxRate: 5.0,
      formattedOriginal: '100.00 HEART',
      formattedTax: '5.00 HEART',
      formattedNet: '95.00 HEART',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async calculateTax(
    @Path() amount: string
  ): Promise<ApiResponse<TaxCalculationData>> {
    try {
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid amount format',
          details: 'Amount must be a positive number',
        });
      }

      // Get current tax rate from FlowService
      console.log(
        'DEBUG calculateTax: Retrieving current tax rate via FlowService'
      );
      const taxRateResponse = await this.flowService.getTaxRate();

      if (!taxRateResponse.success) {
        return createErrorResponse({
          code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
          message: 'Failed to retrieve current tax rate',
          details: 'Unable to get tax rate from Flow network',
        });
      }

      const currentTaxRate = taxRateResponse.data.taxRate;
      console.log(
        'DEBUG calculateTax: Retrieved tax rate:',
        currentTaxRate,
        '%'
      );

      const taxRateDecimal = currentTaxRate / 100;

      // Calculate tax
      const taxAmount = numAmount * taxRateDecimal;
      const netAmount = numAmount - taxAmount;

      const taxCalculationData: TaxCalculationData = {
        originalAmount: amount,
        taxAmount: taxAmount.toFixed(8),
        netAmount: netAmount.toFixed(8),
        taxRate: currentTaxRate,
        formattedOriginal: formatHeartAmount(amount),
        formattedTax: formatHeartAmount(taxAmount.toFixed(8)),
        formattedNet: formatHeartAmount(netAmount.toFixed(8)),
      };

      console.log(
        'DEBUG calculateTax: Tax calculation completed - Tax Rate:',
        currentTaxRate,
        '%, Tax Amount:',
        taxAmount,
        ', Net Amount:',
        netAmount
      );

      return createSuccessResponse<TaxCalculationData>(taxCalculationData);
    } catch (error) {
      console.error('ERROR in calculateTax:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to calculate tax',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get total token supply
   *
   * @description Retrieves the total supply of HEART tokens currently in circulation.
   * This is a read-only operation that executes a Flow script.
   *
   * @returns Promise resolving to total supply information
   */
  @Get('/total-supply')
  @SuccessResponse('200', 'Total supply retrieved successfully')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<TotalSupplyData>>({
    success: true,
    data: {
      totalSupply: '1000000.0',
      decimals: 8,
      formatted: '1,000,000.00 HEART',
      maxSupply: '10000000.0',
      circulatingSupply: '1000000.0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getTotalSupply(): Promise<ApiResponse<TotalSupplyData>> {
    try {
      console.log(
        'DEBUG getTotalSupply: Starting total supply retrieval via FlowService'
      );

      // Use FlowService to get total supply from Flow blockchain
      const flowResponse = await this.flowService.getTotalSupply();

      if (!flowResponse.success) {
        return flowResponse;
      }

      console.log(
        'DEBUG getTotalSupply: FlowService response:',
        flowResponse.data
      );

      // Add additional fields that are not provided by FlowService
      const totalSupplyData: TotalSupplyData = {
        totalSupply: flowResponse.data.totalSupply,
        decimals: flowResponse.data.decimals,
        formatted: flowResponse.data.formatted,
        maxSupply: '10000000.0', // Mock max supply for now
        circulatingSupply: flowResponse.data.totalSupply, // Same as total for now
      };

      console.log(
        'DEBUG getTotalSupply: Successfully retrieved total supply via Flow script:',
        flowResponse.data.totalSupply
      );
      console.log(
        'DEBUG getTotalSupply: Final response data:',
        totalSupplyData
      );

      return createSuccessResponse<TotalSupplyData>(totalSupplyData);
    } catch (error) {
      console.error('ERROR in getTotalSupply:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve total supply',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get treasury account information
   *
   * @description Retrieves information about the contract's treasury account,
   * including the address, balance, and capabilities.
   *
   * @returns Promise resolving to treasury account information
   */
  @Get('/treasury-account')
  @SuccessResponse('200', 'Treasury account information retrieved successfully')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<TreasuryAccountData>>({
    success: true,
    data: {
      treasuryAddress: '0x58f9e6153690c852',
      treasuryBalance: '50000.0',
      formattedBalance: '50,000.00 HEART',
      lastUpdated: '2024-01-01T00:00:00.000Z',
      capabilities: ['receive', 'withdraw', 'tax_collection'],
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getTreasuryAccount(): Promise<ApiResponse<TreasuryAccountData>> {
    try {
      console.log(
        'DEBUG getTreasuryAccount: Starting treasury account retrieval via FlowService'
      );

      // Use FlowService to get treasury account from Flow blockchain
      const flowResponse = await this.flowService.getTreasuryAccount();

      if (!flowResponse.success) {
        return createErrorResponse({
          code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
          message: 'Failed to retrieve treasury account information',
          details: 'FlowService returned error',
        });
      }

      console.log(
        'DEBUG getTreasuryAccount: FlowService response:',
        flowResponse.data
      );

      // Get balance for treasury account (mock for now)
      const mockTreasuryBalance = '50000.0';

      const treasuryAccountData: TreasuryAccountData = {
        treasuryAddress: flowResponse.data.treasuryAddress,
        treasuryBalance: mockTreasuryBalance,
        formattedBalance: formatHeartAmount(mockTreasuryBalance),
        lastUpdated: new Date().toISOString(),
        capabilities: ['receive', 'withdraw', 'tax_collection'],
      };

      console.log(
        'DEBUG getTreasuryAccount: Successfully retrieved treasury account via Flow script:',
        flowResponse.data.treasuryAddress
      );

      return createSuccessResponse<TreasuryAccountData>(treasuryAccountData);
    } catch (error) {
      console.error('ERROR in getTreasuryAccount:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve treasury account information',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
