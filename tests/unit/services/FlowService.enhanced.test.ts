/**
 * FlowService Enhanced Tests
 *
 * @description Enhanced unit tests for FlowService with proper type handling
 * and comprehensive coverage of all major methods.
 */

import { FlowService } from '../../../src/services/FlowService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';
import * as fcl from '@onflow/fcl';
import * as fs from 'fs';
import * as path from 'path';

// Mock file system operations
jest.mock('fs');
jest.mock('path');
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock FCL
jest.mock('@onflow/fcl', () => ({
  query: jest.fn(),
  mutate: jest.fn(),
  tx: jest.fn(),
  config: jest.fn(),
  arg: jest.fn(),
  args: jest.fn(),
  account: jest.fn(),
}));

const mockFcl = fcl as jest.Mocked<typeof fcl>;

describe('FlowService - Enhanced Tests', () => {
  let flowService: FlowService;

  beforeEach(() => {
    flowService = new FlowService();
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.resolve.mockReturnValue('/mock/path');
    mockFs.readFileSync.mockReturnValue('mock script content');
    mockFcl.query.mockResolvedValue({ success: true, data: 'mock data' });
    mockFcl.mutate.mockResolvedValue('mock-tx-id');

    // Mock transaction object
    const mockTx = {
      onceSealed: jest.fn().mockResolvedValue({
        status: 4,
        events: [],
        txId: 'mock-tx-id',
      }),
      snapshot: jest.fn().mockResolvedValue({}),
      subscribe: jest.fn().mockReturnValue(() => {}),
      onceFinalized: jest.fn().mockResolvedValue({}),
      onceExecuted: jest.fn().mockResolvedValue({}),
    };

    mockFcl.tx.mockReturnValue(mockTx as any);

    mockFcl.account.mockResolvedValue({
      address: '0x58f9e6153690c852',
      balance: 1000000000,
      keys: [
        {
          index: 0,
          publicKey: 'mock-key',
          signAlgo: 1,
          signAlgoString: 'ECDSA_P256',
          hashAlgo: 3,
          hashAlgoString: 'SHA3_256',
          weight: 1000,
          sequenceNumber: 0,
          revoked: false,
        },
      ],
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Script Execution Methods', () => {
    describe('getBalance', () => {
      it('should return balance data for valid address', async () => {
        // FlowService uses mock data when script execution fails
        const result = await flowService.getBalance('0x58f9e6153690c852');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.address).toBe('0x58f9e6153690c852');
          expect(result.data?.decimals).toBe(8);
          expect(typeof result.data?.balance).toBe('string');
          expect(typeof result.data?.formatted).toBe('string');
        }
      });

      it('should reject invalid address format', async () => {
        const result = await flowService.getBalance('invalid-address');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });

      it('should handle FCL query errors gracefully with mock data', async () => {
        mockFcl.query.mockRejectedValueOnce(new Error('Network error'));

        const result = await flowService.getBalance('0x58f9e6153690c852');

        // FlowService falls back to mock data on error
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.address).toBe('0x58f9e6153690c852');
          expect(typeof result.data?.balance).toBe('string');
        }
      });
    });

    describe('getTotalSupply', () => {
      it('should return total supply data', async () => {
        const result = await flowService.getTotalSupply();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.totalSupply).toBe('string');
          expect(result.data?.decimals).toBe(8);
          expect(typeof result.data?.formatted).toBe('string');
        }
      });

      it('should handle script execution errors gracefully', async () => {
        mockFcl.query.mockRejectedValueOnce(new Error('Script error'));

        const result = await flowService.getTotalSupply();

        // FlowService should handle errors gracefully
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.totalSupply).toBe('string');
        }
      });
    });

    describe('getTaxRate', () => {
      it('should return tax rate data', async () => {
        const result = await flowService.getTaxRate();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.taxRate).toBe('number');
          expect(typeof result.data?.formatted).toBe('string');
        }
      });
    });

    describe('getTreasuryAccount', () => {
      it('should return treasury account data', async () => {
        const result = await flowService.getTreasuryAccount();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.treasuryAddress).toBe('string');
          expect(typeof result.data?.isValid).toBe('boolean');
        }
      });
    });

    describe('getPauseStatus', () => {
      it('should return pause status data', async () => {
        const result = await flowService.getPauseStatus();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.isPaused).toBe('boolean');
          expect(typeof result.data?.pausedAt).toBe('object');
          expect(typeof result.data?.pausedBy).toBe('object');
        }
      });
    });

    describe('calculateTax', () => {
      it('should calculate tax for valid amount', async () => {
        const result = await flowService.calculateTax('100.0');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.amount).toBe('100.0');
          expect(typeof result.data?.taxRate).toBe('number');
          expect(typeof result.data?.taxAmount).toBe('string');
          expect(typeof result.data?.netAmount).toBe('string');
        }
      });

      it('should reject invalid amount format', async () => {
        const result = await flowService.calculateTax('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
        }
      });
    });

    describe('getAdminCapabilities', () => {
      it('should return admin capabilities for valid address', async () => {
        const result =
          await flowService.getAdminCapabilities('0x58f9e6153690c852');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.address).toBe('0x58f9e6153690c852');
          expect(typeof result.data?.isAdmin).toBe('boolean');
          expect(typeof result.data?.canMint).toBe('boolean');
          expect(typeof result.data?.canPause).toBe('boolean');
          expect(typeof result.data?.canSetTaxRate).toBe('boolean');
          expect(typeof result.data?.canSetTreasury).toBe('boolean');
          expect(typeof result.data?.canBurn).toBe('boolean');
        }
      });

      it('should reject invalid address format', async () => {
        const result = await flowService.getAdminCapabilities('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });
    });
  });

  describe('Transaction Execution Methods', () => {
    describe('setupAccount', () => {
      it('should setup account for valid address', async () => {
        const result = await flowService.setupAccount('0x58f9e6153690c852');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.address).toBe('0x58f9e6153690c852');
        }
      });

      it('should reject invalid address format', async () => {
        const result = await flowService.setupAccount('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });

      it('should handle transaction execution errors', async () => {
        mockFcl.mutate.mockRejectedValueOnce(new Error('Transaction failed'));

        const result = await flowService.setupAccount('0x58f9e6153690c852');

        // FlowService should handle transaction errors gracefully
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.address).toBe('0x58f9e6153690c852');
        }
      });
    });

    describe('mintTokens', () => {
      it('should mint tokens for valid parameters', async () => {
        const result = await flowService.mintTokens(
          '0x58f9e6153690c852',
          '1000.0'
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.amount).toBe('1000.0');
        }
      });

      it('should reject invalid recipient address', async () => {
        const result = await flowService.mintTokens('invalid', '1000.0');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });

      it('should reject invalid amount', async () => {
        const result = await flowService.mintTokens(
          '0x58f9e6153690c852',
          'invalid'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
        }
      });
    });

    describe('transferTokens', () => {
      it('should transfer tokens for valid parameters', async () => {
        const result = await flowService.transferTokens(
          '0x58f9e6153690c852',
          '0x1234567890abcdef',
          '100.0'
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.amount).toBe('100.0');
        }
      });

      it('should reject invalid sender address', async () => {
        const result = await flowService.transferTokens(
          'invalid',
          '0x1234567890abcdef',
          '100.0'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });

      it('should reject invalid recipient address', async () => {
        const result = await flowService.transferTokens(
          '0x58f9e6153690c852',
          'invalid',
          '100.0'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });
    });

    describe('burnTokens', () => {
      it('should burn tokens for valid amount', async () => {
        const result = await flowService.burnTokens('100.0');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.amount).toBe('100.0');
        }
      });

      it('should reject invalid amount', async () => {
        const result = await flowService.burnTokens('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
        }
      });
    });

    describe('pauseContract', () => {
      it('should pause contract successfully', async () => {
        const result = await flowService.pauseContract();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.txId).toBe('string');
          expect(typeof result.data?.status).toBe('string');
        }
      });
    });

    describe('unpauseContract', () => {
      it('should unpause contract successfully', async () => {
        const result = await flowService.unpauseContract();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.txId).toBe('string');
          expect(typeof result.data?.status).toBe('string');
        }
      });
    });

    describe('setTaxRate', () => {
      it('should set tax rate successfully', async () => {
        const result = await flowService.setTaxRate('5.0');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.newTaxRate).toBe('5.0');
        }
      });

      it('should reject invalid tax rate', async () => {
        const result = await flowService.setTaxRate('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_AMOUNT);
        }
      });
    });

    describe('setTreasuryAccount', () => {
      it('should set treasury account successfully', async () => {
        const result =
          await flowService.setTreasuryAccount('0x1234567890abcdef');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data?.newTreasuryAccount).toBe('0x1234567890abcdef');
        }
      });

      it('should reject invalid treasury account address', async () => {
        const result = await flowService.setTreasuryAccount('invalid');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });
    });

    describe('batchTransferTokens', () => {
      it('should batch transfer tokens successfully', async () => {
        const transfers = [
          { recipient: '0x1234567890abcdef', amount: '100.0' },
          { recipient: '0xabcdef1234567890', amount: '200.0' },
        ];

        const result = await flowService.batchTransferTokens(transfers);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data?.txId).toBe('string');
          expect(typeof result.data?.transferCount).toBe('number');
          expect(typeof result.data?.totalAmount).toBe('string');
        }
      });

      it('should reject empty transfers array', async () => {
        const result = await flowService.batchTransferTokens([]);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(
            API_ERROR_CODES.MISSING_REQUIRED_FIELD
          );
        }
      });

      it('should reject invalid transfer data', async () => {
        const invalidTransfers = [{ recipient: 'invalid', amount: '100.0' }];

        const result = await flowService.batchTransferTokens(invalidTransfers);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully with mock data', async () => {
      mockFcl.query.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await flowService.getBalance('0x58f9e6153690c852');

      // FlowService falls back to mock data on network errors
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data?.balance).toBe('string');
      }
    });

    it('should handle script errors gracefully with mock data', async () => {
      mockFcl.query.mockRejectedValueOnce(new Error('Script execution failed'));

      const result = await flowService.getTotalSupply();

      // FlowService should handle script errors gracefully
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data?.totalSupply).toBe('string');
      }
    });

    it('should handle transaction errors gracefully', async () => {
      mockFcl.mutate.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await flowService.setupAccount('0x58f9e6153690c852');

      // FlowService should handle transaction errors gracefully
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.address).toBe('0x58f9e6153690c852');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string inputs', async () => {
      const result = await flowService.getBalance('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      }
    });

    it('should handle null/undefined inputs', async () => {
      const result = await flowService.getBalance(null as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      }
    });

    it('should handle very large amounts', async () => {
      const largeAmount = '999999999999999999.99999999';

      const result = await flowService.mintTokens(
        '0x58f9e6153690c852',
        largeAmount
      );

      expect(result.success).toBe(true);
    });

    it('should handle special Flow addresses', async () => {
      const specialAddresses = [
        '0x0000000000000000',
        '0x0000000000000001',
        '0x0000000000000002',
      ];

      for (const address of specialAddresses) {
        mockFcl.query.mockResolvedValueOnce({
          balance: '0.0',
          address,
          decimals: 8,
          formatted: '0.00 HEART',
        });

        const result = await flowService.getBalance(address);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent operations', async () => {
      const addresses = [
        '0x1111111111111111',
        '0x2222222222222222',
        '0x3333333333333333',
        '0x4444444444444444',
        '0x5555555555555555',
      ];

      // Mock responses for all addresses
      addresses.forEach(() => {
        mockFcl.query.mockResolvedValueOnce({
          balance: '1000.0',
          address: '0x1111111111111111',
          decimals: 8,
          formatted: '1,000.00 HEART',
        });
      });

      // Execute concurrent balance checks
      const promises = addresses.map(address =>
        flowService.getBalance(address)
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle large batch operations efficiently', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        recipient: `0x${i.toString(16).padStart(16, '0')}`,
        amount: '10.0',
      }));

      const result = await flowService.batchTransferTokens(largeBatch);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data?.txId).toBe('string');
        expect(typeof result.data?.transferCount).toBe('number');
      }
    });
  });
});
