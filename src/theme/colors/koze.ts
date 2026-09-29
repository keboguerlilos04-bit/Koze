// Koze brand palette. The teal comes from the Koze logo (src/assets/logo.svg).
// `blue` in light.ts is remapped to this scale, so every former Chatwoot-blue accent
// (buttons, links, selections) now uses Koze teal.
export const KOZE_COLORS = {
  primary: '#226476',
  primaryDark: '#1E4D58',
  navy: '#132742',
  // Page background: a light teal tint behind white cards.
  canvas: '#F2F7F8',
  card: '#FFFFFF',
  // Soft outline for cards and inputs at rest.
  line: '#DCE8EB',
  muted: '#5E7178',
};

// Teal scale replacing Radix blue, lightest to darkest.
export const KOZE_TEAL = {
  50: '#F2F8F9',
  100: '#E4F1F3',
  200: '#C9E2E7',
  300: '#A6CFD8',
  400: '#78B3C1',
  500: '#4E95A6',
  600: '#357E90',
  700: '#226476',
  800: '#1E4D58',
  900: '#183E48',
  950: '#132742',
};

// Same scale with alpha on top of white, replacing Radix blueA.
export const KOZE_TEAL_ALPHA = {
  50: 'rgba(34, 100, 118, 0.04)',
  100: 'rgba(34, 100, 118, 0.07)',
  200: 'rgba(34, 100, 118, 0.12)',
  300: 'rgba(34, 100, 118, 0.19)',
  400: 'rgba(34, 100, 118, 0.28)',
  500: 'rgba(34, 100, 118, 0.41)',
  600: 'rgba(34, 100, 118, 0.63)',
  700: 'rgba(34, 100, 118, 1)',
  800: 'rgba(30, 77, 88, 0.97)',
  900: 'rgba(24, 62, 72, 0.96)',
  950: 'rgba(19, 39, 66, 0.93)',
};
