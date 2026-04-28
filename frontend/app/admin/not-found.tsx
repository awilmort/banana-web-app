'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { SearchOff, ArrowBack, Dashboard } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function AdminNotFound() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: '#F1F4F8',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          p: { xs: 4, sm: 6 },
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 84,
            height: 84,
            borderRadius: '50%',
            bgcolor: 'rgba(246,196,98,0.12)',
            mx: 'auto',
            mb: 3,
          }}
        >
          <SearchOff sx={{ fontSize: 42, color: '#F6C462' }} />
        </Box>

        <Typography
          variant="h2"
          sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-1px', mb: 1 }}
        >
          404
        </Typography>

        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1F2937', mb: 1.5 }}>
          {t('admin.notFound.title', 'Page Not Found')}
        </Typography>

        <Typography variant="body1" sx={{ color: '#6B7280', mb: 4, lineHeight: 1.7 }}>
          {t(
            'admin.notFound.description',
            "The page you're looking for doesn't exist or you may not have access to it.",
          )}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.back()}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              borderColor: '#D1D5DB',
              color: '#374151',
              '&:hover': { borderColor: '#9CA3AF', bgcolor: 'rgba(0,0,0,0.02)' },
            }}
          >
            {t('admin.notFound.goBack', 'Go Back')}
          </Button>

          <Button
            variant="contained"
            startIcon={<Dashboard />}
            onClick={() => router.push('/admin')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#F6C462',
              color: '#1F2937',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#EDAF3C', boxShadow: 'none' },
            }}
          >
            {t('admin.notFound.dashboard', 'Go to Dashboard')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}