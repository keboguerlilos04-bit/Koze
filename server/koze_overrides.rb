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

Rails.application.config.to_prepare do
  Account::BrandingEnrichmentJob.prepend(KozeKeepSignupAccountName)
end
