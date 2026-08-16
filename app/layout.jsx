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
