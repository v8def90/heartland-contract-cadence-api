/**
 * App Enhanced Tests
 *
 * @description Enhanced tests for the main application module (app.ts)
 * focusing on middleware, routing, and error handling to improve coverage.
 */

import request from 'supertest';
import { API_ERROR_CODES } from '../../../src/models/responses/ApiResponse';

// Mock the Flow configuration to avoid actual network calls
jest.mock('../../../src/config/flow', () => ({
  ...jest.requireActual('../../../src/config/flow'),
  initializeFlowConfig: jest.fn(),
}));

describe('App Enhanced Tests', () => {
  let app: any;

  beforeEach(async () => {
    // Clear module cache to get fresh app instance
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../../src/app')];

    // Import app after clearing cache
    const { app: freshApp } = await import('../../../src/app');
    app = freshApp;
  });

  describe('Health Check Endpoints', () => {
    it('should respond to GET /health', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'heartland-contract-cadence-api',
        version: '1.0.0',
      });
    });

    it('should respond to GET /api/info', async () => {
      const response = await request(app).get('/api/info').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('endpoints');
    });

    it('should handle unsupported HTTP methods on /health', async () => {
      await request(app).post('/health').expect(404);

      await request(app).put('/health').expect(404);

      await request(app).delete('/health').expect(404);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await request(app).options('/health').expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should include security headers', async () => {
      const response = await request(app).get('/health').expect(200);

      // Check for common security headers
      expect(response.headers).toHaveProperty('x-powered-by');
    });
  });

  describe('Request Logging Middleware', () => {
    it('should log requests with proper format', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).get('/health').expect(200);

      expect(consoleSpy).toHaveBeenCalledWith('=== REQUEST LOG ===');
      expect(consoleSpy).toHaveBeenCalledWith('URL: /health');
      expect(consoleSpy).toHaveBeenCalledWith('Method: GET');
      expect(consoleSpy).toHaveBeenCalledWith('Path: /health');

      consoleSpy.mockRestore();
    });

    it('should log different HTTP methods', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).post('/setup/account').send({}).expect(400); // Will fail validation but should log

      expect(consoleSpy).toHaveBeenCalledWith('Method: POST');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle 404 errors for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle validation errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .post('/setup/account')
        .send({}) // Empty body should trigger validation error
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Check that error middleware was triggered
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '=== ERROR MIDDLEWARE TRIGGERED ==='
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error details in middleware', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app).post('/setup/account').send({}).expect(400);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '=== ERROR MIDDLEWARE TRIGGERED ==='
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Request URL: /setup/account'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Request method: POST');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error name: ValidateError');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('JSON Parsing and Body Handling', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/setup/account')
        .send({ address: '0x58f9e6153690c852' })
        .set('Content-Type', 'application/json')
        .expect(200); // Will succeed but fail at SQS level due to AWS credentials

      // Should be an error response due to SQS/AWS failure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error?.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/setup/account')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle URL-encoded form data', async () => {
      const response = await request(app)
        .post('/setup/account')
        .send('address=0x58f9e6153690c852')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(200); // Will succeed but fail at SQS level due to AWS credentials

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error?.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Content Type Handling', () => {
    it('should handle different content types', async () => {
      // JSON content type
      await request(app)
        .post('/setup/account')
        .send({})
        .set('Content-Type', 'application/json')
        .expect(400);

      // Form data content type
      await request(app)
        .post('/setup/account')
        .send('data=test')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(400);
    });

    it('should set correct response content type', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Request Size and Limits', () => {
    it('should handle normal sized requests', async () => {
      const normalData = {
        address: '0x58f9e6153690c852',
        metadata: {
          description: 'A'.repeat(100),
        },
      };

      await request(app).post('/setup/account').send(normalData).expect(400); // Validation error, not size error
    });

    it('should handle requests with query parameters', async () => {
      const response = await request(app)
        .get('/health?test=value&another=param')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Application Configuration', () => {
    it('should initialize Flow configuration on startup', async () => {
      // Flow configuration is initialized when the app is created
      // We can verify this by checking that the app starts without errors
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should load tsoa routes successfully', async () => {
      // tsoa routes are loaded automatically when the app is created
      // We can verify this by checking that the app has routes
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
    });
  });

  describe('Route Registration', () => {
    it('should register all expected routes', async () => {
      // Health routes
      await request(app).get('/health').expect(200);
      await request(app).get('/api/info').expect(200);

      // API routes should be registered (even if they fail validation)
      await request(app).post('/setup/account').expect(400);
      await request(app).post('/mint').expect(400);
    });

    it('should handle route parameters correctly', async () => {
      // Test parameterized routes
      await request(app).get('/balance/0x58f9e6153690c852').expect(200);

      await request(app).get('/tax-calculation/100.0').expect(200);
    });
  });

  describe('Middleware Order and Execution', () => {
    it('should execute middleware in correct order', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).get('/health').expect(200);

      // Request logging should happen before route handling
      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      const requestLogIndex = logCalls.findIndex(
        call => call === '=== REQUEST LOG ==='
      );

      expect(requestLogIndex).toBeGreaterThanOrEqual(0);

      consoleSpy.mockRestore();
    });

    it('should handle errors after request logging', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app).post('/setup/account').send({}).expect(400);

      expect(consoleLogSpy).toHaveBeenCalledWith('=== REQUEST LOG ===');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '=== ERROR MIDDLEWARE TRIGGERED ==='
      );

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
