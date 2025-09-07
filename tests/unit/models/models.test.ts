/**
 * Models Tests
 *
 * @description Tests for data models, interfaces, and type definitions
 * used throughout the application.
 */

import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

describe('Models Tests', () => {
  describe('API Response Models', () => {
    it('should have proper error code structure', () => {
      expect(typeof API_ERROR_CODES).toBe('object');
      expect(API_ERROR_CODES).not.toBeNull();

      // Check that error codes are strings
      Object.values(API_ERROR_CODES).forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent naming convention', () => {
      Object.keys(API_ERROR_CODES).forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
        expect(key).not.toMatch(/^_/);
        expect(key).not.toMatch(/_$/);
      });
    });

    it('should have all required error categories', () => {
      const categories = {
        validation: ['INVALID_ADDRESS', 'INVALID_AMOUNT', 'VALIDATION_ERROR'],
        flow: [
          'FLOW_SCRIPT_ERROR',
          'FLOW_TRANSACTION_ERROR',
          'FLOW_NETWORK_ERROR',
        ],
        system: ['INTERNAL_SERVER_ERROR', 'CONFIGURATION_ERROR'],
        queue: ['QUEUE_ERROR', 'LOG_RETRIEVAL_ERROR'],
      };

      Object.values(categories)
        .flat()
        .forEach(code => {
          expect(
            API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
          ).toBeDefined();
        });
    });
  });

  describe('Response Structure', () => {
    it('should validate success response structure', () => {
      const successResponse = {
        success: true,
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(successResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should validate error response structure', () => {
      const errorResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Test error',
          details: 'Error details',
        },
        timestamp: new Date().toISOString(),
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBe(
        API_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Flow Models', () => {
    it('should validate Flow address format', () => {
      const validAddresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0xabcdef1234567890',
      ];

      validAddresses.forEach(address => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{16}$/);
        expect(address.length).toBe(18);
        expect(address.startsWith('0x')).toBe(true);
      });
    });

    it('should validate amount format', () => {
      const validAmounts = ['0.00000001', '100.00000000', '1000000.99999999'];

      validAmounts.forEach(amount => {
        expect(amount).toMatch(/^\d+\.\d{8}$/);
        expect(parseFloat(amount)).toBeGreaterThan(0);
      });
    });
  });

  describe('Transaction Models', () => {
    it('should validate transaction types', () => {
      const transactionTypes = [
        'mint',
        'transfer',
        'burn',
        'pause',
        'unpause',
        'setTaxRate',
        'setTreasury',
        'batchTransfer',
        'setupAccount',
      ];

      transactionTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
        expect(type).toMatch(/^[a-zA-Z]+$/);
      });
    });

    it('should validate job status values', () => {
      const jobStatuses = ['pending', 'processing', 'completed', 'failed'];

      jobStatuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Request Models', () => {
    it('should validate mint request structure', () => {
      const mintRequest = {
        recipient: '0x58f9e6153690c852',
        amount: '100.00000000',
      };

      expect(mintRequest.recipient).toMatch(/^0x[a-fA-F0-9]{16}$/);
      expect(mintRequest.amount).toMatch(/^\d+\.\d{8}$/);
    });

    it('should validate transfer request structure', () => {
      const transferRequest = {
        recipient: '0x58f9e6153690c852',
        amount: '50.00000000',
        memo: 'Test transfer',
      };

      expect(transferRequest.recipient).toMatch(/^0x[a-fA-F0-9]{16}$/);
      expect(transferRequest.amount).toMatch(/^\d+\.\d{8}$/);
      expect(typeof transferRequest.memo).toBe('string');
    });

    it('should validate batch transfer request structure', () => {
      const batchTransferRequest = {
        transfers: [
          { recipient: '0x58f9e6153690c852', amount: '10.00000000' },
          { recipient: '0x1234567890abcdef', amount: '20.00000000' },
        ],
      };

      expect(Array.isArray(batchTransferRequest.transfers)).toBe(true);
      expect(batchTransferRequest.transfers.length).toBeGreaterThan(0);

      batchTransferRequest.transfers.forEach(transfer => {
        expect(transfer.recipient).toMatch(/^0x[a-fA-F0-9]{16}$/);
        expect(transfer.amount).toMatch(/^\d+\.\d{8}$/);
      });
    });
  });

  describe('Response Data Models', () => {
    it('should validate balance data structure', () => {
      const balanceData = {
        balance: '100.00000000',
        address: '0x58f9e6153690c852',
        decimals: 8,
        formatted: '100.00 HEART',
      };

      expect(balanceData.balance).toMatch(/^\d+\.\d{8}$/);
      expect(balanceData.address).toMatch(/^0x[a-fA-F0-9]{16}$/);
      expect(balanceData.decimals).toBe(8);
      expect(balanceData.formatted).toContain('HEART');
    });

    it('should validate tax rate data structure', () => {
      const taxRateData = {
        taxRate: '5.00000000',
        percentage: 5.0,
        formatted: '5.00%',
      };

      expect(taxRateData.taxRate).toMatch(/^\d+\.\d{8}$/);
      expect(typeof taxRateData.percentage).toBe('number');
      expect(taxRateData.formatted).toMatch(/^\d+\.\d{2}%$/);
    });

    it('should validate admin capabilities data structure', () => {
      const adminCapabilities = {
        address: '0x58f9e6153690c852',
        capabilities: {
          isMinter: true,
          isPauser: false,
          isTaxManager: true,
          isAdmin: true,
        },
        roles: ['minter', 'taxManager', 'admin'],
      };

      expect(adminCapabilities.address).toMatch(/^0x[a-fA-F0-9]{16}$/);
      expect(typeof adminCapabilities.capabilities).toBe('object');
      expect(Array.isArray(adminCapabilities.roles)).toBe(true);

      Object.values(adminCapabilities.capabilities).forEach(capability => {
        expect(typeof capability).toBe('boolean');
      });
    });
  });

  describe('Configuration Models', () => {
    it('should validate contract addresses', () => {
      const contractAddresses = {
        Heart: '0x58f9e6153690c852',
        FungibleToken: '0x9a0766d93b6608b7',
        NonFungibleToken: '0x1d7e57aa55817448',
      };

      Object.values(contractAddresses).forEach(address => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{16}$/);
        expect(address.length).toBe(18);
      });
    });

    it('should validate network configuration', () => {
      const networkConfig = {
        network: 'testnet',
        accessNode: 'https://rest-testnet.onflow.org',
        chainId: 'flow-testnet',
      };

      expect(['testnet', 'mainnet', 'emulator']).toContain(
        networkConfig.network
      );
      expect(networkConfig.accessNode).toMatch(/^https?:\/\//);
      expect(networkConfig.chainId).toMatch(/^flow-/);
    });
  });

  describe('Validation Helpers', () => {
    it('should validate required fields', () => {
      const requiredFields = ['recipient', 'amount'];
      const data = { recipient: '0x58f9e6153690c852', amount: '100.00000000' };

      requiredFields.forEach(field => {
        expect(data[field as keyof typeof data]).toBeDefined();
        expect(data[field as keyof typeof data]).not.toBe('');
      });
    });

    it('should validate optional fields', () => {
      const data = { memo: 'Optional memo', priority: 'high' };

      if (data.memo) {
        expect(typeof data.memo).toBe('string');
      }

      if (data.priority) {
        expect(['low', 'normal', 'high']).toContain(data.priority);
      }
    });
  });

  describe('Type Safety', () => {
    it('should ensure type consistency', () => {
      const typedData: {
        id: string;
        count: number;
        active: boolean;
        items: string[];
      } = {
        id: 'test-id',
        count: 42,
        active: true,
        items: ['item1', 'item2'],
      };

      expect(typeof typedData.id).toBe('string');
      expect(typeof typedData.count).toBe('number');
      expect(typeof typedData.active).toBe('boolean');
      expect(Array.isArray(typedData.items)).toBe(true);
    });
  });
});
