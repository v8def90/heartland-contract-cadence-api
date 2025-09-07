/**
 * Flow Configuration Complete Tests
 *
 * @description Complete coverage tests for src/config/flow.ts targeting 100% coverage.
 * Focuses on all exported functions and edge cases to maximize coverage improvement.
 */

import {
  isValidFlowAddress,
  isValidTransactionId,
  formatHeartAmount,
  calculateTaxAmount,
  CONTRACT_ADDRESSES,
  FLOW_CONSTANTS,
} from '../../../src/config/flow';

describe('Flow Configuration Complete Tests', () => {
  describe('Address Validation - isValidFlowAddress', () => {
    it('should validate proper Flow address format', () => {
      const validAddresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0xabcdef1234567890',
        '0x0000000000000000',
        '0xffffffffffffffff',
        '0xABCDEF1234567890', // uppercase
        '0xaBcDeF1234567890', // mixed case
      ];

      validAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should reject invalid Flow address formats', () => {
      const invalidAddresses = [
        '', // empty string
        '0x', // too short
        '0x123', // too short
        '58f9e6153690c852', // missing 0x prefix
        '0x58f9e6153690c852x', // too long
        '0xGHIJKLMNOPQRSTUV', // invalid hex characters
        '0x58f9e6153690c85', // too short by 1 char
        '0x58f9e6153690c8522', // too long by 1 char
        'invalid-address',
        '123456789',
        'not-an-address',
      ];

      invalidAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(false);
      });
    });

    it('should handle non-string inputs gracefully', () => {
      // Type assertion for testing purposes
      expect(isValidFlowAddress(null as any)).toBe(false);
      expect(isValidFlowAddress(undefined as any)).toBe(false);
      expect(isValidFlowAddress(123 as any)).toBe(false);
      expect(isValidFlowAddress({} as any)).toBe(false);
      expect(isValidFlowAddress([] as any)).toBe(false);
    });
  });

  describe('Transaction ID Validation - isValidTransactionId', () => {
    it('should validate proper transaction ID format', () => {
      const validTxIds = [
        'abc123def456789012345678901234567890123456789012345678901234567890'.substring(
          0,
          64
        ),
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'.substring(
          0,
          64
        ),
        'f05465947e489fb5cb50c049d2329e386800b8b8f0acb39c7f653a2ec8c185ee',
        '2de07c05b85b95909f3afbede5ba2778fe8207bc50baac96bcd261b9fef09439',
      ];

      validTxIds.forEach(txId => {
        expect(isValidTransactionId(txId)).toBe(true);
      });
    });

    it('should reject invalid transaction ID formats', () => {
      const invalidTxIds = [
        '', // empty string
        '123', // too short
        'invalid-tx-id',
        'abc123def456789012345678901234567890123456789012345678901234567890x', // too long
        'GHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890123456789012345', // invalid hex
        'abc123def45678901234567890123456789012345678901234567890123456789', // too short by 1
      ];

      invalidTxIds.forEach(txId => {
        expect(isValidTransactionId(txId)).toBe(false);
      });
    });

    it('should handle non-string inputs gracefully', () => {
      expect(isValidTransactionId(null as any)).toBe(false);
      expect(isValidTransactionId(undefined as any)).toBe(false);
      expect(isValidTransactionId(123 as any)).toBe(false);
      expect(isValidTransactionId({} as any)).toBe(false);
    });
  });

  describe('Amount Formatting - formatHeartAmount', () => {
    it('should format amounts correctly without symbol', () => {
      expect(formatHeartAmount('1000.00000000')).toBe('1,000.00');
      expect(formatHeartAmount('100.50000000')).toBe('100.50');
      expect(formatHeartAmount('0.12345678')).toBe('0.12345678');
      expect(formatHeartAmount('1234567.89012345')).toBe('1,234,567.89012345');
    });

    it('should format amounts correctly with symbol', () => {
      expect(formatHeartAmount('1000.00000000', true)).toBe('1,000.00 HEART');
      expect(formatHeartAmount('100.50000000', true)).toBe('100.50 HEART');
      expect(formatHeartAmount('0.12345678', true)).toBe('0.12345678 HEART');
    });

    it('should handle edge cases and invalid inputs', () => {
      expect(formatHeartAmount('0')).toBe('0.00');
      expect(formatHeartAmount('0.0')).toBe('0.00');
      expect(formatHeartAmount('invalid-number')).toBe('invalid-number');
      expect(formatHeartAmount('invalid-number', true)).toBe(
        'invalid-number HEART'
      );
      expect(formatHeartAmount('')).toBe('');
      expect(formatHeartAmount('', true)).toBe(' HEART');
    });

    it('should handle very large and very small numbers', () => {
      // Large numbers get rounded by toLocaleString
      expect(formatHeartAmount('999999999.99999999')).toBe('1,000,000,000.00');
      expect(formatHeartAmount('0.00000001')).toBe('0.00000001');
      expect(formatHeartAmount('1000000000000')).toBe('1,000,000,000,000.00');
    });

    it('should handle negative numbers', () => {
      expect(formatHeartAmount('-100.50000000')).toBe('-100.50');
      expect(formatHeartAmount('-1000.00000000', true)).toBe('-1,000.00 HEART');
    });
  });

  describe('Tax Calculation - calculateTaxAmount', () => {
    it('should calculate tax amounts correctly', () => {
      expect(calculateTaxAmount('100.0', 5.0)).toBe('5.00000000');
      expect(calculateTaxAmount('1000.0', 2.5)).toBe('25.00000000');
      expect(calculateTaxAmount('50.0', 10.0)).toBe('5.00000000');
      expect(calculateTaxAmount('200.0', 0.5)).toBe('1.00000000');
    });

    it('should handle zero tax rate', () => {
      expect(calculateTaxAmount('100.0', 0)).toBe('0.00000000');
      expect(calculateTaxAmount('1000.0', 0.0)).toBe('0.00000000');
    });

    it('should handle zero amount', () => {
      expect(calculateTaxAmount('0', 5.0)).toBe('0.00000000');
      expect(calculateTaxAmount('0.0', 10.0)).toBe('0.00000000');
    });

    it('should handle decimal amounts and tax rates', () => {
      expect(calculateTaxAmount('123.456', 7.25)).toBe('8.95056000');
      expect(calculateTaxAmount('99.99', 3.75)).toBe('3.74962500');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(calculateTaxAmount('invalid', 5.0)).toBe('0.00000000');
      expect(calculateTaxAmount('100.0', NaN)).toBe('0.00000000');
      expect(calculateTaxAmount('', 5.0)).toBe('0.00000000');
    });

    it('should handle negative amounts and tax rates', () => {
      expect(calculateTaxAmount('-100.0', 5.0)).toBe('-5.00000000');
      expect(calculateTaxAmount('100.0', -5.0)).toBe('-5.00000000');
      expect(calculateTaxAmount('-100.0', -5.0)).toBe('5.00000000');
    });

    it('should handle very large numbers', () => {
      expect(calculateTaxAmount('1000000.0', 5.0)).toBe('50000.00000000');
      expect(calculateTaxAmount('100.0', 100.0)).toBe('100.00000000');
    });
  });

  describe('Constants and Configuration', () => {
    it('should have all required contract addresses', () => {
      expect(CONTRACT_ADDRESSES).toBeDefined();
      expect(CONTRACT_ADDRESSES.Heart).toBeDefined();
      expect(CONTRACT_ADDRESSES.FungibleToken).toBeDefined();
      expect(CONTRACT_ADDRESSES.NonFungibleToken).toBeDefined();
      expect(CONTRACT_ADDRESSES.FlowToken).toBeDefined();
      expect(CONTRACT_ADDRESSES.MetadataViews).toBeDefined();
    });

    it('should have valid contract address formats', () => {
      Object.values(CONTRACT_ADDRESSES).forEach(address => {
        expect(typeof address).toBe('string');
        expect(address).toMatch(/^0x[0-9a-fA-F]{16}$/);
      });
    });

    it('should have all required Flow constants', () => {
      expect(FLOW_CONSTANTS).toBeDefined();
      expect(FLOW_CONSTANTS.HEART_DECIMALS).toBe(8);
      expect(FLOW_CONSTANTS.HEART_SYMBOL).toBe('HEART');
      expect(FLOW_CONSTANTS.ADDRESS_PATTERN).toBeInstanceOf(RegExp);
      expect(FLOW_CONSTANTS.TX_ID_PATTERN).toBeInstanceOf(RegExp);
    });

    it('should have working regex patterns', () => {
      // Test address pattern
      expect(FLOW_CONSTANTS.ADDRESS_PATTERN.test('0x58f9e6153690c852')).toBe(
        true
      );
      expect(FLOW_CONSTANTS.ADDRESS_PATTERN.test('invalid')).toBe(false);

      // Test transaction ID pattern (64 characters)
      expect(
        FLOW_CONSTANTS.TX_ID_PATTERN.test(
          'abc123def456789012345678901234567890123456789012345678901234567890'.substring(
            0,
            64
          )
        )
      ).toBe(true);
      expect(FLOW_CONSTANTS.TX_ID_PATTERN.test('invalid')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete validation flow', () => {
      const address = '0x58f9e6153690c852';
      const amount = '100.0';
      const taxRate = 5.0;

      expect(isValidFlowAddress(address)).toBe(true);
      const formattedAmount = formatHeartAmount(amount, true);
      expect(formattedAmount).toBe('100.00 HEART');

      const taxAmount = calculateTaxAmount(amount, taxRate);
      expect(taxAmount).toBe('5.00000000');

      const formattedTax = formatHeartAmount(taxAmount, true);
      expect(formattedTax).toBe('5.00 HEART');
    });

    it('should handle complete invalid input scenario', () => {
      const invalidAddress = 'invalid-address';
      const invalidAmount = 'not-a-number';
      const invalidTaxRate = NaN;

      expect(isValidFlowAddress(invalidAddress)).toBe(false);
      expect(formatHeartAmount(invalidAmount)).toBe('not-a-number');
      expect(calculateTaxAmount(invalidAmount, invalidTaxRate)).toBe(
        '0.00000000'
      );
    });
  });
});
