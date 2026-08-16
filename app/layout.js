'use client';

import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { RoleProvider } from '../components/RoleProvider';
import { RoleShell } from '../components/RoleShell';
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
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
