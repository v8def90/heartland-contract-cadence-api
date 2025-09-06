import {
  isValidFlowAddress,
  formatHeartAmount,
} from '../../../src/config/flow';

describe('Validation Utilities', () => {
  describe('Flow Address Validation', () => {
    it('should validate standard Flow addresses', () => {
      const validAddresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0x0000000000000001',
        '0xffffffffffffffff',
        '0x9a0766d93b6608b7',
      ];

      validAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should reject malformed addresses', () => {
      const invalidAddresses = [
        'not-an-address',
        '58f9e6153690c852', // Missing 0x
        '0x123', // Too short
        '0x123456789012345678', // Too long
        '0x58f9e6153690c85g', // Invalid hex
        '',
        '0x',
      ];

      invalidAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(isValidFlowAddress(null as any)).toBe(false);
      expect(isValidFlowAddress(undefined as any)).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(isValidFlowAddress('0x58F9E6153690C852')).toBe(true);
      expect(isValidFlowAddress('0xABCDEF1234567890')).toBe(true);
    });
  });

  describe('Amount Formatting', () => {
    it('should format amounts with proper decimal places', () => {
      expect(formatHeartAmount('100')).toBe('100.00');
      expect(formatHeartAmount('100.5')).toBe('100.50');
      expect(formatHeartAmount('100.12345678')).toBe('100.12345678');
    });

    it('should handle zero values', () => {
      expect(formatHeartAmount('0')).toBe('0.00');
      expect(formatHeartAmount('0.0')).toBe('0.00');
    });

    it('should round to 8 decimal places', () => {
      expect(formatHeartAmount('100.123456789')).toBe('100.12345679');
    });

    it('should handle large numbers with locale formatting', () => {
      expect(formatHeartAmount('1000000')).toBe('1,000,000.00');
      expect(formatHeartAmount('999999.99999999')).toBe('999,999.99999999');
    });

    it('should handle very small numbers', () => {
      expect(formatHeartAmount('0.00000001')).toBe('0.00000001');
      expect(formatHeartAmount('0.000000001')).toBe('0.00');
    });
  });

  describe('Input Sanitization', () => {
    it('should handle edge case inputs gracefully', () => {
      // These should not throw errors
      expect(() => formatHeartAmount('')).not.toThrow();
      expect(() => formatHeartAmount('invalid')).not.toThrow();
      expect(() => isValidFlowAddress('')).not.toThrow();
    });

    it('should be consistent in validation', () => {
      const testAddress = '0x58f9e6153690c852';

      // Multiple calls should return same result
      expect(isValidFlowAddress(testAddress)).toBe(true);
      expect(isValidFlowAddress(testAddress)).toBe(true);
      expect(isValidFlowAddress(testAddress)).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isValidFlowAddress(' 0x58f9e6153690c852 ')).toBe(false);
      expect(() => formatHeartAmount(' 100.5 ')).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should handle non-string inputs for address validation', () => {
      expect(isValidFlowAddress(123 as any)).toBe(false);
      expect(isValidFlowAddress(true as any)).toBe(false);
      expect(isValidFlowAddress({} as any)).toBe(false);
      expect(isValidFlowAddress([] as any)).toBe(false);
    });

    it('should handle non-string inputs for amount formatting', () => {
      expect(() => formatHeartAmount(null as any)).not.toThrow();
      expect(() => formatHeartAmount(undefined as any)).not.toThrow();
      expect(() => formatHeartAmount(123 as any)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should validate addresses quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        isValidFlowAddress('0x58f9e6153690c852');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should format amounts quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        formatHeartAmount('100.12345678');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });

  describe('Boundary Testing', () => {
    it('should handle minimum valid Flow address length', () => {
      expect(isValidFlowAddress('0x0000000000000001')).toBe(true);
    });

    it('should handle maximum valid Flow address length', () => {
      expect(isValidFlowAddress('0xffffffffffffffff')).toBe(true);
    });

    it('should reject addresses that are one character too short', () => {
      expect(isValidFlowAddress('0x000000000000001')).toBe(false);
    });

    it('should reject addresses that are one character too long', () => {
      expect(isValidFlowAddress('0x0000000000000001a')).toBe(false);
    });

    it('should handle minimum amount formatting', () => {
      expect(formatHeartAmount('0.00000001')).toBe('0.00000001');
    });

    it('should handle maximum precision', () => {
      expect(formatHeartAmount('99999999.99999999')).toBe(
        '99,999,999.99999999'
      );
    });
  });
});
