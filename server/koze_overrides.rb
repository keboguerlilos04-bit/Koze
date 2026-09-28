# Koze customisations for the Chatwoot server, mounted into the rails and sidekiq containers
# at config/initializers/koze_overrides.rb (see docker-compose.yaml).

# Signup runs Account::BrandingEnrichmentJob, which renames the account to the <title> of
# the website behind the signup email's domain. For a Gmail signup that makes the business
# "Gmail". Keep the company name the customer typed; the rest of the enrichment (logo,
# colors, socials) still applies.
module KozeKeepSignupAccountName
  def perform(account_id, email)
    typed_name = Account.find_by(id: account_id)&.name
    super
  ensure
    account = typed_name.present? && Account.find_by(id: account_id)
    account.update!(name: typed_name) if account && account.name != typed_name
  end
end

# TEMPORARY, until SMTP (Brevo) is configured: without email, a new user can never confirm
# their address, so they could not sign in again after logging out. While SMTP_ADDRESS is
# blank, new users are confirmed on creation. Setting SMTP_ADDRESS turns this off by itself.
# Downside: anyone can sign up with an email address they do not own.
module KozeAutoConfirmWithoutSmtp
  def self.prepended(base)
    base.before_create :koze_auto_confirm
  end

  private

  def koze_auto_confirm
    skip_confirmation! if ENV['SMTP_ADDRESS'].blank?
  end
end

# Route for Api::V1::Accounts::KozeAgentsController (koze_agents_controller.rb).
Rails.application.routes.prepend do
  namespace :api, defaults: { format: 'json' } do
    namespace :v1 do
      resources :accounts, only: [] do
        scope module: :accounts do
          resources :koze_agents, only: [:create]
        end
      end
    end
  end
end

Rails.application.config.to_prepare do
  Account::BrandingEnrichmentJob.prepend(KozeKeepSignupAccountName)
  User.prepend(KozeAutoConfirmWithoutSmtp) unless User < KozeAutoConfirmWithoutSmtp
end
