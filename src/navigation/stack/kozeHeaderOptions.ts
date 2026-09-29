import { KOZE_COLORS } from '@/theme/colors/koze';

// Koze: native header for pushed screens, on the tinted page background.
export const kozeHeaderOptions = (title: string) => ({
  headerShown: true,
  headerBackTitle: 'Back',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: KOZE_COLORS.canvas },
  headerTintColor: KOZE_COLORS.primary,
  headerTitleStyle: { color: KOZE_COLORS.navy },
  title,
});
