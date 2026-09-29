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

## MonCash inbox billing

Each new inbox costs 1,500 HTG for 30 days. `koze_payments_controller.rb` adds:

- `GET /api/v1/accounts/:id/koze_payments`: price, MonCash number, unused paid credits
- `POST /api/v1/accounts/:id/koze_payments` then `POST .../koze_payments/:payment_id/confirm`
- `PATCH /api/v1/accounts/:id/koze_payments/moncash`: set the MonCash number

Signup requires `moncash_number` (+509 and 8 digits). Creating an inbox without an
unused paid credit is refused with 402, so the paywall cannot be skipped through the API.
Payments are **simulated** (`KozeBilling::SimulatedGateway` in `koze_overrides.rb`, every
payment succeeds). With MonCash merchant keys, replace it with a gateway that calls the
MonCash REST API (CreatePayment for the redirect URL, RetrieveOrderPayment for the status).
