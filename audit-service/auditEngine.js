const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const LEDGER_PATH = path.join(DATA_DIR, 'ledger.json');
const KEYS_DIR = path.join(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

// In-memory cache for incoming audit fragments grouped by requestId
// requestId -> { policy_evaluation: null, risk_assessment: null, consent_management: null, explainability: null, execution: null }
const fragmentCache = new Map();

// Helper to ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Generate or load RSA keypair for cryptographic signatures
function generateOrLoadKeys() {
  ensureDirs();
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return { privateKey, publicKey };
  }

  console.log('[ASS] Generating new RSA-2048 keypair for audit sealing...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  return { privateKey, publicKey };
}

const { privateKey, publicKey } = generateOrLoadKeys();

// Load the ledger from disk
function loadLedger() {
  ensureDirs();
  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  } catch (err) {
    console.error('[ASS] Error parsing ledger.json, resetting to empty array', err);
    return [];
  }
}

// Save the ledger to disk
function saveLedger(ledger) {
  ensureDirs();
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

// Ingest an audit fragment
function ingestFragment(requestId, component, data) {
  if (!fragmentCache.has(requestId)) {
    fragmentCache.set(requestId, {
      policy_evaluation: null,
      risk_assessment: null,
      consent_management: null,
      explainability: null,
      execution: null,
    });
  }
  const cached = fragmentCache.get(requestId);
  cached[component] = data;
}

// Compile and seal the audit record
function sealRecord(requestId) {
  const fragments = fragmentCache.get(requestId);
  if (!fragments) {
    throw new Error(`No fragments found for request: ${requestId}`);
  }

  const ledger = loadLedger();
  const index = ledger.length;
  const timestamp = new Date().toISOString();
  
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  if (index > 0) {
    previousHash = ledger[index - 1].hash;
  }

  // Define structured payload to hash (keys order matters for deterministic stringify)
  const payload = {
    index,
    timestamp,
    requestId,
    fragments,
    previousHash,
  };

  const serialized = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');

  // Sign hash
  const sign = crypto.createSign('SHA256');
  sign.update(hash);
  const signature = sign.sign(privateKey, 'base64');

  const block = {
    ...payload,
    hash,
    signature,
  };

  ledger.push(block);
  saveLedger(ledger);

  // Clear memory cache
  fragmentCache.delete(requestId);
  console.log(`[ASS] Sealed block #${index} for request ${requestId} with hash: ${hash.slice(0, 10)}...`);
  return block;
}

// Cryptographically verify the integrity of the entire ledger
function verifyLedger() {
  const ledger = loadLedger();
  const report = {
    verified: true,
    chainSize: ledger.length,
    issues: [],
  };

  for (let i = 0; i < ledger.length; i++) {
    const block = ledger[i];
    
    // 1. Verify index order
    if (block.index !== i) {
      report.verified = false;
      report.issues.push({ index: i, error: `Invalid block index sequence: expected ${i}, got ${block.index}` });
    }

    // 2. Re-compute and verify hash matching
    const payload = {
      index: block.index,
      timestamp: block.timestamp,
      requestId: block.requestId,
      fragments: block.fragments,
      previousHash: block.previousHash,
    };
    const serialized = JSON.stringify(payload);
    const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');
    
    if (computedHash !== block.hash) {
      report.verified = false;
      report.issues.push({
        index: i,
        requestId: block.requestId,
        error: 'Hash mismatch: content has been altered or tampered with.',
        expected: block.hash,
        actual: computedHash,
      });
    }

    // 3. Verify previous hash link
    if (i > 0) {
      const prevBlock = ledger[i - 1];
      if (block.previousHash !== prevBlock.hash) {
        report.verified = false;
        report.issues.push({
          index: i,
          requestId: block.requestId,
          error: `Broken chain link: previousHash does not match hash of block #${i - 1}.`,
          expected: prevBlock.hash,
          actual: block.previousHash,
        });
      }
    } else {
      const genesisPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      if (block.previousHash !== genesisPrevHash) {
        report.verified = false;
        report.issues.push({
          index: 0,
          requestId: block.requestId,
          error: 'Genesis block previousHash must be all zeros.',
        });
      }
    }

    // 4. Verify cryptographic signature
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(block.hash);
      const isSigValid = verify.verify(publicKey, block.signature, 'base64');
      if (!isSigValid) {
        report.verified = false;
        report.issues.push({
          index: i,
          requestId: block.requestId,
          error: 'Cryptographic signature is invalid: the record was modified or key is invalid.',
        });
      }
    } catch (err) {
      report.verified = false;
      report.issues.push({
        index: i,
        requestId: block.requestId,
        error: `Signature verification error: ${err.message}`,
      });
    }
  }

  return report;
}

// Simulate tampering by mutating record data directly in ledger.json
function tamperRecord(requestId, fieldPath, newValue) {
  const ledger = loadLedger();
  const block = ledger.find((b) => b.requestId === requestId);
  if (!block) {
    throw new Error(`Record with request ID ${requestId} not found.`);
  }

  // Mutate nested field in fragments
  // e.g. fieldPath = "execution.decision" or "risk_assessment.riskScore"
  const parts = fieldPath.split('.');
  let obj = block.fragments;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  
  const lastPart = parts[parts.length - 1];
  const oldValue = obj[lastPart];
  obj[lastPart] = newValue;

  saveLedger(ledger);
  console.log(`[ASS] Tampering successful: mutated ${fieldPath} in request ${requestId} from "${oldValue}" to "${newValue}"`);
  return { requestId, fieldPath, oldValue, newValue };
}

// Reset ledger (delete keys/ledger for testing)
function resetLedger() {
  ensureDirs();
  if (fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify([]));
  }
  fragmentCache.clear();
  console.log('[ASS] Ledger reset successfully.');
}

module.exports = {
  ingestFragment,
  sealRecord,
  verifyLedger,
  tamperRecord,
  resetLedger,
  publicKey,
  loadLedger,
};
