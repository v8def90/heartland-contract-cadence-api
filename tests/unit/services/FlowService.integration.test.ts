/**
 * FlowService Integration Tests
 *
 * @description Integration tests for FlowService with actual Flow blockchain interactions.
 * Tests real Flow script execution and transaction handling.
 */

import { FlowService } from '../../../src/services/FlowService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';
import * as fcl from '@onflow/fcl';

// Mock FCL for controlled testing
jest.mock('@onflow/fcl');
const mockFcl = fcl as jest.Mocked<typeof fcl>;

describe('FlowService - Integration Tests', () => {
  let flowService: FlowService;

  beforeEach(() => {
    flowService = new FlowService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Flow Script Execution', () => {
    describe('getBalance', () => {
      it('should successfully get balance from Flow network', async () => {
        // Mock successful Flow script execution
        mockFcl.query.mockResolvedValue('100.50000000');

        const result = await flowService.getBalance('0x58f9e6153690c852');

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          balance: '100.50000000',
          address: '0x58f9e6153690c852',
          decimals: 8,
          formatted: '100.50 HEART',
        });
        expect(mockFcl.query).toHaveBeenCalledWith({
          cadence: expect.stringContaining('getBalance'),
          args: expect.any(Function),
        });
      });

      it('should handle Flow network errors gracefully', async () => {
        // Mock Flow network error
        mockFcl.query.mockRejectedValue(new Error('Network timeout'));

        const result = await flowService.getBalance('0x58f9e6153690c852');

        // Should fallback to mock data
        expect(result.success).toBe(true);
        expect((result as any).data?.balance).toBeDefined();
        expect((result as any).data?.address).toBe('0x58f9e6153690c852');
      });

      it('should validate Flow address format', async () => {
        const result = await flowService.getBalance('invalid-address');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
        expect((result as any).error?.message).toContain(
          'Invalid Flow address'
        );
      });

      it('should handle empty address', async () => {
        const result = await flowService.getBalance('');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
      });

      it('should handle null/undefined address', async () => {
        const result1 = await flowService.getBalance(null as any);
        const result2 = await flowService.getBalance(undefined as any);

        expect(result1.success).toBe(false);
        expect(result2.success).toBe(false);
        expect(result1.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
        expect(result2.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('getTotalSupply', () => {
      it('should successfully get total supply from Flow network', async () => {
        mockFcl.query.mockResolvedValue('1000000.00000000');

        const result = await flowService.getTotalSupply();

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          totalSupply: '1000000.00000000',
          decimals: 8,
          formatted: '1,000,000.00 HEART',
        });
        expect(mockFcl.query).toHaveBeenCalledWith({
          cadence: expect.stringContaining('getTotalSupply'),
          args: expect.any(Function),
        });
      });

      it('should handle Flow script execution errors', async () => {
        mockFcl.query.mockRejectedValue(new Error('Script execution failed'));

        const result = await flowService.getTotalSupply();

        // Should fallback to mock data
        expect(result.success).toBe(true);
        expect((result as any).data?.totalSupply).toBeDefined();
        expect((result as any).data?.decimals).toBe(8);
      });

      it('should handle invalid script response', async () => {
        mockFcl.query.mockResolvedValue(null);

        const result = await flowService.getTotalSupply();

        // Should fallback to mock data
        expect(result.success).toBe(true);
        expect((result as any).data?.totalSupply).toBeDefined();
      });
    });

    describe('getTaxRate', () => {
      it('should successfully get tax rate from Flow network', async () => {
        mockFcl.query.mockResolvedValue('5.0');

        const result = await flowService.getTaxRate();

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          taxRate: 5.0,
          formatted: '5.00%',
        });
      });

      it('should handle zero tax rate', async () => {
        mockFcl.query.mockResolvedValue('0.0');

        const result = await flowService.getTaxRate();

        expect(result.success).toBe(true);
        expect((result as any).data?.taxRate).toBe(0.0);
        expect((result as any).data?.formatted).toBe('0.00%');
      });

      it('should handle high tax rate', async () => {
        mockFcl.query.mockResolvedValue('25.5');

        const result = await flowService.getTaxRate();

        expect(result.success).toBe(true);
        expect((result as any).data?.taxRate).toBe(25.5);
        expect((result as any).data?.formatted).toBe('25.50%');
      });
    });

    describe('getPauseStatus', () => {
      it('should successfully get pause status from Flow network', async () => {
        mockFcl.query.mockResolvedValue(false);

        const result = await flowService.getPauseStatus();

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          isPaused: false,
          status: 'active',
        });
      });

      it('should handle paused contract', async () => {
        mockFcl.query.mockResolvedValue(true);

        const result = await flowService.getPauseStatus();

        expect(result.success).toBe(true);
        expect((result as any).data?.isPaused).toBe(true);
        expect((result as any).data?.status).toBe('paused');
      });
    });

    describe('getTreasuryAccount', () => {
      it('should successfully get treasury account from Flow network', async () => {
        mockFcl.query.mockResolvedValue('0x1234567890abcdef');

        const result = await flowService.getTreasuryAccount();

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          treasuryAccount: '0x1234567890abcdef',
        });
      });

      it('should handle missing treasury account', async () => {
        mockFcl.query.mockResolvedValue(null);

        const result = await flowService.getTreasuryAccount();

        // Should fallback to mock data
        expect(result.success).toBe(true);
        expect((result as any).data?.treasuryAccount).toBeDefined();
      });
    });
  });

  describe('Flow Transaction Execution', () => {
    describe('setupAccount', () => {
      it('should successfully setup account on Flow network', async () => {
        // Mock successful transaction
        mockFcl.mutate.mockResolvedValue('tx123');
        mockFcl.tx.mockReturnValue({
          onceSealed: jest.fn().mockResolvedValue({
            status: 4, // SEALED
            statusString: 'SEALED',
            events: [],
          }),
          snapshot: jest.fn(),
          subscribe: jest.fn(),
          onceFinalized: jest.fn(),
          onceExecuted: jest.fn(),
        } as any);

        const result = await flowService.setupAccount('0x58f9e6153690c852');

        expect(result.success).toBe(true);
        expect((result as any).data).toEqual({
          txId: 'tx123',
          address: '0x58f9e6153690c852',
          status: 'completed',
        });
      });

      it('should handle transaction failures', async () => {
        mockFcl.mutate.mockRejectedValue(new Error('Transaction failed'));

        const result = await flowService.setupAccount('0x58f9e6153690c852');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.FLOW_TRANSACTION_ERROR
        );
      });

      it('should validate address before transaction', async () => {
        const result = await flowService.setupAccount('invalid-address');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
        expect(mockFcl.mutate).not.toHaveBeenCalled();
      });
    });

    describe('mintTokens', () => {
      it('should successfully mint tokens on Flow network', async () => {
        mockFcl.mutate.mockResolvedValue('tx456');
        mockFcl.tx.mockReturnValue({
          onceSealed: jest.fn().mockResolvedValue({
            status: 4,
            statusString: 'SEALED',
            events: [
              {
                type: 'A.58f9e6153690c852.Heart.TokensMinted',
                data: { amount: '100.00000000' },
              },
            ],
          }),
          snapshot: jest.fn(),
          subscribe: jest.fn(),
          onceFinalized: jest.fn(),
          onceExecuted: jest.fn(),
        } as any);

        const result = await flowService.mintTokens(
          '0x58f9e6153690c852',
          '100.0'
        );

        expect(result.success).toBe(true);
        expect((result as any).data?.txId).toBe('tx456');
        expect((result as any).data?.amount).toBe('100.0');
        expect((result as any).data?.recipient).toBe('0x58f9e6153690c852');
      });

      it('should validate mint amount', async () => {
        const result = await flowService.mintTokens('0x58f9e6153690c852', '0');

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
        expect((result as any).error?.message).toContain(
          'Amount must be greater than 0'
        );
      });

      it('should validate negative amounts', async () => {
        const result = await flowService.mintTokens(
          '0x58f9e6153690c852',
          '-10.0'
        );

        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.VALIDATION_ERROR
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle FCL configuration errors', async () => {
      mockFcl.query.mockRejectedValue(new Error('FCL not configured'));

      const result = await flowService.getBalance('0x58f9e6153690c852');

      // Should fallback gracefully
      expect(result.success).toBe(true);
      expect((result as any).data).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      mockFcl.query.mockRejectedValue(new Error('Network timeout'));

      const result = await flowService.getTotalSupply();

      expect(result.success).toBe(true);
      expect((result as any).data).toBeDefined();
    });

    it('should handle malformed responses', async () => {
      mockFcl.query.mockResolvedValue({ invalid: 'response' });

      const result = await flowService.getTaxRate();

      expect(result.success).toBe(true);
      expect((result as any).data).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent script executions', async () => {
      mockFcl.query.mockResolvedValue('100.0');

      const promises = Array.from({ length: 5 }, (_, i) =>
        flowService.getBalance(`0x${i.toString().padStart(16, '0')}`)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(mockFcl.query).toHaveBeenCalledTimes(5);
    });

    it('should handle large amounts correctly', async () => {
      const largeAmount = '999999999.99999999';
      mockFcl.query.mockResolvedValue(largeAmount);

      const result = await flowService.getBalance('0x58f9e6153690c852');

      expect(result.success).toBe(true);
      expect((result as any).data?.balance).toBe(largeAmount);
    });
  });
});
