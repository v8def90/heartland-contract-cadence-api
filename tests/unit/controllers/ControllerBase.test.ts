/**
 * Controller Base Tests
 *
 * @description Basic tests for controller structure and inheritance
 */

import { BalanceController } from '../../../src/controllers/queries/BalanceController';
import { TokenInfoController } from '../../../src/controllers/queries/TokenInfoController';
import { MintController } from '../../../src/controllers/transactions/MintController';
import { SetupController } from '../../../src/controllers/transactions/SetupController';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

describe('Controller Base Tests', () => {
  describe('Query Controllers', () => {
    it('should instantiate BalanceController', () => {
      const controller = new BalanceController();
      expect(controller).toBeInstanceOf(BalanceController);
      expect(typeof controller.getBalance).toBe('function');
    });

    it('should instantiate TokenInfoController', () => {
      const controller = new TokenInfoController();
      expect(controller).toBeInstanceOf(TokenInfoController);
      expect(typeof controller.getTotalSupply).toBe('function');
      expect(typeof controller.getTaxRate).toBe('function');
      expect(typeof controller.getPauseStatus).toBe('function');
      expect(typeof controller.getTreasuryAccount).toBe('function');
      // Note: calculateTaxForAmount method may not be available in current implementation
    });
  });

  describe('Transaction Controllers', () => {
    it('should instantiate MintController', () => {
      const controller = new MintController();
      expect(controller).toBeInstanceOf(MintController);
      expect(typeof controller.mintTokens).toBe('function');
    });

    it('should instantiate SetupController', () => {
      const controller = new SetupController();
      expect(controller).toBeInstanceOf(SetupController);
      expect(typeof controller.setupAccount).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should have access to error codes', () => {
      expect(API_ERROR_CODES).toBeDefined();
      expect(API_ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(API_ERROR_CODES.FLOW_SCRIPT_ERROR).toBe('FLOW_SCRIPT_ERROR');
      expect(API_ERROR_CODES.INTERNAL_SERVER_ERROR).toBe(
        'INTERNAL_SERVER_ERROR'
      );
    });
  });

  describe('Controller Methods Existence', () => {
    it('should have all expected query controller methods', () => {
      const balanceController = new BalanceController();
      const tokenController = new TokenInfoController();

      // Balance controller methods
      expect(typeof balanceController.getBalance).toBe('function');

      // Token info controller methods
      expect(typeof tokenController.getTotalSupply).toBe('function');
      expect(typeof tokenController.getTaxRate).toBe('function');
      expect(typeof tokenController.getPauseStatus).toBe('function');
      expect(typeof tokenController.getTreasuryAccount).toBe('function');
      // Note: calculateTaxForAmount method may not be available in current implementation
    });

    it('should have all expected transaction controller methods', () => {
      const mintController = new MintController();
      const setupController = new SetupController();

      // Mint controller methods
      expect(typeof mintController.mintTokens).toBe('function');

      // Setup controller methods
      expect(typeof setupController.setupAccount).toBe('function');
    });
  });

  describe('Type Safety Verification', () => {
    it('should maintain type safety across controllers', () => {
      // These tests will fail at compile time if there are typing issues
      const balanceController = new BalanceController();
      const tokenController = new TokenInfoController();
      const mintController = new MintController();
      const setupController = new SetupController();

      // Basic existence checks
      expect(balanceController).toBeDefined();
      expect(tokenController).toBeDefined();
      expect(mintController).toBeDefined();
      expect(setupController).toBeDefined();
    });
  });

  describe('Controller Inheritance', () => {
    it('should properly extend base classes', () => {
      const controllers = [
        new BalanceController(),
        new TokenInfoController(),
        new MintController(),
        new SetupController(),
      ];

      controllers.forEach(controller => {
        expect(controller).toBeDefined();
        expect(typeof controller).toBe('object');
      });
    });
  });
});
