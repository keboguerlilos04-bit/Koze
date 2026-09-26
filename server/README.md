# Koze server

The Koze app talks to a self-hosted Chatwoot server. This folder holds its Docker setup.

```sh
cp .env.example .env   # then fill in passwords and SECRET_KEY_BASE
docker compose up -d
```

The server listens on `http://localhost:3000`. Expose it to phones with ngrok:

```sh
ngrok http --url=tint-moody-venture.ngrok-free.dev 3000
```

`FRONTEND_URL` in `.env` must match the public URL, and the app's
`EXPO_PUBLIC_KOZE_SERVER_HOST` must be the same host.
