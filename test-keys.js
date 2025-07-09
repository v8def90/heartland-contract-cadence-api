const crypto = require('crypto');
const { ec: EC } = require('elliptic');

const currentPrivateKey =
  'dc545808fd7b45be54d2aa50048220232a8e3c3c2d267fc3323c40486137cd30';
const expectedPublicKey = [
  44, 6, 91, 225, 96, 80, 101, 221, 108, 7, 124, 167, 72, 26, 31, 209, 84, 163,
  209, 61, 120, 167, 173, 203, 3, 139, 24, 121, 57, 240, 44, 107, 169, 21, 122,
  210, 191, 255, 152, 139, 60, 49, 9, 32, 165, 15, 62, 178, 227, 50, 69, 167,
  11, 187, 86, 24, 170, 252, 178, 38, 100, 85, 64, 207,
];

console.log('=== PRIVATE KEY VERIFICATION ===');
console.log('Current Private Key:', currentPrivateKey);
console.log('Expected Public Key (from Flow account):', expectedPublicKey);

try {
  // Generate public key from current private key
  const ec = new EC('p256');
  const keyPair = ec.keyFromPrivate(currentPrivateKey, 'hex');
  const publicKeyPoint = keyPair.getPublic();

  // Get uncompressed public key bytes (64 bytes)
  const publicKeyBytes = Buffer.from(
    publicKeyPoint.encode('hex', false).slice(2),
    'hex'
  );
  const generatedPublicKey = Array.from(publicKeyBytes);

  console.log('\nGenerated Public Key (from private key):', generatedPublicKey);
  console.log('Generated Public Key Length:', generatedPublicKey.length);
  console.log('Expected Public Key Length:', expectedPublicKey.length);

  // Compare
  const isMatch =
    JSON.stringify(generatedPublicKey) === JSON.stringify(expectedPublicKey);
  console.log('\n=== COMPARISON RESULT ===');
  console.log('Keys Match:', isMatch);

  if (!isMatch) {
    console.log('\n❌ MISMATCH DETECTED');
    console.log('This explains the signature validation failure!');
    console.log('\nFirst 10 bytes comparison:');
    console.log('Generated:', generatedPublicKey.slice(0, 10));
    console.log('Expected: ', expectedPublicKey.slice(0, 10));

    // Show difference in hex format
    const generatedHex = Buffer.from(generatedPublicKey).toString('hex');
    const expectedHex = Buffer.from(expectedPublicKey).toString('hex');
    console.log('\nHex format comparison:');
    console.log('Generated:', generatedHex);
    console.log('Expected: ', expectedHex);
  } else {
    console.log('\n✅ KEYS MATCH - Signature should work');
  }
} catch (error) {
  console.error('Error generating public key:', error.message);
  console.error(error.stack);
}
