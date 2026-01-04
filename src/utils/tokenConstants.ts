/**
 * Token Management Constants
 *
 * @description Constants for HEART token management including decimal precision,
 * initial balance, and weight evaluation thresholds.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Token decimal precision
 *
 * @description Number of decimal places for HEART token amounts.
 * Matches the existing Flow contract precision (8 decimal places).
 */
export const TOKEN_DECIMAL_PRECISION = 8;

/**
 * Initial balance for new users
 *
 * @description Initial HEART token balance granted to new users upon account creation.
 * Format: "1000.00000000" (8 decimal places).
 */
export const INITIAL_BALANCE = '1000.00000000';

/**
 * Initial balance as number
 *
 * @description Initial balance as a number for calculations.
 */
export const INITIAL_BALANCE_DECIMAL = 1000.0;

/**
 * Weight evaluation thresholds
 *
 * @description Thresholds for 5-level weight evaluation.
 * Weight is calculated as: amount / (balance - amount + 1)
 * Levels:
 * - Level 1: weight < threshold1
 * - Level 2: threshold1 <= weight < threshold2
 * - Level 3: threshold2 <= weight < threshold3
 * - Level 4: threshold3 <= weight < threshold4
 * - Level 5: threshold4 <= weight
 */
export const getWeightThresholds = (): {
  threshold1: number;
  threshold2: number;
  threshold3: number;
  threshold4: number;
} => {
  return {
    threshold1: parseFloat(process.env.WEIGHT_THRESHOLD_1 || '0.2'),
    threshold2: parseFloat(process.env.WEIGHT_THRESHOLD_2 || '0.4'),
    threshold3: parseFloat(process.env.WEIGHT_THRESHOLD_3 || '0.6'),
    threshold4: parseFloat(process.env.WEIGHT_THRESHOLD_4 || '0.8'),
  };
};

/**
 * Tax rate
 *
 * @description Current tax rate percentage for token transfers.
 * Default: 0% (from environment variable TAX_RATE).
 */
export const getTaxRate = (): number => {
  return parseFloat(process.env.TAX_RATE || '0');
};

/**
 * Format token amount
 *
 * @description Formats a token amount string to have exactly 8 decimal places.
 *
 * @param amount - Amount as string or number
 * @returns Formatted amount string with 8 decimal places
 *
 * @example
 * ```typescript
 * formatTokenAmount(100) // "100.00000000"
 * formatTokenAmount("100.5") // "100.50000000"
 * ```
 */
export const formatTokenAmount = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return numAmount.toFixed(TOKEN_DECIMAL_PRECISION);
};

/**
 * Parse token amount
 *
 * @description Parses a token amount string to a number.
 *
 * @param amount - Amount as string
 * @returns Amount as number
 *
 * @example
 * ```typescript
 * parseTokenAmount("100.00000000") // 100.0
 * parseTokenAmount("100.5") // 100.5
 * ```
 */
export const parseTokenAmount = (amount: string): number => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return numAmount;
};
