/**
 * Local Development Server
 *
 * @description HTTP server for local development and testing.
 * Starts the Express app on a specified port.
 */

import { app } from './app';

const PORT = process.env.PORT || 3000;

/**
 * Start the HTTP server
 *
 * @description Starts the Express application on the specified port.
 */
const startServer = (): void => {
  app.listen(PORT, () => {
    console.log('🚀 Flow Heart Token API Server Started');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`ℹ️  API Info: http://localhost:${PORT}/api/info`);
    console.log(`🔗 Test Endpoint: http://localhost:${PORT}/api/v1/test`);
    console.log('');
    console.log('==================================================');
    console.log('📋 Available API Endpoints (Real Flow Integration)');
    console.log('==================================================');
    console.log('');
    console.log('🔍 READ OPERATIONS (Synchronous - Real Contract):');
    console.log('  Token Information:');
    console.log('    GET /tax-rate                    - Get current tax rate');
    console.log(
      '    GET /pause-status                - Check contract pause status',
    );
    console.log(
      '    GET /tax-calculation/{amount}    - Calculate tax for amount',
    );
    console.log(
      '    GET /total-supply                - Get total token supply',
    );
    console.log(
      '    GET /treasury-account            - Get treasury account info',
    );
    console.log('');
    console.log('  Balance Information:');
    console.log(
      '    GET /balance/{address}           - Get individual balance',
    );
    console.log('    GET /balance/batch?addresses=... - Get multiple balances');
    console.log('');
    console.log('  Admin Information:');
    console.log(
      '    GET /admin-capabilities/{address} - Check admin permissions',
    );
    console.log('');
    console.log('⚡ WRITE OPERATIONS (Asynchronous SQS Processing):');
    console.log('  Account Setup:');
    console.log(
      '    POST /setup/account              - Setup HEART vault (→ jobId)',
    );
    console.log(
      '    POST /setup/admin-minter         - Setup admin Minter (→ jobId)',
    );
    console.log(
      '    POST /setup/admin-roles          - Setup admin roles (→ jobId)',
    );
    console.log('');
    console.log('  Token Operations:');
    console.log('    POST /mint                       - Mint tokens (→ jobId)');
    console.log('');
    console.log('📊 JOB TRACKING (CloudWatch Logs Integration):');
    console.log(
      '    GET /jobs/{jobId}                - Get job status & progress',
    );
    console.log('');
    console.log('==================================================');
    console.log('🎯 Architecture: REST API + SQS + Lambda Workers');
    console.log('🔗 Flow Network: Testnet (0x58f9e6153690c852)');
    console.log('🔑 Authentication: Flow Private Key + JWT (planned)');
    console.log('⚙️  Processing: Sync reads, Async writes via SQS');
    console.log('==================================================');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
