'use client';

import React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E3D2A',
      light: '#2E8B50',
      dark: '#0F4A28',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F6C462',
      light: '#FAD98A',
      dark: '#C99A30',
      contrastText: '#1A1A1A',
    },
    background: { default: '#FBF3E4', paper: '#FBF3E4' },
    info: { main: '#0EA5E9', light: '#38BDF8', dark: '#0284C7' },
    warning: { main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
    success: { main: '#16A34A', light: '#4ADE80', dark: '#15803D' },
    error: { main: '#DC2626', light: '#F87171', dark: '#B91C1C' },
    text: { primary: '#111827', secondary: '#6B7280' },
    divider: 'rgba(17,24,39,0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '3rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.6 },
    body1: { fontSize: '1rem', lineHeight: 1.7 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, padding: '8px 20px' },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            boxShadow: '0 2px 8px rgba(27,107,58,0.25)',
            '&:hover': { boxShadow: '0 4px 14px rgba(27,107,58,0.35)' },
          },
        },
      ],
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
