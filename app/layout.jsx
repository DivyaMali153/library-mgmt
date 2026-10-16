'use client';

import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { RoleProvider } from '../components/RoleProvider';
import AppContent from '../components/AppContent';
import './globals.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f766e' },
    secondary: { main: '#b45309' },
    background: { default: '#f4f7fb', paper: '#ffffff' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    h5: { fontWeight: 700, fontSize: '1.45rem', lineHeight: 1.25 },
    h6: { fontWeight: 700, fontSize: '1.08rem', lineHeight: 1.3 },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e4ebe7',
          borderRadius: 12,
          boxShadow: '0 5px 20px rgba(24, 51, 45, 0.045)',
          backgroundImage: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': { paddingBottom: 24 },
          '@media (max-width:600px)': { padding: 16, '&:last-child': { paddingBottom: 16 } },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          fontWeight: 650,
          textTransform: 'none',
          transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        },
        contained: { boxShadow: '0 2px 5px rgba(15, 118, 110, 0.14)' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8, backgroundColor: '#fff' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f6f9f7',
          color: '#60736b',
          borderBottom: '1px solid #e5ece8',
          fontSize: '0.72rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        },
        body: { borderBottom: '1px solid #edf1ee' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#f8fbf9' } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#f4f7fb',
          WebkitTapHighlightColor: 'transparent',
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f766e" />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RoleProvider>
            <AppContent>{children}</AppContent>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
