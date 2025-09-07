/**
 * AdminController Unit Tests
 *
 * @description Comprehensive tests for AdminController including
 * admin capabilities checking and error handling scenarios
 */

import { AdminController } from '../../../src/controllers/queries/AdminController';
import { FlowService } from '../../../src/services/FlowService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock FlowService
jest.mock('../../../src/services/FlowService');

describe('AdminController', () => {
  let controller: AdminController;
  let mockFlowService: jest.Mocked<FlowService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController();
    mockFlowService = jest.mocked(controller['flowService']);
  });

  describe('getAdminCapabilities', () => {
    it('should return admin capabilities for super admin address', async () => {
      const mockCapabilitiesData = {
        address: '0x58f9e6153690c852',
        isAdmin: true,
        canMint: true,
        canPause: true,
        canSetTaxRate: true,
        canSetTreasury: true,
        canBurn: true,
        capabilities: ['mint', 'pause', 'setTaxRate', 'setTreasury', 'burn'],
        role: 'SUPER_ADMIN',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      expect(result.success).toBe(true);
      expect((result as any).data?.address).toBe('0x58f9e6153690c852');
      expect((result as any).data?.isAdmin).toBe(true);
      expect((result as any).data?.canMint).toBe(true);
      expect((result as any).data?.canPause).toBe(true);
      expect((result as any).data?.canSetTaxRate).toBe(true);
      expect((result as any).data?.canSetTreasury).toBe(true);
      expect((result as any).data?.canBurn).toBe(true);
      expect((result as any).data?.role).toBe('SUPER_ADMIN');
      expect((result as any).data?.capabilities).toContain('mint');
      expect((result as any).data?.capabilities).toContain('pause');
      expect(mockFlowService.getAdminCapabilities).toHaveBeenCalledWith(
        '0x58f9e6153690c852'
      );
    });

    it('should return limited capabilities for minter-only address', async () => {
      const mockCapabilitiesData = {
        address: '0x1234567890abcdef',
        isAdmin: true,
        canMint: true,
        canPause: false,
        canSetTaxRate: false,
        canSetTreasury: false,
        canBurn: false,
        capabilities: ['mint'],
        role: 'MINTER',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0x1234567890abcdef');

      expect(result.success).toBe(true);
      expect((result as any).data?.isAdmin).toBe(true);
      expect((result as any).data?.canMint).toBe(true);
      expect((result as any).data?.canPause).toBe(false);
      expect((result as any).data?.canSetTaxRate).toBe(false);
      expect((result as any).data?.role).toBe('MINTER');
      expect((result as any).data?.capabilities).toEqual(['mint']);
    });

    it('should return no capabilities for regular user address', async () => {
      const mockCapabilitiesData = {
        address: '0xabcdef1234567890',
        isAdmin: false,
        canMint: false,
        canPause: false,
        canSetTaxRate: false,
        canSetTreasury: false,
        canBurn: false,
        capabilities: [],
        role: 'USER',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0xabcdef1234567890');

      expect(result.success).toBe(true);
      expect((result as any).data?.isAdmin).toBe(false);
      expect((result as any).data?.canMint).toBe(false);
      expect((result as any).data?.canPause).toBe(false);
      expect((result as any).data?.canSetTaxRate).toBe(false);
      expect((result as any).data?.canSetTreasury).toBe(false);
      expect((result as any).data?.canBurn).toBe(false);
      expect((result as any).data?.role).toBe('USER');
      expect((result as any).data?.capabilities).toEqual([]);
    });

    it('should reject invalid Flow addresses', async () => {
      const invalidAddresses = [
        'invalid',
        '0x123', // too short
        '0xZZZZZZZZZZZZZZZZ', // invalid hex
        '', // empty
        '123456789012345678901234567890123456789012345678901234567890123456789', // too long
        'not-an-address',
      ];

      for (const address of invalidAddresses) {
        const result = await controller.getAdminCapabilities(address);
        expect(result.success).toBe(false);
        expect((result as any).error?.code).toBe(
          API_ERROR_CODES.INVALID_ADDRESS
        );
        expect((result as any).error?.message).toBe(
          'Invalid Flow address format'
        );
      }
    });

    it('should handle case-insensitive addresses', async () => {
      const mockCapabilitiesData = {
        address: '0x58f9e6153690c852',
        isAdmin: true,
        canMint: true,
        canPause: true,
        canSetTaxRate: true,
        canSetTreasury: true,
        canBurn: true,
        capabilities: ['mint', 'pause', 'setTaxRate', 'setTreasury', 'burn'],
        role: 'SUPER_ADMIN',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      // Test uppercase address
      const result =
        await controller.getAdminCapabilities('0X58F9E6153690C852');

      expect(result.success).toBe(true);
      expect(mockFlowService.getAdminCapabilities).toHaveBeenCalledWith(
        '0x58f9e6153690c852'
      );
    });

    it('should handle FlowService errors', async () => {
      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: false,
        error: {
          code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
          message: 'Network error',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_NETWORK_ERROR
      );
    });

    it('should handle exceptions', async () => {
      mockFlowService.getAdminCapabilities.mockRejectedValue(
        new Error('Connection timeout')
      );

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(
        API_ERROR_CODES.FLOW_SCRIPT_ERROR
      );
      expect((result as any).error?.message).toBe(
        'Failed to retrieve admin capabilities'
      );
    });

    it('should handle null/undefined addresses', async () => {
      const result1 = await controller.getAdminCapabilities(null as any);
      const result2 = await controller.getAdminCapabilities(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect((result1 as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_ADDRESS
      );
      expect((result2 as any).error?.code).toBe(
        API_ERROR_CODES.INVALID_ADDRESS
      );
    });

    it('should handle special role types', async () => {
      const roleTestCases = [
        {
          role: 'PAUSER',
          capabilities: ['pause'],
          canPause: true,
          canMint: false,
        },
        {
          role: 'TAX_MANAGER',
          capabilities: ['setTaxRate'],
          canSetTaxRate: true,
          canMint: false,
        },
        {
          role: 'TREASURY_MANAGER',
          capabilities: ['setTreasury'],
          canSetTreasury: true,
          canMint: false,
        },
      ];

      for (const testCase of roleTestCases) {
        const mockCapabilitiesData = {
          address: '0x1234567890abcdef',
          isAdmin: true,
          canMint: testCase.canMint,
          canPause: testCase.canPause || false,
          canSetTaxRate: testCase.canSetTaxRate || false,
          canSetTreasury: testCase.canSetTreasury || false,
          canBurn: false,
          capabilities: testCase.capabilities,
          role: testCase.role,
          lastUpdated: '2024-01-01T00:00:00.000Z',
        };

        mockFlowService.getAdminCapabilities.mockResolvedValue({
          success: true,
          data: mockCapabilitiesData,
          timestamp: '2024-01-01T00:00:00.000Z',
        } as any);

        const result =
          await controller.getAdminCapabilities('0x1234567890abcdef');

        expect(result.success).toBe(true);
        expect((result as any).data?.role).toBe(testCase.role);
        expect((result as any).data?.capabilities).toEqual(
          testCase.capabilities
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle FlowService constructor errors', () => {
      expect(() => new AdminController()).not.toThrow();
    });

    it('should maintain consistent error response format', async () => {
      mockFlowService.getAdminCapabilities.mockRejectedValue(
        new Error('Test error')
      );

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBeDefined();
      expect((result as any).error?.message).toBeDefined();
      expect((result as any).error?.details).toBeDefined();
      expect((result as any).timestamp).toBeDefined();
    });

    it('should handle FlowService returning invalid data structure', async () => {
      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: null, // Invalid data
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      // Should still succeed but handle gracefully
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent capability requests', async () => {
      const mockCapabilitiesData = {
        address: '0x58f9e6153690c852',
        isAdmin: true,
        canMint: true,
        canPause: true,
        canSetTaxRate: true,
        canSetTreasury: true,
        canBurn: true,
        capabilities: ['mint', 'pause', 'setTaxRate', 'setTreasury', 'burn'],
        role: 'SUPER_ADMIN',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const promises = Array.from({ length: 10 }, () =>
        controller.getAdminCapabilities('0x58f9e6153690c852')
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect((result as any).data?.isAdmin).toBe(true);
      });

      expect(mockFlowService.getAdminCapabilities).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple different addresses', async () => {
      const addresses = [
        '0x58f9e6153690c852',
        '0x1234567890abcdef',
        '0xabcdef1234567890',
      ];

      const mockResponses = [
        { isAdmin: true, role: 'SUPER_ADMIN' },
        { isAdmin: true, role: 'MINTER' },
        { isAdmin: false, role: 'USER' },
      ];

      addresses.forEach((address, index) => {
        const mockResponse = mockResponses[index];
        if (mockResponse) {
          mockFlowService.getAdminCapabilities.mockResolvedValueOnce({
            success: true,
            data: {
              address,
              ...mockResponse,
              canMint: mockResponse.isAdmin,
              canPause: mockResponse.role === 'SUPER_ADMIN',
              canSetTaxRate: mockResponse.role === 'SUPER_ADMIN',
              canSetTreasury: mockResponse.role === 'SUPER_ADMIN',
              canBurn: mockResponse.role === 'SUPER_ADMIN',
              capabilities: mockResponse.isAdmin ? ['mint'] : [],
              lastUpdated: '2024-01-01T00:00:00.000Z',
            },
            timestamp: '2024-01-01T00:00:00.000Z',
          } as any);
        }
      });

      const promises = addresses.map(address =>
        controller.getAdminCapabilities(address)
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        const mockResponse = mockResponses[index];
        expect(result.success).toBe(true);
        expect((result as any).data?.address).toBe(addresses[index]);
        if (mockResponse) {
          expect((result as any).data?.role).toBe(mockResponse.role);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special Flow addresses', async () => {
      const specialAddresses = [
        '0x0000000000000000', // zero address
        '0xffffffffffffffff', // max address
        '0x1', // minimal address
      ];

      const mockCapabilitiesData = {
        address: '0x0000000000000000',
        isAdmin: false,
        canMint: false,
        canPause: false,
        canSetTaxRate: false,
        canSetTreasury: false,
        canBurn: false,
        capabilities: [],
        role: 'USER',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      for (const address of specialAddresses) {
        const result = await controller.getAdminCapabilities(address);
        expect(result.success).toBe(true);
      }
    });

    it('should handle empty capabilities array', async () => {
      const mockCapabilitiesData = {
        address: '0x58f9e6153690c852',
        isAdmin: false,
        canMint: false,
        canPause: false,
        canSetTaxRate: false,
        canSetTreasury: false,
        canBurn: false,
        capabilities: [],
        role: 'USER',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      mockFlowService.getAdminCapabilities.mockResolvedValue({
        success: true,
        data: mockCapabilitiesData,
        timestamp: '2024-01-01T00:00:00.000Z',
      } as any);

      const result =
        await controller.getAdminCapabilities('0x58f9e6153690c852');

      expect(result.success).toBe(true);
      expect((result as any).data?.capabilities).toEqual([]);
      expect((result as any).data?.isAdmin).toBe(false);
    });
  });
});
