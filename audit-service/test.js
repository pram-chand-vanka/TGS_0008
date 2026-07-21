const assert = require('assert');
const {
  ingestFragment,
  sealRecord,
  verifyLedger,
  tamperRecord,
  resetLedger,
  loadLedger,
} = require('./auditEngine');

async function runTests() {
  console.log('--- STARTING AUDIT ENGINE TESTS ---');

  // 1. Reset Ledger
  console.log('Test 1: Resetting ledger...');
  resetLedger();
  let ledger = loadLedger();
  assert.strictEqual(ledger.length, 0, 'Ledger should be empty after reset');

  // 2. Ingest fragments for a mock request
  console.log('Test 2: Ingesting fragments...');
  const mockRequestId = 'test-request-uuid-12345';
  
  ingestFragment(mockRequestId, 'risk_assessment', { score: 45, zone: 'Zone 2' });
  ingestFragment(mockRequestId, 'policy_evaluation', { cited: ['POL-001'] });
  ingestFragment(mockRequestId, 'consent_management', { required: false });
  ingestFragment(mockRequestId, 'explainability', { model: 'llama3-70b', reason: 'authorized' });
  ingestFragment(mockRequestId, 'execution', { decision: 'APPROVED', status: 'success' });

  // 3. Seal block
  console.log('Test 3: Sealing record...');
  const block = sealRecord(mockRequestId);
  assert.strictEqual(block.index, 0, 'Genesis block should have index 0');
  assert.strictEqual(block.requestId, mockRequestId, 'Request ID should match');
  assert.ok(block.hash, 'Hash must be generated');
  assert.ok(block.signature, 'Signature must be generated');

  ledger = loadLedger();
  assert.strictEqual(ledger.length, 1, 'Ledger should contain 1 block');

  // 4. Verify Ledger (should be successful)
  console.log('Test 4: Verifying intact ledger...');
  let report = verifyLedger();
  assert.strictEqual(report.verified, true, 'Verification should succeed on intact ledger');
  assert.strictEqual(report.issues.length, 0, 'There should be no issues on intact ledger');

  // 5. Tamper Record (simulate breach)
  console.log('Test 5: Simulating data tampering...');
  tamperRecord(mockRequestId, 'execution.decision', 'BLOCKED'); // Alter decision behind the scenes!

  // 6. Verify Ledger (should fail)
  console.log('Test 6: Verifying tampered ledger...');
  report = verifyLedger();
  assert.strictEqual(report.verified, false, 'Verification should fail after data tampering');
  assert.ok(report.issues.length > 0, 'Issues list should not be empty');
  assert.ok(
    report.issues.some((issue) => issue.error.includes('Hash mismatch')),
    'Tampered data should trigger hash mismatch error'
  );

  // 7. Cleanup
  console.log('Test 7: Cleaning up...');
  resetLedger();
  ledger = loadLedger();
  assert.strictEqual(ledger.length, 0, 'Ledger should be clean');

  console.log('--- ALL AUDIT ENGINE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
