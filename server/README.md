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

New users must confirm their email before they can sign in again. Until SMTP is
configured in `.env` (`SMTP_ADDRESS` blank), `koze_overrides.rb` confirms new users
automatically; setting `SMTP_ADDRESS` turns that off.

`koze_overrides.rb` is mounted as a Rails initializer. It keeps the company name
typed at signup instead of renaming the account after the email domain's website
(e.g. "Gmail").

## Agents added from the app

`koze_agents_controller.rb` is mounted as a controller and adds
`POST /api/v1/accounts/:account_id/koze_agents { name, email, password }`. Only the
account owner (the administrator nobody invited) may call it. It creates the agent
with the temporary password the owner chose, so no invitation email is needed.
