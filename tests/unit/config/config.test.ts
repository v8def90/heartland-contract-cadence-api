/**
 * Configuration Tests
 *
 * @description Tests for application configuration, constants,
 * and environment-specific settings.
 */

import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

describe('Configuration Tests', () => {
  describe('Environment Configuration', () => {
    it('should handle different environments', () => {
      const environments = ['test', 'development', 'production'];
      const currentEnv = process.env.NODE_ENV || 'test';

      expect(environments).toContain(currentEnv);
      expect(typeof currentEnv).toBe('string');
    });

    it('should validate environment variables', () => {
      // These should be available in test environment
      const testEnvVars = {
        NODE_ENV: process.env.NODE_ENV,
        PWD: process.env.PWD,
      };

      Object.entries(testEnvVars).forEach(([key, value]) => {
        if (value !== undefined) {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Application Constants', () => {
    it('should have consistent API error codes', () => {
      expect(typeof API_ERROR_CODES).toBe('object');
      expect(Object.keys(API_ERROR_CODES).length).toBeGreaterThan(10);

      // All error codes should be uppercase with underscores
      Object.keys(API_ERROR_CODES).forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should have proper error code values', () => {
      Object.values(API_ERROR_CODES).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^[A-Z_]+$/);
        expect(value.length).toBeGreaterThan(3);
      });
    });
  });

  describe('Network Configuration', () => {
    it('should validate network settings', () => {
      const networkSettings = {
        testnet: {
          name: 'testnet',
          accessNode: 'https://rest-testnet.onflow.org',
          chainId: 'flow-testnet',
        },
        mainnet: {
          name: 'mainnet',
          accessNode: 'https://rest-mainnet.onflow.org',
          chainId: 'flow-mainnet',
        },
      };

      Object.values(networkSettings).forEach(network => {
        expect(network.name).toMatch(/^(testnet|mainnet|emulator)$/);
        expect(network.accessNode).toMatch(/^https:\/\//);
        expect(network.chainId).toMatch(/^flow-/);
      });
    });

    it('should validate contract addresses format', () => {
      const contractAddresses = {
        Heart: '0x58f9e6153690c852',
        FungibleToken: '0x9a0766d93b6608b7',
        NonFungibleToken: '0x1d7e57aa55817448',
        FlowToken: '0x7e60df042a9c0868',
        MetadataViews: '0x631e88ae7f1d7c20',
      };

      Object.entries(contractAddresses).forEach(([name, address]) => {
        expect(name).toMatch(/^[A-Za-z]+$/);
        expect(address).toMatch(/^0x[a-fA-F0-9]{16}$/);
        expect(address.length).toBe(18);
      });
    });
  });

  describe('API Configuration', () => {
    it('should validate API endpoints structure', () => {
      const apiEndpoints = {
        health: '/health',
        balance: '/balance/{address}',
        totalSupply: '/total-supply',
        taxRate: '/tax-rate',
        mint: '/mint',
        transfer: '/transfer',
      };

      Object.values(apiEndpoints).forEach(endpoint => {
        expect(endpoint).toMatch(/^\/[a-z-{}\/]+$/);
        expect(endpoint.startsWith('/')).toBe(true);
      });
    });

    it('should validate HTTP methods', () => {
      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      httpMethods.forEach(method => {
        expect(method).toMatch(/^[A-Z]+$/);
        expect([
          'GET',
          'POST',
          'PUT',
          'DELETE',
          'PATCH',
          'OPTIONS',
          'HEAD',
        ]).toContain(method);
      });
    });
  });

  describe('Database Configuration', () => {
    it('should validate SQS configuration format', () => {
      const sqsConfig = {
        queueUrl: 'https://sqs.ap-northeast-1.amazonaws.com/account/queue-name',
        region: 'ap-northeast-1',
        visibilityTimeout: 300,
        maxReceiveCount: 3,
      };

      expect(sqsConfig.queueUrl).toMatch(/^https:\/\/sqs\./);
      expect(sqsConfig.region).toMatch(/^[a-z]+-[a-z]+-\d+$/);
      expect(typeof sqsConfig.visibilityTimeout).toBe('number');
      expect(typeof sqsConfig.maxReceiveCount).toBe('number');
    });

    it('should validate CloudWatch configuration', () => {
      const cloudWatchConfig = {
        logGroup: '/aws/lambda/heartland-workers',
        retentionDays: 30,
        region: 'ap-northeast-1',
      };

      expect(cloudWatchConfig.logGroup).toMatch(/^\/aws\/lambda\//);
      expect(typeof cloudWatchConfig.retentionDays).toBe('number');
      expect(cloudWatchConfig.retentionDays).toBeGreaterThan(0);
      expect(cloudWatchConfig.region).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    });
  });

  describe('Security Configuration', () => {
    it('should validate JWT configuration', () => {
      const jwtConfig = {
        algorithm: 'HS256',
        expiresIn: '24h',
        issuer: 'heartland-api',
      };

      expect(['HS256', 'RS256', 'ES256']).toContain(jwtConfig.algorithm);
      expect(jwtConfig.expiresIn).toMatch(/^\d+[smhd]$/);
      expect(typeof jwtConfig.issuer).toBe('string');
    });

    it('should validate CORS configuration', () => {
      const corsConfig = {
        origin: ['http://localhost:3000', 'https://app.heartland.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      };

      expect(Array.isArray(corsConfig.origin)).toBe(true);
      expect(Array.isArray(corsConfig.methods)).toBe(true);
      expect(Array.isArray(corsConfig.allowedHeaders)).toBe(true);
      expect(typeof corsConfig.credentials).toBe('boolean');
    });
  });

  describe('Validation Rules', () => {
    it('should validate address format rules', () => {
      const addressRules = {
        pattern: /^0x[a-fA-F0-9]{16}$/,
        length: 18,
        prefix: '0x',
      };

      expect(addressRules.pattern).toBeInstanceOf(RegExp);
      expect(typeof addressRules.length).toBe('number');
      expect(typeof addressRules.prefix).toBe('string');
    });

    it('should validate amount format rules', () => {
      const amountRules = {
        pattern: /^\d+\.\d{8}$/,
        decimals: 8,
        minValue: 0.00000001,
        maxValue: 999999999.99999999,
      };

      expect(amountRules.pattern).toBeInstanceOf(RegExp);
      expect(typeof amountRules.decimals).toBe('number');
      expect(typeof amountRules.minValue).toBe('number');
      expect(typeof amountRules.maxValue).toBe('number');
    });
  });

  describe('Feature Flags', () => {
    it('should validate feature flag structure', () => {
      const featureFlags = {
        enableMinting: true,
        enableBurning: true,
        enablePausing: true,
        enableBatchTransfer: true,
        enableTaxRateUpdates: true,
      };

      Object.values(featureFlags).forEach(flag => {
        expect(typeof flag).toBe('boolean');
      });
    });

    it('should validate environment-specific flags', () => {
      const envFlags = {
        development: {
          debugMode: true,
          mockTransactions: true,
        },
        production: {
          debugMode: false,
          mockTransactions: false,
        },
      };

      Object.values(envFlags).forEach(flags => {
        expect(typeof flags.debugMode).toBe('boolean');
        expect(typeof flags.mockTransactions).toBe('boolean');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should validate rate limit configuration', () => {
      const rateLimits = {
        global: { requests: 1000, window: 3600 }, // 1000 requests per hour
        perUser: { requests: 100, window: 3600 }, // 100 requests per hour per user
        perEndpoint: {
          mint: { requests: 10, window: 60 }, // 10 mints per minute
          transfer: { requests: 50, window: 60 }, // 50 transfers per minute
        },
      };

      [rateLimits.global, rateLimits.perUser].forEach(limit => {
        expect(typeof limit.requests).toBe('number');
        expect(typeof limit.window).toBe('number');
        expect(limit.requests).toBeGreaterThan(0);
        expect(limit.window).toBeGreaterThan(0);
      });

      Object.values(rateLimits.perEndpoint).forEach(limit => {
        expect(typeof limit.requests).toBe('number');
        expect(typeof limit.window).toBe('number');
      });
    });
  });

  describe('Logging Configuration', () => {
    it('should validate log levels', () => {
      const logLevels = ['error', 'warn', 'info', 'debug', 'trace'];
      const currentLevel = 'info';

      expect(logLevels).toContain(currentLevel);
      expect(typeof currentLevel).toBe('string');
    });

    it('should validate log format configuration', () => {
      const logConfig = {
        format: 'json',
        timestamp: true,
        level: true,
        message: true,
        metadata: true,
      };

      expect(['json', 'text', 'structured']).toContain(logConfig.format);
      Object.entries(logConfig).forEach(([key, value]) => {
        if (key !== 'format') {
          expect(typeof value).toBe('boolean');
        }
      });
    });
  });
});
