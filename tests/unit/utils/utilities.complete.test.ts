/**
 * Utilities Complete Tests
 *
 * @description Complete tests for utility functions and helper methods
 * used throughout the application. Targets maximum coverage for utility modules.
 */

import {
  isValidFlowAddress,
  formatHeartAmount,
  calculateTaxAmount,
} from '../../../src/config/flow';

describe('Utilities Complete Tests', () => {
  describe('Comprehensive Address Validation', () => {
    it('should validate all contract addresses from constants', () => {
      const contractAddresses = [
        '0x58f9e6153690c852', // Heart
        '0x9a0766d93b6608b7', // FungibleToken
        '0x631e88ae7f1d7c20', // NonFungibleToken
        '0x7e60df042a9c0868', // FlowToken
        '0x631e88ae7f1d7c20', // MetadataViews
      ];

      contractAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should handle boundary cases for address length', () => {
      // Exactly 18 characters (0x + 16 hex chars)
      expect(isValidFlowAddress('0x1234567890abcdef')).toBe(true);

      // 17 characters (too short)
      expect(isValidFlowAddress('0x1234567890abcde')).toBe(false);

      // 19 characters (too long)
      expect(isValidFlowAddress('0x1234567890abcdef1')).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const baseAddress = '0x58f9e6153690c852';
      const upperCase = baseAddress.toUpperCase();
      const mixedCase = '0x58F9E6153690C852';

      expect(isValidFlowAddress(baseAddress)).toBe(true);
      expect(isValidFlowAddress(upperCase)).toBe(true);
      expect(isValidFlowAddress(mixedCase)).toBe(true);
    });

    it('should reject addresses with invalid hex characters', () => {
      const invalidHexChars = [
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
      ];

      invalidHexChars.forEach(char => {
        const invalidAddress = `0x58f9e6153690c85${char}`;
        expect(isValidFlowAddress(invalidAddress)).toBe(false);
      });
    });
  });

  describe('Advanced Amount Formatting', () => {
    it('should handle scientific notation inputs', () => {
      expect(formatHeartAmount('1e6')).toBe('1,000,000.00');
      expect(formatHeartAmount('1.5e3')).toBe('1,500.00');
      expect(formatHeartAmount('2.5e-2')).toBe('0.025');
    });

    it('should handle different decimal precisions', () => {
      expect(formatHeartAmount('100')).toBe('100.00');
      expect(formatHeartAmount('100.1')).toBe('100.10');
      expect(formatHeartAmount('100.12')).toBe('100.12');
      expect(formatHeartAmount('100.123')).toBe('100.123');
      expect(formatHeartAmount('100.1234')).toBe('100.1234');
      expect(formatHeartAmount('100.12345')).toBe('100.12345');
      expect(formatHeartAmount('100.123456')).toBe('100.123456');
      expect(formatHeartAmount('100.1234567')).toBe('100.1234567');
      expect(formatHeartAmount('100.12345678')).toBe('100.12345678');
    });

    it('should handle locale-specific formatting', () => {
      // Test large numbers with comma separators
      expect(formatHeartAmount('1234567.89')).toBe('1,234,567.89');
      expect(formatHeartAmount('12345678.90')).toBe('12,345,678.90');
      expect(formatHeartAmount('123456789.01')).toBe('123,456,789.01');
    });

    it('should handle edge cases with symbol inclusion', () => {
      expect(formatHeartAmount('0', true)).toBe('0.00 HEART');
      expect(formatHeartAmount('0.0', true)).toBe('0.00 HEART');
      expect(formatHeartAmount('0.00000001', true)).toBe('0.00000001 HEART');
      // Large numbers get rounded by toLocaleString
      expect(formatHeartAmount('999999999.99999999', true)).toBe(
        '1,000,000,000.00 HEART'
      );
    });

    it('should handle whitespace and padding in inputs', () => {
      expect(formatHeartAmount(' 100.0 ')).toBe('100.00');
      expect(formatHeartAmount('  100.0  ', true)).toBe('100.00 HEART');
    });

    it('should handle various invalid number formats', () => {
      const invalidInputs = ['abc', '$100'];

      const numericCases = [
        { input: '100,000', expected: '100.00' }, // parseFloat stops at comma
        { input: '100%', expected: '100.00' }, // parseFloat stops at %
        { input: '100.0.0', expected: '100.00' }, // parseFloat converts this to 100
        { input: 'Infinity', expected: 'Infinity' },
        { input: '-Infinity', expected: '-Infinity' },
        { input: 'NaN', expected: 'NaN' },
      ];

      invalidInputs.forEach(input => {
        const result = formatHeartAmount(input);
        expect(typeof result).toBe('string');
        // Should return the input as-is for invalid numbers
        expect(result).toBe(input);
      });

      numericCases.forEach(({ input, expected }) => {
        const result = formatHeartAmount(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Advanced Tax Calculation', () => {
    it('should handle fractional tax rates', () => {
      expect(calculateTaxAmount('100.0', 0.1)).toBe('0.10000000');
      expect(calculateTaxAmount('100.0', 0.01)).toBe('0.01000000');
      expect(calculateTaxAmount('100.0', 0.001)).toBe('0.00100000');
    });

    it('should handle high precision amounts', () => {
      expect(calculateTaxAmount('123.45678901', 5.0)).toBe('6.17283945');
      expect(calculateTaxAmount('0.12345678', 10.0)).toBe('0.01234568');
    });

    it('should handle very high tax rates', () => {
      expect(calculateTaxAmount('100.0', 50.0)).toBe('50.00000000');
      expect(calculateTaxAmount('100.0', 100.0)).toBe('100.00000000');
      expect(calculateTaxAmount('100.0', 200.0)).toBe('200.00000000');
    });

    it('should handle edge cases with zero values', () => {
      expect(calculateTaxAmount('0', 0)).toBe('0.00000000');
      expect(calculateTaxAmount('0.0', 0.0)).toBe('0.00000000');
      expect(calculateTaxAmount('0.00000000', 5.0)).toBe('0.00000000');
    });

    it('should maintain precision for small calculations', () => {
      expect(calculateTaxAmount('0.01', 1.0)).toBe('0.00010000');
      expect(calculateTaxAmount('0.001', 1.0)).toBe('0.00001000');
      expect(calculateTaxAmount('0.0001', 1.0)).toBe('0.00000100');
    });

    it('should handle various invalid amount formats', () => {
      const invalidAmounts = [
        'not-a-number',
        '',
        'abc123',
        'null',
        'undefined',
      ];

      const specialCases = [
        { input: '100.0.0', expected: '5.00000000' }, // parseFloat converts this to 100
      ];

      invalidAmounts.forEach(amount => {
        expect(calculateTaxAmount(amount, 5.0)).toBe('0.00000000');
      });

      specialCases.forEach(({ input, expected }) => {
        expect(calculateTaxAmount(input, 5.0)).toBe(expected);
      });
    });

    it('should handle invalid tax rate formats', () => {
      const invalidRates = [NaN, Infinity, -Infinity];

      invalidRates.forEach(rate => {
        expect(calculateTaxAmount('100.0', rate)).toBe('0.00000000');
      });
    });
  });

  describe('Utility Function Integration', () => {
    it('should work together for complete transaction flow', () => {
      const senderAddress = '0x58f9e6153690c852';
      const recipientAddress = '0x1234567890abcdef';
      const amount = '1000.0';
      const taxRate = 5.0;

      // Validate addresses
      expect(isValidFlowAddress(senderAddress)).toBe(true);
      expect(isValidFlowAddress(recipientAddress)).toBe(true);

      // Calculate tax
      const taxAmount = calculateTaxAmount(amount, taxRate);
      expect(taxAmount).toBe('50.00000000');

      // Format amounts for display
      const formattedAmount = formatHeartAmount(amount, true);
      const formattedTax = formatHeartAmount(taxAmount, true);

      expect(formattedAmount).toBe('1,000.00 HEART');
      expect(formattedTax).toBe('50.00 HEART');

      // Calculate net amount
      const netAmount = (parseFloat(amount) - parseFloat(taxAmount)).toString();
      const formattedNet = formatHeartAmount(netAmount, true);

      expect(formattedNet).toBe('950.00 HEART');
    });

    it('should handle complete invalid scenario gracefully', () => {
      const invalidAddress = 'invalid-address';
      const invalidAmount = 'not-a-number';
      const invalidTaxRate = NaN;

      expect(isValidFlowAddress(invalidAddress)).toBe(false);
      expect(formatHeartAmount(invalidAmount)).toBe('not-a-number');
      expect(calculateTaxAmount(invalidAmount, invalidTaxRate)).toBe(
        '0.00000000'
      );
    });

    it('should handle mixed valid/invalid inputs', () => {
      const validAddress = '0x58f9e6153690c852';
      const invalidAddress = 'invalid';
      const validAmount = '100.0';
      const invalidAmount = 'invalid';

      expect(isValidFlowAddress(validAddress)).toBe(true);
      expect(isValidFlowAddress(invalidAddress)).toBe(false);

      expect(formatHeartAmount(validAmount)).toBe('100.00');
      expect(formatHeartAmount(invalidAmount)).toBe('invalid');

      expect(calculateTaxAmount(validAmount, 5.0)).toBe('5.00000000');
      expect(calculateTaxAmount(invalidAmount, 5.0)).toBe('0.00000000');
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large batch of address validations', () => {
      const addresses = [];
      for (let i = 0; i < 1000; i++) {
        addresses.push(`0x${i.toString(16).padStart(16, '0')}`);
      }

      const startTime = Date.now();
      const results = addresses.map(addr => isValidFlowAddress(addr));
      const endTime = Date.now();

      expect(results.every(result => result === true)).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle large batch of amount formatting', () => {
      const amounts = [];
      for (let i = 0; i < 1000; i++) {
        amounts.push((Math.random() * 1000000).toString());
      }

      const startTime = Date.now();
      const results = amounts.map(amount => formatHeartAmount(amount));
      const endTime = Date.now();

      expect(results.length).toBe(1000);
      expect(results.every(result => typeof result === 'string')).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // Should complete in under 200ms
    });

    it('should handle large batch of tax calculations', () => {
      const calculations = [];
      for (let i = 0; i < 1000; i++) {
        calculations.push({
          amount: (Math.random() * 1000).toString(),
          rate: Math.random() * 10,
        });
      }

      const startTime = Date.now();
      const results = calculations.map(calc =>
        calculateTaxAmount(calc.amount, calc.rate)
      );
      const endTime = Date.now();

      expect(results.length).toBe(1000);
      expect(results.every(result => typeof result === 'string')).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
