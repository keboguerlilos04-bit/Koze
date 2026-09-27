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

## Signup from the app

The app's "Create an account" screen calls `POST /api/v1/accounts`. It needs
`ENABLE_ACCOUNT_SIGNUP=api_only`, so the server answers with auth headers and the
app logs the new user in. The value lives in the database once the server has
started, so on an existing install change it with:

```sh
docker compose exec rails bundle exec rails runner \
  'InstallationConfig.find_by(name: "ENABLE_ACCOUNT_SIGNUP").update!(value: "api_only"); GlobalConfig.clear_cache'
```

New users must confirm their email before they can sign in again, so SMTP must be
configured in `.env`.

`koze_overrides.rb` is mounted as a Rails initializer. It keeps the company name
typed at signup instead of renaming the account after the email domain's website
(e.g. "Gmail").
