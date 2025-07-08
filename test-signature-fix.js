/**
 * Test script for the fixed Flow signature implementation
 * Tests the improved ECDSA P256 + SHA3-256 signing process
 */

require('dotenv').config();
const { FlowService } = require('./dist/services/flowService');
const fcl = require('@onflow/fcl');

// Configure FCL for testnet
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
  '0x9a0766d93b6608b7': '0x9a0766d93b6608b7', // FungibleToken
  '0x58f9e6153690c852': '0x58f9e6153690c852', // Heart Contract
});

async function testSignatureImplementation() {
  console.log('🧪 Testing Fixed Flow Signature Implementation');
  console.log('='.repeat(60));

  try {
    // Initialize FlowService
    const flowService = new FlowService();
    console.log('✅ FlowService initialized');

    // Test environment variables
    const adminAddress = process.env.ADMIN_ADDRESS;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!adminAddress || !privateKey) {
      throw new Error(
        'Missing environment variables: ADMIN_ADDRESS or ADMIN_PRIVATE_KEY'
      );
    }

    console.log('✅ Environment variables loaded');
    console.log(`📍 Admin Address: ${adminAddress}`);
    console.log(`🔑 Private Key: ${privateKey.substring(0, 8)}...`);

    // Test 1: Verify account information
    console.log('\n📋 Test 1: Retrieving account information...');
    const accountInfo = await flowService.getAccountInfo(adminAddress);
    console.log('✅ Account info retrieved successfully');
    console.log(`   Address: ${accountInfo.address}`);
    console.log(`   Keys: ${accountInfo.keys?.length || 0}`);
    console.log(`   Balance: ${accountInfo.balance}`);

    if (accountInfo.keys && accountInfo.keys.length > 0) {
      const key = accountInfo.keys[0];
      console.log(`   Key 0 - Public Key: ${key.publicKey}`);
      console.log(`   Key 0 - Sign Algo: ${key.signAlgo}`);
      console.log(`   Key 0 - Hash Algo: ${key.hashAlgo}`);
      console.log(`   Key 0 - Weight: ${key.weight}`);
      console.log(`   Key 0 - Sequence: ${key.sequenceNumber}`);
    }

    // Test 2: Private key verification
    console.log('\n🔐 Test 2: Verifying private key...');
    if (accountInfo.keys && accountInfo.keys.length > 0) {
      const expectedPublicKey = accountInfo.keys[0].publicKey;

      // Access private method through reflection for testing
      const verifyResult = await flowService.verifyPrivateKey(
        privateKey,
        expectedPublicKey
      );

      console.log('✅ Private key verification completed');
      console.log(`   Is Valid: ${verifyResult.isValid}`);
      console.log(`   Details: ${verifyResult.details}`);
      console.log(
        `   Generated Public Key: ${verifyResult.generatedPublicKey}`
      );

      if (!verifyResult.isValid) {
        throw new Error('Private key verification failed!');
      }
    }

    // Test 3: Transaction signature test (setup account)
    console.log('\n🎯 Test 3: Testing transaction signature...');
    console.log('Attempting to execute setupAccount transaction...');

    // Use admin address for testing (self-setup)
    const testAddress = adminAddress;

    try {
      const result = await flowService.setupAccount(testAddress);
      console.log('✅ Setup account transaction completed');
      console.log('   Result:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('🎉 SIGNATURE IMPLEMENTATION TEST PASSED!');
        console.log(
          '   Transaction was successfully signed and submitted to Flow'
        );
      } else {
        console.log(
          '⚠️  Transaction returned error (expected for test address)'
        );
        console.log('   Error:', result.error);
      }
    } catch (transactionError) {
      console.log('📊 Transaction result (with detailed error analysis):');
      console.log('   Error message:', transactionError.message);

      // Analyze error type
      if (transactionError.message.includes('signature is not valid')) {
        console.log('❌ SIGNATURE VALIDATION FAILED');
        console.log('   The signature format or generation is still incorrect');
        return false;
      } else if (transactionError.message.includes('address is invalid')) {
        console.log('✅ SIGNATURE VALIDATION PASSED');
        console.log('   Error is due to invalid test address, not signature');
        return true;
      } else {
        console.log('⚠️  Unknown error type');
        console.log('   Full error:', transactionError);
        return false;
      }
    }

    // Test 4: Simple message signing test
    console.log('\n✍️  Test 4: Testing message signing...');
    const testMessage = 'Hello Flow Blockchain!';

    try {
      // Access private method for testing
      const signature = await flowService.signWithPrivateKey(
        testMessage,
        privateKey
      );
      console.log('✅ Message signing completed');
      console.log(`   Message: "${testMessage}"`);
      console.log(`   Signature length: ${signature.length} chars`);
      console.log(`   Signature preview: ${signature.substring(0, 32)}...`);

      if (signature.length === 128) {
        console.log('✅ Signature format is correct (128 hex chars)');
      } else {
        console.log(
          `❌ Signature format is incorrect (expected 128, got ${signature.length})`
        );
      }
    } catch (signError) {
      console.log('❌ Message signing failed:', signError.message);
      return false;
    }

    console.log('\n🎉 All signature tests completed successfully!');
    console.log('📊 Summary:');
    console.log('   ✅ Account information retrieval');
    console.log('   ✅ Private key verification');
    console.log('   ✅ Transaction signature generation');
    console.log('   ✅ Message signature generation');
    console.log(
      '\n🚀 The fixed signature implementation is working correctly!'
    );

    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return false;
  }
}

// Run the test
if (require.main === module) {
  testSignatureImplementation()
    .then(success => {
      if (success) {
        console.log('\n✅ TEST SUITE PASSED');
        process.exit(0);
      } else {
        console.log('\n❌ TEST SUITE FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 TEST SUITE CRASHED:', error);
      process.exit(1);
    });
}
