/**
 * TokenInfoController Unit Tests
 *
 * @description Comprehensive tests for TokenInfoController including
 * HTTP endpoints, error handling, and FlowService integration
 */

import { TokenInfoController } from '../../../src/controllers/queries/TokenInfoController';
import { FlowService } from '../../../src/services/FlowService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock FlowService
jest.mock('../../../src/services/FlowService');

describe('TokenInfoController', () => {
  let controller: TokenInfoController;
  let mockFlowService: jest.Mocked<FlowService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new TokenInfoController();

    // Get mocked FlowService instance
    mockFlowService = jest.mocked(controller['flowService']);
  });

  describe('getTaxRate', () => {
    it('should return tax rate successfully', async () => {
      // Mock FlowService response
      mockFlowService.getTaxRate.mockResolvedValue({
        success: true,
        data: {
          taxRate: 5.0,
          formatted: '5.0%',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTaxRate();

      expect(result.success).toBe(true);
      expect((result as any).data?.taxRate).toBe(5.0);
      expect((result as any).data?.taxRateDecimal).toBe(0.05);
      expect((result as any).data?.formatted).toBe('5.0%');
      expect((result as any).data?.lastUpdated).toBeDefined();
      expect(mockFlowService.getTaxRate).toHaveBeenCalledTimes(1);
    });

    it('should handle FlowService errors', async () => {
      mockFlowService.getTaxRate.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
          message: 'Network error',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTaxRate();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_NETWORK_ERROR
      );
    });

    it('should handle exceptions', async () => {
      mockFlowService.getTaxRate.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.getTaxRate();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve tax rate'
      );
    });
  });

  describe('getPauseStatus', () => {
    it('should return pause status successfully', async () => {
      const mockPauseData = {
        isPaused: false,
        pausedAt: null,
        pausedBy: null,
      };

      mockFlowService.getPauseStatus.mockResolvedValue({
        success: true,
        data: mockPauseData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getPauseStatus();

      expect(result.success).toBe(true);
      expect((result as any).data?.isPaused).toBe(false);
      expect(mockFlowService.getPauseStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle paused contract', async () => {
      const mockPauseData = {
        isPaused: true,
        pausedAt: '2024-01-01T00:00:00.000Z',
        pausedBy: '0x58f9e6153690c852',
      };

      mockFlowService.getPauseStatus.mockResolvedValue({
        success: true,
        data: mockPauseData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getPauseStatus();

      expect(result.success).toBe(true);
      expect((result as any).data?.isPaused).toBe(true);
      expect((result as any).data?.pausedBy).toBe('0x58f9e6153690c852');
    });

    it('should handle FlowService errors', async () => {
      mockFlowService.getPauseStatus.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
          message: 'Script execution failed',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getPauseStatus();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
    });
  });

  describe('calculateTax', () => {
    beforeEach(() => {
      // Mock getTaxRate for tax calculation tests
      mockFlowService.getTaxRate.mockResolvedValue({
        success: true,
        data: {
          taxRate: 5.0,
          formatted: '5.0%',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);
    });

    it('should calculate tax correctly', async () => {
      const result = await controller.calculateTax('100.0');

      expect(result.success).toBe(true);
      expect((result as any).data?.originalAmount).toBe('100.0');
      expect((result as any).data?.taxAmount).toBe('5.00000000');
      expect((result as any).data?.netAmount).toBe('95.00000000');
      expect((result as any).data?.taxRate).toBe(5.0);
      expect((result as any).data?.formattedOriginal).toContain('100');
      expect((result as any).data?.formattedTax).toContain('5');
      expect((result as any).data?.formattedNet).toContain('95');
    });

    it('should handle zero tax rate', async () => {
      mockFlowService.getTaxRate.mockResolvedValue({
        success: true,
        data: {
          taxRate: 0.0,
          formatted: '0.0%',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.calculateTax('100.0');

      expect(result.success).toBe(true);
      expect((result as any).data?.taxAmount).toBe('0.00000000');
      expect((result as any).data?.netAmount).toBe('100.00000000');
    });

    it('should reject invalid amounts', async () => {
      const invalidAmounts = ['invalid', '-10', '0', 'NaN', ''];

      for (const amount of invalidAmounts) {
        const result = await controller.calculateTax(amount);
        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.INVALID_AMOUNT
        );
      }
    });

    it('should handle tax rate retrieval failure', async () => {
      mockFlowService.getTaxRate.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
          message: 'Network error',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.calculateTax('100.0');

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve current tax rate'
      );
    });

    it('should handle large amounts', async () => {
      const result = await controller.calculateTax('1000000.0');

      expect(result.success).toBe(true);
      expect((result as any).data?.originalAmount).toBe('1000000.0');
      expect((result as any).data?.taxAmount).toBe('50000.00000000');
      expect((result as any).data?.netAmount).toBe('950000.00000000');
    });
  });

  describe('getTotalSupply', () => {
    it('should return total supply successfully', async () => {
      mockFlowService.getTotalSupply.mockResolvedValue({
        success: true,
        data: {
          totalSupply: '1000000.0',
          decimals: 8,
          formatted: '1,000,000.00 HEART',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTotalSupply();

      expect(result.success).toBe(true);
      expect((result as any).data?.totalSupply).toBe('1000000.0');
      expect((result as any).data?.decimals).toBe(8);
      expect((result as any).data?.formatted).toBe('1,000,000.00 HEART');
      expect((result as any).data?.maxSupply).toBe('10000000.0');
      expect((result as any).data?.circulatingSupply).toBe('1000000.0');
      expect(mockFlowService.getTotalSupply).toHaveBeenCalledTimes(1);
    });

    it('should handle FlowService errors', async () => {
      mockFlowService.getTotalSupply.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
          message: 'Script failed',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTotalSupply();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
    });

    it('should handle exceptions', async () => {
      mockFlowService.getTotalSupply.mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await controller.getTotalSupply();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve total supply'
      );
    });
  });

  describe('getTreasuryAccount', () => {
    it('should return treasury account information successfully', async () => {
      mockFlowService.getTreasuryAccount.mockResolvedValue({
        success: true,
        data: {
          treasuryAddress: '0x58f9e6153690c852',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTreasuryAccount();

      expect(result.success).toBe(true);
      expect((result as any).data?.treasuryAddress).toBe('0x58f9e6153690c852');
      expect((result as any).data?.treasuryBalance).toBe('50000.0');
      expect((result as any).data?.formattedBalance).toContain('50,000');
      expect((result as any).data?.capabilities).toEqual([
        'receive',
        'withdraw',
        'tax_collection',
      ]);
      expect((result as any).data?.lastUpdated).toBeDefined();
      expect(mockFlowService.getTreasuryAccount).toHaveBeenCalledTimes(1);
    });

    it('should handle FlowService errors', async () => {
      mockFlowService.getTreasuryAccount.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
          message: 'Network error',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result = await controller.getTreasuryAccount();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve treasury account information'
      );
    });

    it('should handle exceptions', async () => {
      mockFlowService.getTreasuryAccount.mockRejectedValue(
        new Error('Connection lost')
      );

      const result = await controller.getTreasuryAccount();

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve treasury account information'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle FlowService constructor errors', () => {
      expect(() => new TokenInfoController()).not.toThrow();
    });

    it('should maintain consistent error response format', async () => {
      mockFlowService.getTaxRate.mockRejectedValue(new Error('Test error'));

      const result = await controller.getTaxRate();

      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBeDefined();
      expect((result as any).error?.message).toBeDefined();
      expect((result as any).error?.details).toBeDefined();
      expect((result as any).timestamp).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate calculateTax input types', async () => {
      // Test edge cases for amount validation
      const edgeCases = [
        '0.0',
        '-0.1',
        'Infinity',
        '-Infinity',
        '1e-10',
        '1e10',
      ];

      for (const amount of edgeCases) {
        const result = await controller.calculateTax(amount);

        if (amount === '0.0' || amount === '-0.1' || amount === '-Infinity') {
          expect(result.success).toBe(false);
          expect((result as any).error?.code).toBe(
            API_ERROR_CODES.INVALID_AMOUNT
          );
        } else if (amount === 'Infinity') {
          expect(result.success).toBe(false);
          expect((result as any).error?.code).toBe(
            API_ERROR_CODES.INVALID_AMOUNT
          );
        }
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent requests', async () => {
      mockFlowService.getTaxRate.mockResolvedValue({
        success: true,
        data: { taxRate: 5.0, formatted: '5.0%' },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const promises = [
        controller.getTaxRate(),
        controller.getTaxRate(),
        controller.getTaxRate(),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.taxRate).toBe(5.0);
      });

      expect(mockFlowService.getTaxRate).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and error responses', async () => {
      // First call succeeds
      mockFlowService.getPauseStatus
        .mockResolvedValueOnce({
          success: true,
          data: { isPaused: false, pausedAt: null, pausedBy: null },
          timestamp: '2024-01-01T00:00:00.000Z',
        } as any)
        // Second call fails
        .mockResolvedValueOnce({
          success: false,
          error: {
            code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
            message: 'Network error',
          },
          timestamp: '2024-01-01T00:00:00.000Z',
        } as any);

      const result1 = await controller.getPauseStatus();
      const result2 = await controller.getPauseStatus();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
    });
  });
});
