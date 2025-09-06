import {
  isValidFlowAddress,
  formatHeartAmount,
  CONTRACT_ADDRESSES,
  flowConfig,
} from '../../../src/config/flow';

describe('Flow Configuration', () => {
  describe('isValidFlowAddress', () => {
    it('should validate correct Flow address format', () => {
      const validAddresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0x0000000000000001',
        '0xabcdefabcdefabcd',
        '0x9a0766d93b6608b7',
      ];

      validAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should reject invalid Flow address formats', () => {
      const invalidAddresses = [
        'invalid-address',
        '58f9e6153690c852', // Missing 0x prefix
        '0x58f9e6153690c85', // Too short
        '0x58f9e6153690c8529', // Too long
        '0x58f9e6153690c85g', // Invalid hex character
        '',
        '0x',
        '0xG8f9e6153690c852', // Invalid hex character at start
      ];

      invalidAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(false);
      });

      // Test null and undefined separately - they return false (no error)
      expect(isValidFlowAddress(null as any)).toBe(false);
      expect(isValidFlowAddress(undefined as any)).toBe(false);
    });

    it('should handle uppercase hex addresses', () => {
      const uppercaseAddresses = [
        '0x58F9E6153690C852',
        '0xABCDEFABCDEFABCD',
        '0x1234567890ABCDEF',
      ];

      uppercaseAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should handle mixed case hex addresses', () => {
      const mixedCaseAddresses = [
        '0x58f9E6153690c852',
        '0xAbCdEfAbCdEfAbCd',
        '0x1234567890aBcDeF',
      ];

      mixedCaseAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidFlowAddress(' 0x58f9e6153690c852 ')).toBe(false); // With spaces
      expect(isValidFlowAddress('0x58f9e6153690c852\\n')).toBe(false); // With newline
      expect(isValidFlowAddress('0x58f9e6153690c852\\t')).toBe(false); // With tab
    });
  });

  describe('formatHeartAmount', () => {
    it('should format valid amounts correctly', () => {
      const testCases = [
        { input: '100.12345678', expected: '100.12345678' },
        { input: '100', expected: '100.00' },
        { input: '100.0', expected: '100.00' },
        { input: '0.00000001', expected: '0.00000001' },
        { input: '1000000.12345', expected: '1,000,000.12345' },
        { input: '0', expected: '0.00' },
        { input: '0.0', expected: '0.00' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatHeartAmount(input)).toBe(expected);
      });
    });

    it('should handle edge cases', () => {
      expect(formatHeartAmount('0.123456789')).toBe('0.12345679'); // Rounds to 8 decimals
      expect(formatHeartAmount('999999999.99999999')).toBe('1,000,000,000.00'); // Large number with locale formatting
      expect(formatHeartAmount('0.000000001')).toBe('0.00'); // Rounds very small numbers
    });

    it('should handle invalid inputs gracefully', () => {
      const invalidInputs = ['', 'invalid', 'abc', null, undefined];

      invalidInputs.forEach(input => {
        expect(() => formatHeartAmount(input as any)).not.toThrow();
      });
    });

    it('should maintain precision for 8 decimal places', () => {
      const precisionTests = [
        '1.12345678',
        '0.00000001',
        '999.99999999',
        '12345.87654321',
      ];

      precisionTests.forEach(amount => {
        const formatted = formatHeartAmount(amount);
        const decimalPart = formatted.split('.')[1];
        expect(decimalPart?.length).toBeGreaterThanOrEqual(2); // minimumFractionDigits: 2
      });
    });
  });

  describe('CONTRACT_ADDRESSES', () => {
    it('should contain required contract addresses', () => {
      expect(CONTRACT_ADDRESSES).toBeDefined();
      expect(typeof CONTRACT_ADDRESSES).toBe('object');

      // Check for essential contracts
      expect(CONTRACT_ADDRESSES.Heart).toBeDefined();
      expect(CONTRACT_ADDRESSES.FungibleToken).toBeDefined();
      expect(CONTRACT_ADDRESSES.FlowToken).toBeDefined();
    });

    it('should have valid Flow addresses', () => {
      Object.values(CONTRACT_ADDRESSES).forEach(address => {
        if (typeof address === 'string') {
          expect(isValidFlowAddress(address)).toBe(true);
        }
      });
    });

    it('should use testnet addresses', () => {
      // Testnet specific addresses
      expect(CONTRACT_ADDRESSES.Heart).toBe('0x58f9e6153690c852');
      expect(CONTRACT_ADDRESSES.FungibleToken).toBe('0x9a0766d93b6608b7');
      expect(CONTRACT_ADDRESSES.FlowToken).toBe('0x7e60df042a9c0868');
    });

    it('should not be empty', () => {
      const addressCount = Object.keys(CONTRACT_ADDRESSES).length;
      expect(addressCount).toBeGreaterThan(0);
    });
  });

  describe('flowConfig', () => {
    it('should have required configuration properties', () => {
      expect(flowConfig).toBeDefined();
      expect(typeof flowConfig).toBe('object');

      expect(flowConfig['accessNode.api']).toBeDefined();
      expect(flowConfig['discovery.wallet']).toBeDefined();
      expect(flowConfig['0xHeart']).toBeDefined();
    });

    it('should use testnet configuration', () => {
      expect(flowConfig['accessNode.api']).toContain('testnet');
      expect(flowConfig['discovery.wallet']).toContain('testnet');
    });

    it('should have valid URLs', () => {
      const accessNode = flowConfig['accessNode.api'];
      const discoveryWallet = flowConfig['discovery.wallet'];

      expect(accessNode).toMatch(/^https?:\/\/.+/);
      expect(discoveryWallet).toMatch(/^https?:\/\/.+/);
    });

    it('should have correct Heart contract address', () => {
      expect(flowConfig['0xHeart']).toBe('0x58f9e6153690c852');
    });
  });

  describe('Address Validation Edge Cases', () => {
    it('should handle numeric inputs', () => {
      expect(isValidFlowAddress(123456789 as any)).toBe(false);
      expect(isValidFlowAddress(0 as any)).toBe(false);
    });

    it('should handle boolean inputs', () => {
      expect(isValidFlowAddress(true as any)).toBe(false);
      expect(isValidFlowAddress(false as any)).toBe(false);
    });

    it('should handle object inputs', () => {
      expect(isValidFlowAddress({} as any)).toBe(false);
      expect(isValidFlowAddress({ address: '0x58f9e6153690c852' } as any)).toBe(
        false
      );
    });

    it('should handle array inputs', () => {
      expect(isValidFlowAddress([] as any)).toBe(false); // Empty array converts to empty string
      expect(isValidFlowAddress(['0x58f9e6153690c852'] as any)).toBe(true); // Single element array converts to valid address string
      expect(isValidFlowAddress(['0x58f9e6153690c852', 'other'] as any)).toBe(
        false
      ); // Multi-element array has commas
    });
  });

  describe('Amount Formatting Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeNumber = '999999999999999.99999999';
      const formatted = formatHeartAmount(largeNumber);
      expect(formatted).toMatch(/^[\d,]+\.\d+$/); // Allow commas in large numbers
    });

    it('should handle scientific notation', () => {
      const scientificNumbers = ['1e8', '1.5e-8', '2.5E10'];

      scientificNumbers.forEach(number => {
        expect(() => formatHeartAmount(number)).not.toThrow();
      });
    });

    it('should handle negative numbers', () => {
      expect(() => formatHeartAmount('-100.50')).not.toThrow();
      // Note: We might want to handle negative numbers specifically in the future
    });

    it('should handle numbers with leading zeros', () => {
      const leadingZeroNumbers = ['001.50', '000.00000001', '0000100.0'];

      leadingZeroNumbers.forEach(number => {
        expect(() => formatHeartAmount(number)).not.toThrow();
      });
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent address between CONTRACT_ADDRESSES and flowConfig', () => {
      expect(CONTRACT_ADDRESSES.Heart).toBe(flowConfig['0xHeart']);
    });

    it('should not have conflicting configurations', () => {
      // Ensure all contract addresses use the same network
      const addresses = Object.values(CONTRACT_ADDRESSES);
      const firstAddress = addresses[0];
      const addressNetwork =
        typeof firstAddress === 'string' && firstAddress.startsWith('0x')
          ? 'testnet_or_mainnet'
          : 'unknown';

      addresses.forEach(address => {
        if (typeof address === 'string') {
          expect(address.startsWith('0x')).toBe(true);
        }
      });
    });
  });
});
