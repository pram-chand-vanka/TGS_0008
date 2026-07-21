const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const {
  ingestFragment,
  sealRecord,
  verifyLedger,
  tamperRecord,
  resetLedger,
  publicKey,
  loadLedger,
} = require('./auditEngine');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*' })); // Allow requests from all origins (including frontend on port 3000)
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Health check
app.get('/api/audit/health', (req, res) => {
  res.json({ status: 'ok', service: 'Audit Store Service (ASS)' });
});

// Ingest an audit fragment
app.post('/api/audit/fragment', (req, res) => {
  const { requestId, component, data } = req.body;
  if (!requestId || !component || data === undefined) {
    return res.status(400).json({ error: 'Missing requestId, component, or data.' });
  }

  const validComponents = [
    'policy_evaluation',
    'risk_assessment',
    'consent_management',
    'explainability',
    'execution',
  ];

  if (!validComponents.includes(component)) {
    return res.status(400).json({
      error: `Invalid component. Must be one of: ${validComponents.join(', ')}`,
    });
  }

  ingestFragment(requestId, component, data);
  res.json({ status: 'fragment_cached', requestId, component });
});

// Seal audit fragments into a signed block
app.post('/api/audit/seal', (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId.' });
  }

  try {
    const block = sealRecord(requestId);
    res.status(201).json({ status: 'sealed', block });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retrieve all records in the ledger
app.get('/api/audit/records', (req, res) => {
  const ledger = loadLedger();
  // Return in reverse chronological order so new entries appear on top
  res.json([...ledger].reverse());
});

// Cryptographically verify the integrity of the ledger
app.get('/api/audit/verify', (req, res) => {
  const report = verifyLedger();
  res.json(report);
});

// Get the public key PEM to verify signatures externally
app.get('/api/audit/public-key', (req, res) => {
  res.send(publicKey);
});

// Tamper record endpoint (for demonstration/QE purposes)
app.post('/api/audit/tamper', (req, res) => {
  const { requestId, fieldPath, newValue } = req.body;
  if (!requestId || !fieldPath || newValue === undefined) {
    return res.status(400).json({ error: 'Missing requestId, fieldPath, or newValue.' });
  }

  try {
    const result = tamperRecord(requestId, fieldPath, newValue);
    res.json({ status: 'tampered', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reset the ledger (for cleaning up demo runs)
app.post('/api/audit/reset', (req, res) => {
  resetLedger();
  res.json({ status: 'ledger_reset' });
});

// Start Express App
app.listen(PORT, () => {
  console.log(`[ASS] Audit Store Service listening on http://localhost:${PORT}`);
});
