import { createTheme } from '@mui/material/styles';

// Banana Ranch Villages — Admin / PMS palette
// Dark gray primary + warm amber accent
const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#374151', // Dark gray
      light: '#4B5563',
      dark: '#1F2937',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F6C462', // Banana amber / gold
      light: '#FAD98A',
      dark: '#C99A30',
      contrastText: '#1A1A1A',
    },
    background: {
      default: '#F1F4F8',
      paper: '#FFFFFF',
    },
    info: {
      main: '#0EA5E9',
      light: '#38BDF8',
      dark: '#0284C7',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    success: {
      main: '#16A34A',
      light: '#4ADE80',
      dark: '#15803D',
    },
    error: {
      main: '#DC2626',
      light: '#F87171',
      dark: '#B91C1C',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
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
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            boxShadow: '0 2px 8px rgba(55,65,81,0.25)',
            '&:hover': { boxShadow: '0 4px 14px rgba(55,65,81,0.35)' },
          },
        },
      ],
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(17,24,39,0.06), 0 2px 12px rgba(17,24,39,0.04)',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(17,24,39,0.10)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 4px rgba(17,24,39,0.06), 0 2px 12px rgba(17,24,39,0.04)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#6B7280',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
});

export default adminTheme;
