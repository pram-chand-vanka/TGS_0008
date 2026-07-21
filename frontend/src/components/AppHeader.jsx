import React from 'react';
import { AppBar, Toolbar, Box, Typography, Chip, Stack, Button } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { NavLink } from 'react-router-dom';

export default function AppHeader() {
  return (
    <AppBar position="sticky" color="inherit" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }} elevation={0}>
      <Toolbar sx={{ minHeight: 68 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.5,
          }}
        >
          <ShieldOutlinedIcon sx={{ color: '#fff' }} fontSize="small" />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontWeight: 'bold' }}>
            QMentisAI &nbsp;·&nbsp; Trust &amp; Governance Service
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enterprise Agentic QE Platform — Governance Decision Console
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mr: 4 }}>
          <Button
            component={NavLink}
            to="/"
            end
            variant="text"
            color="inherit"
            sx={{
              fontWeight: 'bold',
              textTransform: 'none',
              height: 68,
              borderRadius: 0,
              px: 2.5,
              '&.active': {
                color: 'primary.main',
                borderBottom: '3px solid',
                borderColor: 'primary.main',
              },
            }}
          >
            Request Console
          </Button>
          <Button
            component={NavLink}
            to="/audit-ledger"
            variant="text"
            color="inherit"
            sx={{
              fontWeight: 'bold',
              textTransform: 'none',
              height: 68,
              borderRadius: 0,
              px: 2.5,
              '&.active': {
                color: 'primary.main',
                borderBottom: '3px solid',
                borderColor: 'primary.main',
              },
            }}
          >
            Audit Ledger
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label="RAG + LLM Reasoning"
            sx={{ bgcolor: 'info.light', color: 'info.main', fontWeight: 'bold' }}
          />
          <Chip
            size="small"
            label="TGS v1.0"
            variant="outlined"
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
