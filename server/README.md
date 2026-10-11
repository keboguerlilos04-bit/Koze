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

## Team rules

`KozeTeam` in `koze_overrides.rb`: at most 3 agents and 2 administrators per account
(the owner counts as an administrator), checked wherever someone is added or promoted.
The owner can pause an agent (every account API call then answers 403
`koze_agent_paused`) and give agents weekly working hours: outside them the agent cannot
send messages (403 `koze_outside_schedule`) and `KozeTeamAvailabilityJob` (Sidekiq cron,
every 5 minutes) sets them offline so no conversation is assigned to them.
`koze_agents_controller.rb` also lets the owner edit anyone's name, email, phone and
password.

## Password reset codes

The owner never sets anyone's password. Adding a member, or `POST .../koze_agents/:id/reset_password`,
returns a one-time 6-digit code (24 h, 5 attempts). The member then calls the public
`POST /api/v1/koze_password_resets { email, code, password }`
(`koze_password_resets_controller.rb`) from the login screen. Only a digest of the code is
stored. `KozeProfileGuard` stops anyone but an account owner from changing their own name or
email through `PUT /api/v1/profile`; members can still change their phone number there.

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
## Product catalog

`koze_catalog_controller.rb` is mounted as a controller and adds, for the business account:

- `GET /api/v1/accounts/:account_id/koze_catalog?version=N` (everyone in the account). When the
  phone already has version `N`, the answer is only `{ version, unchanged: true }`.
- `POST`, `PATCH`, `DELETE .../koze_catalog/items[/:id]` (administrators). Fields: `name`,
  `price`, `currency`, `description`, `in_stock`, `image` (multipart), `remove_image`.

The product list lives in the account's `custom_attributes` (no migration). Each photo is one
ActiveStorage file attached to the account, shrunk to about 800px by the app and refused above
600 KB. Phones download each photo once and keep it; replacing or deleting a product deletes
its old photo on the server.

After pulling these files, restart the server so it loads the new controller:

```sh
docker compose up -d --force-recreate rails sidekiq
```

## Profile photos

Agents and administrators set their own photo from Settings. The app uses Chatwoot's own
`PUT /api/v1/profile` (`profile[avatar]`) and `DELETE /api/v1/profile/avatar`; photos are
shrunk to 512px on the phone first. Nothing to configure on the server.

## Hosting on a VPS

`vps-setup.sh` installs everything on a fresh Ubuntu 24.04 server (tested target: AWS EC2
m7i-flex.large, 8 GB): a 2 GB swap file, Docker, the Koze files in `/opt/koze`, a `.env` with
new random passwords, the database, and Caddy for HTTPS (`docker-compose.vps.yaml`,
`Caddyfile`). Without a domain it uses `<ip-with-dashes>.sslip.io`, which points at the server's
IP, so Let's Encrypt can issue a certificate. Give a public IP that does not change (an AWS
Elastic IP) before running it.

From the `koze-mobile` folder on Windows (with a `koze` host in `~/.ssh/config`):

```sh
scp -r server koze:koze-server
ssh koze "sed -i 's/\r$//' koze-server/vps-setup.sh && sudo nohup bash koze-server/vps-setup.sh < /dev/null > koze-setup.log 2>&1 &"
ssh koze "tail -n 20 koze-setup.log"
```

It runs on the server even if the SSH connection drops; the log ends with `KOZE IS READY`.
Then build the app with `EXPO_PUBLIC_KOZE_SERVER_HOST` set to that domain (the `preview`
profile in `eas.json`). Run `sudo docker compose ...` commands from `/opt/koze`.
