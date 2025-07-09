const fs = require('fs');
const fcl = require('@onflow/fcl');
const { ec: EC } = require('elliptic');

// Configure FCL
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
});

const ADMIN_PRIVATE_KEY =
  'dc545808fd7b45be54d2aa50048220232a8e3c3c2d267fc3323c40486137cd30';
const ADMIN_ADDRESS = '0x58f9e6153690c852';

async function signWithPrivateKey(message, privateKey) {
  const ec = new EC('p256');
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');

  const msgHash = Buffer.from(message, 'hex');
  const signature = keyPair.sign(msgHash);

  const r = signature.r.toString('hex').padStart(64, '0');
  const s = signature.s.toString('hex').padStart(64, '0');

  return r + s;
}

async function setupMinterRole() {
  try {
    console.log('=== SETTING UP MINTER ROLE ===');

    // Read the setup-admin-roles transaction
    const transactionCode = fs.readFileSync(
      'transactions/setup-admin-roles.transaction.cdc',
      'utf8'
    );
    console.log('Transaction file loaded successfully');

    // Replace import statements
    const processedCode = transactionCode.replace(
      /import \"Heart\"/g,
      'import Heart from 0x58f9e6153690c852'
    );
    console.log('Import statements processed');

    // Get account info
    const accountInfo = await fcl.account(ADMIN_ADDRESS);
    const keyIndex = 0;
    const sequenceNumber = accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

    console.log(`Admin Account: ${ADMIN_ADDRESS}`);
    console.log(`Current Sequence Number: ${sequenceNumber}`);

    // Create authorization
    const authorization = async account => {
      const accountInfo = await fcl.account(ADMIN_ADDRESS);
      const currentSequenceNumber =
        accountInfo.keys?.[keyIndex]?.sequenceNumber || 0;

      return {
        ...account,
        addr: fcl.sansPrefix(ADMIN_ADDRESS),
        keyId: keyIndex,
        sequenceNumber: currentSequenceNumber,
        signingFunction: async signable => {
          const signature = await signWithPrivateKey(
            signable.message,
            ADMIN_PRIVATE_KEY
          );
          return {
            addr: fcl.sansPrefix(ADMIN_ADDRESS),
            keyId: keyIndex,
            signature: signature,
          };
        },
      };
    };

    console.log('Authorization configured');

    // Execute transaction
    console.log('Sending setup-admin-roles transaction...');
    const txId = await fcl.mutate({
      cadence: processedCode,
      args: [],
      authorizations: [authorization],
      proposer: authorization,
      payer: authorization,
      limit: 1000,
    });

    console.log(`✅ Transaction sent! ID: ${txId}`);

    // Wait for transaction to be sealed
    console.log('Waiting for transaction to be sealed...');
    const transaction = await fcl.tx(txId).onceSealed();

    console.log('=== TRANSACTION COMPLETED ===');
    console.log(
      `Status: ${transaction.status} (${transaction.statusString || 'Sealed'})`
    );
    console.log(`Block Height: ${transaction.blockId}`);
    console.log(`Gas Used: ${transaction.gasUsed || 'N/A'}`);

    if (transaction.errorMessage) {
      console.error('❌ Transaction Error:', transaction.errorMessage);
      return false;
    } else {
      console.log('✅ Transaction successful!');
      console.log(
        '🎉 Minter, Pauser, and TaxManager roles have been set up for admin account'
      );

      // Log transaction events
      if (transaction.events && transaction.events.length > 0) {
        console.log('\\n=== TRANSACTION EVENTS ===');
        transaction.events.forEach((event, index) => {
          console.log(`${index + 1}. ${event.type}`);
          if (event.data) {
            console.log(`   Data:`, event.data);
          }
        });
      }

      return true;
    }
  } catch (error) {
    console.error('=== SETUP FAILED ===');
    console.error('❌ Error:', error.message);

    // Handle specific errors
    if (error.message.includes('Could not borrow admin resource')) {
      console.error(
        '💡 Solution: Make sure the account has Admin role capability'
      );
    } else if (error.message.includes('already exists')) {
      console.log('✅ Roles already exist - this is normal!');
      return true;
    }

    return false;
  }
}

// Execute the setup
setupMinterRole()
  .then(success => {
    if (success) {
      console.log('\\n🎉 Minter role setup completed successfully!');
      console.log('Now you can test the mint API with real transactions.');
    } else {
      console.log('\\n❌ Minter role setup failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\\n💥 Setup script failed:', error.message);
    process.exit(1);
  });
