import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Grid,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShieldIcon from '@mui/icons-material/Shield';
import GppBadIcon from '@mui/icons-material/GppBad';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import BugReportIcon from '@mui/icons-material/BugReport';

import { fetchRecords, verifyLedger, tamperRecord, resetLedger } from '../api/auditApi';

export default function AuditLedger() {
  const [records, setRecords] = useState([]);
  const [verification, setVerification] = useState({ verified: true, chainSize: 0, issues: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const logs = await fetchRecords();
      const report = await verifyLedger();
      setRecords(logs);
      setVerification(report);
    } catch (err) {
      console.error(err);
      setError('Could not reach the Audit Store Service. Is it running on http://localhost:5001?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReset() {
    if (!window.confirm('Are you sure you want to clear the entire audit ledger? This action is irreversible.')) {
      return;
    }
    try {
      await resetLedger();
      await loadData();
    } catch (err) {
      setError('Failed to reset ledger.');
    }
  }

  async function handleTamper(requestId, fieldPath, mockValue) {
    try {
      await tamperRecord({ requestId, fieldPath, newValue: mockValue });
      await loadData();
      alert('Simulation completed: Block data has been modified on the filesystem. Recalculating ledger verification...');
    } catch (err) {
      setError('Failed to simulate tampering.');
    }
  }

  function getDecisionColor(decision) {
    switch (decision) {
      case 'APPROVED':
        return 'success';
      case 'APPROVED_WITH_MODIFICATION':
        return 'info';
      case 'HELD':
        return 'warning';
      case 'BLOCKED':
        return 'error';
      default:
        return 'default';
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Panel */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FingerprintIcon color="primary" /> Audit Ledger &amp; Cryptographic Seal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Immutable, tamper-evident audit store powered by cryptographic SHA-256 hash chains and RSA-2048 non-repudiation seals.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleReset}
            disabled={loading}
          >
            Reset Ledger
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Security Status Panel */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: verification.verified ? 'success.light' : 'error.light',
              bgcolor: verification.verified ? 'success.50' : 'error.50',
              height: '100%',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: verification.verified ? 'success.main' : 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                {verification.verified ? <VerifiedUserIcon /> : <GppBadIcon />}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Ledger Security Status
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: verification.verified ? 'success.dark' : 'error.dark' }}>
                  {verification.verified ? 'Ledger Intact & Sealed' : 'TAMPERING DETECTED!'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <ShieldIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Chain Length
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {records.length} Sealed Block{records.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <LockIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Cryptographic Standard
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  SHA-256 + RSA-2048 PKCS#8
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warning if tampered */}
      {!verification.verified && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 4, '& .MuiAlert-message': { width: '100%' } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Verification Check Failed!
          </Typography>
          <Typography variant="body2">
            The Audit Store Service detected that one or more blocks in the ledger have been manually modified or altered outside the authorized system pipeline.
          </Typography>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {verification.issues.map((issue, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <strong>Block #{issue.index}</strong> (Request: {issue.requestId})
                <br />
                Error: {issue.error}
              </div>
            ))}
          </Box>
        </Alert>
      )}

      {/* Empty State */}
      {records.length === 0 && !loading && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            color: 'text.secondary',
          }}
        >
          <FingerprintIcon sx={{ fontSize: 48, mb: 2, color: 'text.disabled' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            No audit records sealed yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Submit a request in the Governance Request Console to generate a new transaction block.
          </Typography>
        </Paper>
      )}

      {/* Ledger Block List */}
      <Stack spacing={2}>
        {records.map((block) => {
          const isCompromised = !verification.verified && verification.issues.some((issue) => issue.requestId === block.requestId);
          const isExpanded = expandedBlock === block.requestId;

          // Extract basic variables for ease
          const riskAss = block.fragments.risk_assessment || {};
          const policyEval = block.fragments.policy_evaluation || {};
          const consentMgmt = block.fragments.consent_management || {};
          const explain = block.fragments.explainability || {};
          const exec = block.fragments.execution || {};

          return (
            <Accordion
              key={block.requestId}
              expanded={isExpanded}
              onChange={() => setExpandedBlock(isExpanded ? null : block.requestId)}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: isCompromised ? 'error.light' : 'divider',
                '&:before': { display: 'none' },
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: isCompromised ? 'error.50' : 'background.paper',
                  '& .MuiAccordionSummary-content': { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: isCompromised ? 'error.main' : 'primary.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                    }}
                  >
                    #{block.index}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {riskAss.query ? (riskAss.query.length > 50 ? `${riskAss.query.slice(0, 50)}...` : riskAss.query) : 'Governance Transaction'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      User: <strong>{riskAss.username || 'System'}</strong> ({riskAss.role}) · Co: {block.company} · {new Date(block.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mr: 2 }}>
                  <Chip
                    size="small"
                    label={exec.decision || 'UNKNOWN'}
                    color={getDecisionColor(exec.decision)}
                    sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                  />
                  <Chip
                    size="small"
                    icon={isCompromised ? <GppBadIcon fontSize="small" /> : <VerifiedUserIcon fontSize="small" />}
                    label={isCompromised ? 'Seal Broken' : 'Sealed & Secured'}
                    color={isCompromised ? 'error' : 'success'}
                    variant="outlined"
                    sx={{ height: 24, fontSize: '0.7rem' }}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 1, bgcolor: 'background.default' }}>
                <Grid container spacing={3}>
                  {/* Left Column: Fragment Details */}
                  <Grid item xs={12} md={8}>
                    <Stack spacing={2.5}>
                      {/* Fragment 1: Risk Assessment */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          1. Risk Assessment &amp; Context Fragment
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Grid container spacing={1.5}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary" display="block">User Details</Typography>
                              <Typography variant="body2">{riskAss.username} ({riskAss.role})</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary" display="block">Department / Env</Typography>
                              <Typography variant="body2">{riskAss.department} · {riskAss.environment}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary" display="block">CAS Risk Score</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{riskAss.riskScore}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary" display="block">CAS Zone</Typography>
                              <Typography variant="body2">{riskAss.zone}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary" display="block">Requested Action</Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{riskAss.query}"</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Box>

                      {/* Fragment 2: Policy Evaluation */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          2. Policy Evaluation &amp; Match Fragment
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          {policyEval.retrievedPolicies && policyEval.retrievedPolicies.length > 0 ? (
                            <Stack spacing={1}>
                              {policyEval.retrievedPolicies.map((p, idx) => (
                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {p.policyId} — {p.title}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={`Relevance: ${(p.relevanceScore * 100).toFixed(1)}%`}
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No policies evaluated.</Typography>
                          )}
                        </Paper>
                      </Box>

                      {/* Fragment 3: Consent Management */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          3. Consent &amp; Escalation Fragment
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Stack direction="row" spacing={3} alignItems="center">
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">Consent Flag Required</Typography>
                              <Chip
                                size="small"
                                label={consentMgmt.requiresConsent ? 'Required' : 'Not Required'}
                                color={consentMgmt.requiresConsent ? 'warning' : 'default'}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                            {consentMgmt.requiresConsent && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Policies Requiring Consent</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {consentMgmt.consentPolicies?.map((p) => p.policyId).join(', ') || 'N/A'}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>
                      </Box>

                      {/* Fragment 4: Explainability */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          4. Governance Explanation (Explainability Fragment)
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Typography variant="caption" color="text.secondary" display="block">LLM Reasoning Model</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1 }}>{explain.modelUsed}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">Reasoning Rationale</Typography>
                          <Typography variant="body2" sx={{ mb: 1.5 }}>{explain.reason}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">Compliance Recommendation</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{explain.recommendation}</Typography>
                        </Paper>
                      </Box>

                      {/* Fragment 5: Execution Metadata */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          5. System Execution Fragment
                        </Typography>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Grid container spacing={1}>
                            <Grid item xs={6} sm={4}>
                              <Typography variant="caption" color="text.secondary" display="block">Final Decision Status</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{exec.decision}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                              <Typography variant="caption" color="text.secondary" display="block">Execution Status</Typography>
                              <Typography variant="body2">{exec.status}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                              <Typography variant="caption" color="text.secondary" display="block">Evaluated Checks Count</Typography>
                              <Typography variant="body2">{exec.checksCount} checklist items</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Box>
                    </Stack>
                  </Grid>

                  {/* Right Column: Cryptographic Seal & Tamper Tool */}
                  <Grid item xs={12} md={4}>
                    <Stack spacing={2.5}>
                      {/* Cryptographic Seal */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                          Cryptographic Block Link
                        </Typography>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                            Block Hash
                          </Typography>
                          <Tooltip title={block.hash}>
                            <Typography sx={{ mb: 1.5, wordBreak: 'break-all', bgcolor: 'grey.50', p: 0.5, borderRadius: 0.5 }}>
                              {block.hash}
                            </Typography>
                          </Tooltip>

                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                            Previous Block Hash
                          </Typography>
                          <Tooltip title={block.previousHash}>
                            <Typography sx={{ mb: 1.5, wordBreak: 'break-all', bgcolor: 'grey.50', p: 0.5, borderRadius: 0.5 }}>
                              {block.previousHash}
                            </Typography>
                          </Tooltip>

                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                            RSA-2048 Digital Seal
                          </Typography>
                          <Tooltip title={block.signature}>
                            <Typography
                              sx={{
                                wordBreak: 'break-all',
                                maxHeight: 80,
                                overflowY: 'auto',
                                display: 'block',
                                bgcolor: 'grey.50',
                                p: 0.5,
                                borderRadius: 0.5,
                              }}
                            >
                              {block.signature}
                            </Typography>
                          </Tooltip>
                        </Paper>
                      </Box>

                      {/* Tampering Simulator Tool */}
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: isCompromised ? 'error.light' : 'divider',
                          bgcolor: isCompromised ? 'error.50' : 'grey.50',
                        }}
                      >
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BugReportIcon fontSize="small" color={isCompromised ? 'error' : 'action'} /> Security Breach Simulator
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Test the immutable properties of the ledger. Inject fake data directly into the database files to trigger verification failure warnings.
                          </Typography>

                          {isCompromised ? (
                            <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                              ⚠️ This block has been flagged as compromised! Hash chain link or digital signature verification failed. Use "Reset Ledger" or regenerate transactions to secure.
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<WarningAmberIcon />}
                                onClick={() => handleTamper(block.requestId, 'execution.decision', 'APPROVED')}
                              >
                                Mutate Decision (Blocked -> Approved)
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<WarningAmberIcon />}
                                onClick={() => handleTamper(block.requestId, 'risk_assessment.riskScore', 0)}
                              >
                                Mutate Risk Score (To 0)
                              </Button>
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Container>
  );
}
