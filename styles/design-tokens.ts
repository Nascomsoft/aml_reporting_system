/**
 * Design Token System for AML Reporting System
 * Provides centralized color, typography, spacing, and animation tokens
 * Optimized for Nigerian compliance workflows with modern minimalist aesthetic
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Neutrals - Dark mode optimized
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#0a0a0a',
  },

  // Brand Primary - Modern Teal (distinctive, signals action without aggression)
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Brand Accent - Warm Teal (for primary CTAs and highlights)
  accent: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  // Semantic - Alert/Danger (for escalations, SLA warnings)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Primary danger color
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Semantic - Warning (for SLA approaching, requires attention)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Semantic - Success (for completed cases, submitted STRs)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  // Semantic - Info (for informational alerts, SLA info)
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Dark mode specific
  dark: {
    bg: '#0a0a0a', // Main background
    bgSecondary: '#111827', // Cards, panels
    bgTertiary: '#1f2937', // Subtle backgrounds
    border: '#374151', // Borders
    text: '#e5e7eb', // Main text
    textSecondary: '#9ca3af', // Secondary text
    sidebar: '#0b1220', // Sidebar background
  },
};

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typography = {
  // Font families - Outfit (display, modern, geometric) + Lexend (body, accessible)
  fontFamily: {
    display: '"Outfit", "Segoe UI", system-ui, sans-serif',
    body: '"Lexend", "Segoe UI", system-ui, sans-serif',
    mono: '"IBM Plex Mono", "Courier New", monospace',
  },

  // Font sizes (1.125 modular scale)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.02em',
    wider: '0.05em',
  },
};

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  32: '8rem', // 128px
};

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  base: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem', // 24px
  full: '9999px',
};

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  dark: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
};

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animations = {
  // Transition durations (milliseconds)
  duration: {
    fastest: 50,
    faster: 100,
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
    slowest: 1000,
  },

  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const components = {
  // Button styles
  button: {
    height: {
      xs: '28px',
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      xs: '0.25rem 0.75rem',
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
  },

  // Form elements
  input: {
    height: '40px',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
  },

  // Card
  card: {
    padding: '1.5rem',
    borderRadius: '0.5rem',
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },

  // Badge
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
  },

  // Sidebar
  sidebar: {
    width: '220px',
    widthCollapsed: '60px',
  },

  // z-index scale
  zIndex: {
    hide: '-1',
    base: '0',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    backdrop: '1040',
    offcanvas: '1050',
    modal: '1060',
    popover: '1070',
    tooltip: '1080',
  },
};

// ============================================================================
// NIGERIAN LOCALIZATION HELPERS
// ============================================================================

export const localization = {
  currency: {
    symbol: '₦',
    code: 'NGN',
    decimalPlaces: 2,
  },
  date: {
    format: 'DD/MM/YYYY', // Nigerian standard
    locale: 'en-NG',
  },
  timezone: 'Africa/Lagos', // WAT (West Africa Time)
};

// ============================================================================
// EXPORT AS CSS VARIABLE NAMES
// ============================================================================

/**
 * Generates CSS variable names for use in CSS
 * Example: getCssVar('colors.primary.600') -> 'var(--color-primary-600)'
 */
export const getCssVar = (path: string): string => {
  const parts = path.split('.');
  return `var(--${parts.join('-').toLowerCase()})`;
};
