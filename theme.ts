import {Platform} from 'react-native';

export const THEME = {
  primary: '#0ea5e9', // Main blue
  secondary: '#38bdf8', // Lighter blue shade
  background: '#0f172a',
  darkBackground: '#020617',
  text: '#e2e8f0',
  darkText: '#f8fafc',
  card: '#1e293b',
  darkCard: '#0f172a',
  accent: '#06b6d4', // Changed to cyan blue from orange
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  gradient: ['#0ea5e9', '#38bdf8'],
  inputBackground: '#334155',
  inputBorder: '#475569',
  // Updated font families for a more modern Web3/SSI wallet look
  fontPrimary: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
  fontSecondary:
    Platform.OS === 'ios' ? 'Arial Rounded MT Bold' : 'sans-serif-light',
  fontMono: Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
  // Font weights
  fontWeightBold: '700',
  fontWeightMedium: '600',
  fontWeightRegular: '400',
};
