/** Design tokens sampled from the Feedants Competition Details design. */
export const colors = {
  primary: '#11706C',
  primaryDark: '#0B5754',
  primaryText: '#127A75',
  primarySoft: '#E6F3F2',
  primaryTint: '#F1F8F7',
  mint: '#E9F7EF',
  text: '#1B1D21',
  textSecondary: '#4B5563',
  textMuted: '#7B8289',
  border: '#E9ECEF',
  borderStrong: '#DCE1E4',
  chip: '#F2F4F5',
  surface: '#FFFFFF',
  background: '#FFFFFF',
  track: '#DDEBEA',
  warning: '#B45309',
  warningSoft: '#FEF3E2',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  success: '#127A4A',
  gold: '#F2A310',
  silver: '#9AA3AD',
  bronze: '#E4701E',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
