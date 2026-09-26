export const URL_TYPE = 'https://';

export const API_URL = 'api/v1/';

// Koze: set EXPO_PUBLIC_KOZE_HELP_URL to show the "Read docs" item in Settings.
export const HELP_URL = process.env.EXPO_PUBLIC_KOZE_HELP_URL || '';

export const GRAVATAR_URL = 'https://www.gravatar.com/avatar/';

export const REPLY_POLICY = {
  FACEBOOK: 'https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/',
  TWILIO_WHATSAPP:
    'https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates#sending-non-template-messages-within-a-24-hour-session',
};

// Koze: the app always connects to this Chatwoot server; users cannot change it.
// Set EXPO_PUBLIC_KOZE_SERVER_HOST in .env (host only, no protocol) to point at another server.
export const KOZE_SERVER_HOST =
  process.env.EXPO_PUBLIC_KOZE_SERVER_HOST || 'tint-moody-venture.ngrok-free.dev';
export const KOZE_INSTALLATION_URL = `${URL_TYPE}${KOZE_SERVER_HOST}/`;
export const KOZE_WEB_SOCKET_URL = `wss://${KOZE_SERVER_HOST}/cable`;
