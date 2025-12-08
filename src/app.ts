/**
 * Express Application for Heart Token API
 *
 * @description Main Express application setup with tsoa route registration.
 * Handles middleware configuration, route registration, and error handling.
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import * as fcl from '@onflow/fcl';
import {
  initializeFlowConfig,
  FLOW_ENV,
  getContractAddresses,
} from './config/flow';
import {
  createErrorResponse,
  API_ERROR_CODES,
} from './models/responses/ApiResponse';
import { initializePassport } from './middleware/passport';

// Import controllers to ensure they are loaded for tsoa
import './controllers/queries/BalanceController';
import './controllers/queries/TokenInfoController';
import './controllers/queries/AdminController';
import './controllers/auth/AuthController';
import './controllers/sns/UsersController';
import './controllers/sns/PostsController';
import './controllers/sns/FeedController';
import './controllers/sns/CommentsController';
import './controllers/sns/LikesController';
import './controllers/sns/FollowsController';
import './controllers/sns/SearchController';

/**
 * Create Express application
 *
 * @description Sets up Express application with middleware and routes.
 * Configures CORS, JSON parsing, and API documentation.
 *
 * @returns Configured Express application
 */
export const createApp = (): express.Application => {
  const app = express();

  // Initialize Flow configuration for @blocto/fcl
  initializeFlowConfig();

  // Initialize @onflow/fcl for FlowAuthService (must be done before importing AuthController)
  try {
    fcl.config({
      'accessNode.api': FLOW_ENV.ACCESS_NODE,
      'discovery.wallet': FLOW_ENV.DISCOVERY_WALLET,
      '0xHeart': FLOW_ENV.HEART_CONTRACT_ADDRESS,
      'fcl.limit': '1000',
    });
    console.log('@onflow/fcl initialized successfully in app.ts', {
      accessNode: FLOW_ENV.ACCESS_NODE,
      network: FLOW_ENV.NETWORK,
    });
  } catch (error) {
    console.error('Failed to initialize @onflow/fcl in app.ts:', error);
  }

  // Initialize Passport.js for authentication
  initializePassport();

  // Display network configuration at startup
  console.log('=== FLOW NETWORK CONFIGURATION ===');
  console.log('Network:', FLOW_ENV.NETWORK);
  console.log('Access Node:', FLOW_ENV.ACCESS_NODE);
  console.log('Discovery Wallet:', FLOW_ENV.DISCOVERY_WALLET);
  console.log('Heart Contract:', FLOW_ENV.HEART_CONTRACT_ADDRESS);
  console.log('');
  console.log('=== CONTRACT ADDRESSES ===');
  const contractAddresses = getContractAddresses();
  Object.entries(contractAddresses).forEach(([name, address]) => {
    console.log(`${name}:`, address);
  });
  console.log('================================');

  // Middleware setup
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log('=== REQUEST LOG ===');
    console.log(`URL: ${req.url}`);
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.path}`);
    console.log(`Query: ${JSON.stringify(req.query)}`);
    console.log('==================');
    next();
  });

  // Enhanced CORS middleware for Swagger UI compatibility
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
    );
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'heartland-contract-cadence-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API information endpoint
  app.get('/api/info', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: 'Flow Heart Token Control API',
        version: '1.0.0',
        description:
          'TypeScript-based Serverless API for Flow Heart Token Contract',
        endpoints: {
          docs: '/docs',
          health: '/health',
          api: '/api/v1',
        },
        blockchain: {
          network: 'Flow Testnet',
          contract: '0x58f9e6153690c852',
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Temporary debug endpoint for batch address testing
  app.get('/debug/batch-raw', (req: Request, res: Response) => {
    console.log('Query params:', JSON.stringify(req.query));
    console.log('Addresses param:', JSON.stringify(req.query.addresses));
    console.log('Typeof addresses:', typeof req.query.addresses);

    const addressesParam = req.query.addresses as string;
    if (addressesParam) {
      const addressList = addressesParam.split(',').map(addr => addr.trim());
      console.log('Parsed addresses:', JSON.stringify(addressList));

      // Test validation directly
      const { isValidFlowAddress } = require('./config/flow');
      const validationResults = addressList.map(addr => ({
        address: addr,
        length: addr.length,
        isValid: isValidFlowAddress(addr),
      }));

      console.log(
        'Validation results:',
        JSON.stringify(validationResults, null, 2)
      );

      res.json({
        debug: 'raw-express-endpoint',
        raw: req.query.addresses,
        parsed: addressList,
        validation: validationResults,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.json({
        error: 'No addresses parameter provided',
        allQuery: req.query,
      });
    }
  });

  // Swagger UI documentation
  app.use('/docs', (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to load the generated swagger.json
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const swaggerDocument = require('../build/swagger.json');
      swaggerUi.setup(swaggerDocument)(req, res, next);
    } catch {
      // If swagger.json doesn't exist, show message
      res.json({
        message: 'API documentation not yet generated',
        instruction:
          'Run "pnpm run tsoa:spec-and-routes" to generate documentation',
      });
    }
  });

  // Register tsoa routes
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RegisterRoutes } = require('./routes');
    RegisterRoutes(app);
    console.log('✅ tsoa routes loaded successfully');
  } catch (error) {
    console.warn(
      'Routes not yet generated. Run "pnpm run tsoa:spec-and-routes" to generate routes.'
    );
    console.warn('Error details:', error);

    // Temporary route for testing
    app.get('/api/v1/test', (req: Request, res: Response) => {
      res.json({
        message: 'API routes not yet generated',
        instruction: 'Run "pnpm run tsoa:spec-and-routes" to generate routes',
        available_when_ready: [
          'GET /balance/{address}',
          'GET /balance/{address}/setup-status',
          'GET /balance/batch',
          'GET /token-info/total-supply',
          'GET /token-info/tax-rate',
          'GET /token-info/treasury-account',
          'GET /token-info/pause-status',
          'GET /token-info/tax-calculation/{amount}',
          'GET /token-info/admin-capabilities/{address}',
        ],
      });
    });
  }

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('=== ERROR MIDDLEWARE TRIGGERED ===');
    console.error(`Request URL: ${req.url}`);
    console.error(`Request method: ${req.method}`);
    console.error(`Request query: ${JSON.stringify(req.query)}`);
    console.error(`Error name: ${err.name}`);
    console.error(`Error message: ${err.message}`);
    console.error(`Error stack: ${err.stack}`);
    console.error('=====================================');

    // Handle authentication errors
    if (err.status === 401) {
      const errorResponse = createErrorResponse({
        code: API_ERROR_CODES.UNAUTHORIZED,
        message: err.message || 'Authentication required',
        details: 'Valid JWT token is required for this endpoint',
      });
      res.status(401).json(errorResponse);
      return;
    }

    // Handle authorization errors
    if (err.status === 403) {
      const errorResponse = createErrorResponse({
        code: API_ERROR_CODES.FORBIDDEN,
        message: err.message || 'Insufficient permissions',
        details: 'You do not have permission to access this resource',
      });
      res.status(403).json(errorResponse);
      return;
    }

    // Handle tsoa ValidateError
    if (err.name === 'ValidateError') {
      const errorResponse = createErrorResponse({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.fields ? JSON.stringify(err.fields) : err.message,
      });
      res.status(400).json(errorResponse);
      return;
    }

    // Handle JSON parsing errors
    if (err.type === 'entity.parse.failed') {
      const errorResponse = createErrorResponse({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid JSON format',
        details: 'Request body contains malformed JSON',
      });
      res.status(400).json(errorResponse);
      return;
    }

    // Default error handling
    const errorResponse = createErrorResponse({
      code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      details:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
    });

    res.status(500).json(errorResponse);
    next();
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    const errorResponse = createErrorResponse({
      code: API_ERROR_CODES.NOT_FOUND,
      message: 'Endpoint not found',
      details: `The requested endpoint ${req.method} ${req.path} does not exist`,
    });

    res.status(404).json(errorResponse);
  });

  return app;
};

// Export app instance
export const app = createApp();
