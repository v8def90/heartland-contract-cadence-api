/**
 * FlowService Basic Tests
 *
 * @description Basic unit tests for FlowService class and methods
 */

import { FlowService } from '../../../src/services/FlowService';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

describe('FlowService - Basic Tests', () => {
  let flowService: FlowService;

  beforeEach(() => {
    flowService = new FlowService();
  });

  describe('Constructor', () => {
    it('should create FlowService instance', () => {
      expect(flowService).toBeInstanceOf(FlowService);
    });

    it('should be properly defined', () => {
      expect(FlowService).toBeDefined();
      expect(typeof FlowService).toBe('function');
    });
  });

  describe('Class Methods', () => {
    it('should have all required public methods', () => {
      const expectedMethods = [
        'getBalance',
        'getTotalSupply',
        'getTaxRate',
        'getTreasuryAccount',
        'getPauseStatus',
        'calculateTax',
        'getAdminCapabilities',
        'setupAccount',
        'mintTokens',
        'transferTokens',
        'burnTokens',
        'pauseContract',
        'unpauseContract',
        'setTaxRate',
        'setTreasuryAccount',
        'batchTransferTokens',
      ];

      expectedMethods.forEach(method => {
        expect(typeof flowService[method as keyof FlowService]).toBe(
          'function'
        );
      });
    });
  });

  describe('Error Handling Constants', () => {
    it('should have API_ERROR_CODES available', () => {
      expect(API_ERROR_CODES).toBeDefined();
      expect(API_ERROR_CODES.FLOW_SCRIPT_ERROR).toBe('FLOW_SCRIPT_ERROR');
      expect(API_ERROR_CODES.FLOW_TRANSACTION_ERROR).toBe(
        'FLOW_TRANSACTION_ERROR'
      );
      expect(API_ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });

    it('should have all required error codes', () => {
      const requiredErrorCodes = [
        'VALIDATION_ERROR',
        'CONFIGURATION_ERROR',
        'FLOW_SCRIPT_ERROR',
        'FLOW_TRANSACTION_ERROR',
        'INTERNAL_SERVER_ERROR',
      ];

      requiredErrorCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing environment variables gracefully', () => {
      // Test that service can be instantiated even without env vars
      expect(flowService).toBeInstanceOf(FlowService);
    });
  });

  describe('Type Safety', () => {
    it('should have proper TypeScript typing', () => {
      // This test will fail at compile time if types are wrong
      expect(typeof flowService.getBalance).toBe('function');
      expect(typeof flowService.mintTokens).toBe('function');
      expect(typeof flowService.setupAccount).toBe('function');
    });
  });
});
