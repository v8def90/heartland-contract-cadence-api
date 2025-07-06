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
import { formatHeartAmount } from '../../config/flow';

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
 * Contract Pause Status Information
 *
 * @description Information about whether the contract is currently paused
 */
export interface PauseStatusData {
  /** Whether the contract is currently paused */
  isPaused: boolean;
  /** Reason for pause if paused */
  pauseReason?: string;
  /** Timestamp when contract was paused (if paused) */
  pausedAt?: string;
  /** Address that paused the contract (if paused) */
  pausedBy?: string;
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
      console.log('DEBUG getTaxRate: Fetching current tax rate');

      // Mock implementation - replace with actual Flow script call
      const mockTaxRate = 5.0; // 5%
      const taxRateDecimal = mockTaxRate / 100;

      const taxRateData: TaxRateData = {
        taxRate: mockTaxRate,
        taxRateDecimal,
        formatted: `${mockTaxRate.toFixed(2)}%`,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      console.log(
        'DEBUG getTaxRate: Successfully retrieved tax rate:',
        `${mockTaxRate}%`
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
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPauseStatus(): Promise<ApiResponse<PauseStatusData>> {
    try {
      console.log('DEBUG getPauseStatus: Checking contract pause status');

      // Mock implementation - replace with actual Flow script call
      const pauseStatusData: PauseStatusData = {
        isPaused: false,
      };

      console.log(
        'DEBUG getPauseStatus: Contract pause status:',
        pauseStatusData.isPaused
      );

      return createSuccessResponse<PauseStatusData>(pauseStatusData);
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
      console.log('DEBUG calculateTax: Calculating tax for amount:', amount);

      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid amount format',
          details: 'Amount must be a positive number',
        });
      }

      // Get current tax rate (mock for now)
      const currentTaxRate = 5.0; // 5%
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
        'DEBUG calculateTax: Tax calculation completed - Tax:',
        taxAmount,
        'Net:',
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
      console.log('DEBUG getTotalSupply: Fetching total token supply');

      // Mock implementation - replace with actual Flow script call
      const mockTotalSupply = '1000000.0';
      const mockMaxSupply = '10000000.0';

      const totalSupplyData: TotalSupplyData = {
        totalSupply: mockTotalSupply,
        decimals: 8,
        formatted: formatHeartAmount(mockTotalSupply),
        maxSupply: mockMaxSupply,
        circulatingSupply: mockTotalSupply, // Same as total for now
      };

      console.log(
        'DEBUG getTotalSupply: Successfully retrieved total supply:',
        mockTotalSupply
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
}
