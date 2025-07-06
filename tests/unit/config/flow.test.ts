/**
 * Flow Configuration Unit Tests
 *
 * @description Tests for Flow blockchain configuration, constants, and utility functions.
 */

// Mock @onflow/fcl before importing the module
jest.mock('@onflow/fcl', () => ({
  config: jest.fn(),
  query: jest.fn(),
  mutate: jest.fn(),
  tx: jest.fn(),
}));

import {
  FLOW_ENV,
  flowConfig,
  CONTRACT_ADDRESSES,
  FLOW_CONSTANTS,
  CADENCE_PATHS,
  FCL_CONFIG,
  isValidFlowAddress,
  isValidTransactionId,
  formatHeartAmount,
  calculateTaxAmount,
} from '../../../src/config/flow';

describe('Flow Configuration', () => {
  describe('FLOW_ENV', () => {
    it('should have valid default values', () => {
      expect(FLOW_ENV.ACCESS_NODE).toBe('https://rest-testnet.onflow.org');
      expect(FLOW_ENV.HEART_CONTRACT_ADDRESS).toBe('0x58f9e6153690c852');
      expect(FLOW_ENV.DISCOVERY_WALLET).toBe(
        'https://fcl-discovery.onflow.org/testnet/authn'
      );
      expect(FLOW_ENV.NETWORK).toBe('testnet');
      expect(FLOW_ENV.DEFAULT_GAS_LIMIT).toBe(1000);
      expect(FLOW_ENV.REQUEST_TIMEOUT).toBe(30000);
    });

    it('should use environment variables when provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        FLOW_ACCESS_NODE: 'https://custom-node.onflow.org',
        HEART_CONTRACT_ADDRESS: '0x1234567890abcdef',
        FLOW_NETWORK: 'mainnet',
        FLOW_GAS_LIMIT: '2000',
        FLOW_REQUEST_TIMEOUT: '60000',
      };

      // 環境変数の変更を反映するため、モジュールを再読み込み
      jest.resetModules();
      const { FLOW_ENV: updatedEnv } = require('../../../src/config/flow');

      expect(updatedEnv.ACCESS_NODE).toBe('https://custom-node.onflow.org');
      expect(updatedEnv.HEART_CONTRACT_ADDRESS).toBe('0x1234567890abcdef');
      expect(updatedEnv.NETWORK).toBe('mainnet');
      expect(updatedEnv.DEFAULT_GAS_LIMIT).toBe(2000);
      expect(updatedEnv.REQUEST_TIMEOUT).toBe(60000);

      // 元の環境変数を復元
      process.env = originalEnv;
    });
  });

  describe('flowConfig', () => {
    it('should have correct FCL configuration format', () => {
      expect(flowConfig['accessNode.api']).toBeDefined();
      expect(flowConfig['discovery.wallet']).toBeDefined();
      expect(flowConfig['0xHeart']).toBeDefined();
      expect(flowConfig['fcl.limit']).toBeDefined();
    });

    it('should use values from FLOW_ENV', () => {
      expect(flowConfig['accessNode.api']).toBe(FLOW_ENV.ACCESS_NODE);
      expect(flowConfig['discovery.wallet']).toBe(FLOW_ENV.DISCOVERY_WALLET);
      expect(flowConfig['0xHeart']).toBe(FLOW_ENV.HEART_CONTRACT_ADDRESS);
      expect(flowConfig['fcl.limit']).toBe(
        FLOW_ENV.DEFAULT_GAS_LIMIT.toString()
      );
    });
  });

  describe('CONTRACT_ADDRESSES', () => {
    it('should contain required contract addresses', () => {
      expect(CONTRACT_ADDRESSES.Heart).toBe('0x58f9e6153690c852');
      expect(CONTRACT_ADDRESSES.FungibleToken).toBe('0x9a0766d93b6608b7');
      expect(CONTRACT_ADDRESSES.NonFungibleToken).toBe('0x631e88ae7f1d7c20');
      expect(CONTRACT_ADDRESSES.FlowToken).toBe('0x7e60df042a9c0868');
      expect(CONTRACT_ADDRESSES.MetadataViews).toBe('0x631e88ae7f1d7c20');
    });

    it('should have valid Flow address format', () => {
      Object.values(CONTRACT_ADDRESSES).forEach(address => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{16}$/);
      });
    });
  });

  describe('FLOW_CONSTANTS', () => {
    it('should have correct Heart token constants', () => {
      expect(FLOW_CONSTANTS.HEART_DECIMALS).toBe(8);
      expect(FLOW_CONSTANTS.HEART_SYMBOL).toBe('HEART');
      expect(FLOW_CONSTANTS.FLOW_DECIMALS).toBe(8);
      expect(FLOW_CONSTANTS.FLOW_SYMBOL).toBe('FLOW');
    });

    it('should have valid transfer limits', () => {
      expect(FLOW_CONSTANTS.MIN_TRANSFER_AMOUNT).toBe('0.00000001');
      expect(FLOW_CONSTANTS.MAX_TRANSFER_AMOUNT).toBe('1000000.00000000');
    });

    it('should have valid tax rate constants', () => {
      expect(FLOW_CONSTANTS.DEFAULT_TAX_RATE).toBe(5.0);
      expect(FLOW_CONSTANTS.MAX_TAX_RATE).toBe(20.0);
      expect(FLOW_CONSTANTS.DEFAULT_TAX_RATE).toBeLessThanOrEqual(
        FLOW_CONSTANTS.MAX_TAX_RATE
      );
    });

    it('should have valid regex patterns', () => {
      expect(FLOW_CONSTANTS.ADDRESS_PATTERN).toBeInstanceOf(RegExp);
      expect(FLOW_CONSTANTS.TX_ID_PATTERN).toBeInstanceOf(RegExp);
    });
  });

  describe('CADENCE_PATHS', () => {
    it('should have all required script paths', () => {
      const expectedScripts = [
        'GET_BALANCE',
        'GET_TOTAL_SUPPLY',
        'GET_TAX_RATE',
        'GET_TREASURY_ACCOUNT',
        'GET_PAUSE_STATUS',
        'CALCULATE_TAX',
        'GET_ADMIN_CAPABILITIES',
      ];

      expectedScripts.forEach(script => {
        expect(CADENCE_PATHS.SCRIPTS).toHaveProperty(script);
        expect(
          CADENCE_PATHS.SCRIPTS[script as keyof typeof CADENCE_PATHS.SCRIPTS]
        ).toMatch(/\.cdc$/);
      });
    });

    it('should have all required transaction paths', () => {
      const expectedTransactions = [
        'SETUP_ACCOUNT',
        'MINT_TOKENS',
        'TRANSFER_TOKENS',
        'BATCH_TRANSFER',
        'BURN_TOKENS',
        'PAUSE_CONTRACT',
        'UNPAUSE_CONTRACT',
        'SET_TAX_RATE',
        'SET_TREASURY',
      ];

      expectedTransactions.forEach(transaction => {
        expect(CADENCE_PATHS.TRANSACTIONS).toHaveProperty(transaction);
        expect(
          CADENCE_PATHS.TRANSACTIONS[
            transaction as keyof typeof CADENCE_PATHS.TRANSACTIONS
          ]
        ).toMatch(/\.cdc$/);
      });
    });
  });

  describe('FCL_CONFIG', () => {
    it('should have proper configuration values', () => {
      expect(FCL_CONFIG['logger.level']).toBeDefined();
      expect(FCL_CONFIG['sdk.transport.timeout']).toBeDefined();
      expect(FCL_CONFIG['sdk.transport.retry.attempts']).toBeDefined();
      expect(FCL_CONFIG['sdk.transport.retry.delay']).toBeDefined();
    });

    it('should set debug logging based on environment', () => {
      const originalEnv = process.env.NODE_ENV;

      // Test development environment
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { FCL_CONFIG: devConfig } = require('../../../src/config/flow');
      expect(devConfig['logger.level']).toBe(2);

      // Test production environment
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { FCL_CONFIG: prodConfig } = require('../../../src/config/flow');
      expect(prodConfig['logger.level']).toBe(0);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Flow Utility Functions', () => {
  describe('isValidFlowAddress', () => {
    it('should validate correct Flow addresses', () => {
      const validAddresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0x0000000000000000',
        '0xFFFFFFFFFFFFFFFF',
      ];

      validAddresses.forEach(address => {
        expect(isValidFlowAddress(address)).toBe(true);
      });
    });

    it('should reject invalid Flow addresses', () => {
      const invalidAddresses = [
        '58f9e6153690c852', // missing 0x
        '0x58f9e6153690c85', // too short
        '0x58f9e6153690c8523', // too long
        '0x58f9e6153690c85g', // invalid character
        '0X58f9e6153690c852', // uppercase X
        '', // empty string
        '0x', // only prefix
        null, // null value
        undefined, // undefined value
      ];

      invalidAddresses.forEach(address => {
        expect(isValidFlowAddress(address as string)).toBe(false);
      });
    });
  });

  describe('isValidTransactionId', () => {
    it('should validate correct transaction IDs', () => {
      const validTxIds = [
        'abc123def456789012345678901234567890123456789012345678901234567a',
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '0000000000000000000000000000000000000000000000000000000000000000',
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      ];

      validTxIds.forEach(txId => {
        expect(isValidTransactionId(txId)).toBe(true);
      });
    });

    it('should reject invalid transaction IDs', () => {
      const invalidTxIds = [
        'abc123def456789012345678901234567890123456789012345678901234567', // too short
        'abc123def4567890123456789012345678901234567890123456789012345678901', // too long
        'abc123def456789012345678901234567890123456789012345678901234567g', // invalid character
        '', // empty string
        null, // null value
        undefined, // undefined value
      ];

      invalidTxIds.forEach(txId => {
        expect(isValidTransactionId(txId as string)).toBe(false);
      });
    });
  });

  describe('formatHeartAmount', () => {
    it('should format amounts correctly without symbol', () => {
      expect(formatHeartAmount('100.00000000')).toBe('100.00');
      expect(formatHeartAmount('1000.12345678')).toBe('1,000.12345678');
      expect(formatHeartAmount('1000000.50000000')).toBe('1,000,000.50');
      expect(formatHeartAmount('0.00000001')).toBe('0.00000001');
    });

    it('should format amounts correctly with symbol', () => {
      expect(formatHeartAmount('100.00000000', true)).toBe('100.00 HEART');
      expect(formatHeartAmount('1000.12345678', true)).toBe(
        '1,000.12345678 HEART'
      );
      expect(formatHeartAmount('1000000.50000000', true)).toBe(
        '1,000,000.50 HEART'
      );
      expect(formatHeartAmount('0.00000001', true)).toBe('0.00000001 HEART');
    });

    it('should handle edge cases', () => {
      expect(formatHeartAmount('0')).toBe('0.00');
      expect(formatHeartAmount('0.00000000')).toBe('0.00');
      expect(formatHeartAmount('1')).toBe('1.00');
    });
  });

  describe('calculateTaxAmount', () => {
    it('should calculate tax correctly', () => {
      expect(calculateTaxAmount('100.00000000', 5.0)).toBe('5.00000000');
      expect(calculateTaxAmount('1000.00000000', 10.0)).toBe('100.00000000');
      expect(calculateTaxAmount('50.00000000', 20.0)).toBe('10.00000000');
      expect(calculateTaxAmount('0.00000001', 5.0)).toBe('0.00000000');
    });

    it('should handle zero tax rate', () => {
      expect(calculateTaxAmount('100.00000000', 0)).toBe('0.00000000');
    });

    it('should handle maximum tax rate', () => {
      expect(calculateTaxAmount('100.00000000', 100.0)).toBe('100.00000000');
    });

    it('should handle decimal amounts', () => {
      expect(calculateTaxAmount('123.45678900', 5.0)).toBe('6.17283945');
      expect(calculateTaxAmount('0.12345678', 10.0)).toBe('0.01234568');
    });
  });
});
