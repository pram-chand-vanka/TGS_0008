import axios from 'axios';

const BASE_URL = process.env.REACT_APP_AUDIT_API_BASE_URL || 'http://localhost:5001/api/audit';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export async function fetchRecords() {
  const { data } = await client.get('/records');
  return data;
}

export async function verifyLedger() {
  const { data } = await client.get('/verify');
  return data;
}

export async function tamperRecord({ requestId, fieldPath, newValue }) {
  const { data } = await client.post('/tamper', { requestId, fieldPath, newValue });
  return data;
}

export async function resetLedger() {
  const { data } = await client.post('/reset');
  return data;
}
