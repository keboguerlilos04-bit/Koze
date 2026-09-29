import { tailwind } from '@/theme';
import { KOZE_COLORS, KOZE_TEAL } from '@/theme/colors/koze';

describe('Koze theme', () => {
  it('turns the former Chatwoot blue accents into Koze teal', () => {
    expect(tailwind.color('bg-blue-800')).toBe(KOZE_TEAL[800]);
    expect(tailwind.color('text-blue-700')).toBe(KOZE_TEAL[700]);
  });

  it('exposes the Koze brand colors as classes', () => {
    expect(tailwind.color('bg-koze-canvas')).toBe(KOZE_COLORS.canvas);
    expect(tailwind.color('text-koze-navy')).toBe(KOZE_COLORS.navy);
    expect(tailwind.color('border-koze-line')).toBe(KOZE_COLORS.line);
    expect(tailwind.color('text-koze-muted')).toBe(KOZE_COLORS.muted);
  });

  it('uses the logo teal as the primary color', () => {
    expect(KOZE_COLORS.primary).toBe('#226476');
    expect(KOZE_COLORS.navy).toBe('#132742');
  });
});
