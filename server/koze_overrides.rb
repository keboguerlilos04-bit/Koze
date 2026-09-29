# Koze customisations for the Chatwoot server, mounted into the rails and sidekiq containers
# at config/initializers/koze_overrides.rb (see docker-compose.yaml).

# Signup runs Account::BrandingEnrichmentJob, which renames the account to the <title> of
# the website behind the signup email's domain. For a Gmail signup that makes the business
# "Gmail". Keep the company name the customer typed; the rest of the enrichment (logo,
# colors, socials) still applies.
# The job also saves the whole custom_attributes hash it loaded, so it would drop the
# MonCash number written at signup meanwhile: put that back too.
module KozeKeepSignupAccountName
  def perform(account_id, email)
    typed_name = Account.find_by(id: account_id)&.name
    super
  ensure
    account = typed_name.present? && Account.find_by(id: account_id)
    if account
      account.name = typed_name
      number = KozeBilling.moncash_number(account)
      account.custom_attributes = account.custom_attributes.merge('moncash_number' => number) if number
      account.save! if account.changed?
    end
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

# Inbox billing: every new inbox costs 1,500 HTG for 30 days, paid with MonCash.
# Payments are kept in account.custom_attributes['koze_payments']; a successful payment is a
# credit that the next inbox creation uses up.
module KozeBilling
  PRICE_HTG = 1500
  PERIOD_DAYS = 30
  MONCASH_NUMBER = /\A\+509\d{8}\z/

  class Error < StandardError; end

  # Stand-in for MonCash while there are no merchant keys: every payment succeeds.
  # A real gateway exposes the same three methods, backed by the MonCash REST API
  # (CreatePayment gives the redirect URL, RetrieveOrderPayment the status).
  module SimulatedGateway
    module_function

    def name
      'simulated'
    end

    def create(order_id:, amount:)
      { reference: "SIM-#{order_id}", redirect_url: nil, amount: amount }
    end

    def status(reference:)
      reference.present? ? 'SUCCESS' : 'FAILED'
    end
  end

  module_function

  def gateway
    SimulatedGateway
  end

  def gateway_name
    gateway.name
  end

  # Accepts "+509 3712-3456", "50937123456" or "37123456"; returns "+50937123456".
  def normalize_moncash(raw)
    digits = raw.to_s.gsub(/\D/, '')
    digits = "509#{digits}" if digits.length == 8
    "+#{digits}"
  end

  # Kept on the account; the owner's copy is the fallback if the account's was lost.
  def moncash_number(account)
    account.custom_attributes['moncash_number'].presence ||
      account.account_users.find_by(role: :administrator, inviter_id: nil)&.user&.custom_attributes&.dig('moncash_number')
  end

  def payments(account)
    Array(account.custom_attributes['koze_payments']).deep_dup
  end

  def available_credits(account)
    payments(account).select { |p| p['status'] == 'success' && p['inbox_id'].nil? }
  end

  def start_payment(account)
    number = moncash_number(account)
    raise Error, 'Add a MonCash number to your account first' if number.blank?

    account.with_lock do
      id = SecureRandom.uuid
      order = gateway.create(order_id: id, amount: PRICE_HTG)
      payment = {
        'id' => id, 'amount' => PRICE_HTG, 'currency' => 'HTG', 'moncash_number' => number,
        'gateway' => gateway_name, 'reference' => order[:reference],
        'redirect_url' => order[:redirect_url], 'status' => 'pending',
        'created_at' => Time.current.iso8601
      }
      save_payments(account, payments(account) + [payment])
      payment
    end
  end

  def confirm_payment(account, payment_id)
    account.with_lock do
      list = payments(account)
      payment = list.find { |p| p['id'] == payment_id.to_s }
      raise Error, 'Payment not found' unless payment

      if payment['status'] == 'pending'
        case gateway.status(reference: payment['reference'])
        when 'SUCCESS'
          payment['status'] = 'success'
          payment['paid_at'] = Time.current.iso8601
        when 'FAILED'
          payment['status'] = 'failed'
        end
        save_payments(account, list)
      end
      payment
    end
  end

  # Marks one credit as used by this inbox. Call inside account.with_lock.
  def consume_credit!(account, inbox)
    list = payments(account)
    credit = list.find { |p| p['status'] == 'success' && p['inbox_id'].nil? }
    return false unless credit

    now = Time.current
    credit['inbox_id'] = inbox.id
    credit['used_at'] = now.iso8601
    credit['expires_at'] = (now + PERIOD_DAYS.days).iso8601
    save_payments(account, list)
    true
  end

  def save_payments(account, list)
    account.update!(custom_attributes: account.custom_attributes.merge('koze_payments' => list))
  end
end

# Signup from the app must include the owner's MonCash number, kept on the account (billing)
# and on the user. Only unauthenticated signups are checked: an existing user adding an
# account from the dashboard is not asked again.
module KozeSignupMoncash
  def create
    return super if current_user.present?

    number = KozeBilling.normalize_moncash(params[:moncash_number])
    unless number.match?(KozeBilling::MONCASH_NUMBER)
      return render json: { message: 'Enter a valid MonCash number: +509 followed by 8 digits' },
                    status: :unprocessable_entity
    end

    super
    return unless @account&.persisted?

    @account.update!(custom_attributes: @account.custom_attributes.merge('moncash_number' => number))
    @user&.update!(custom_attributes: (@user.custom_attributes || {}).merge('moncash_number' => number))
  end
end

# Creating an inbox needs an unused MonCash payment credit, checked here so that the API
# cannot be called around the app's paywall.
module KozeInboxPaywall
  def create
    account = Current.account
    account.with_lock do
      if KozeBilling.available_credits(account).empty?
        return render json: {
          message: "Pay #{KozeBilling::PRICE_HTG} HTG with MonCash to add an inbox",
          error_code: 'koze_payment_required'
        }, status: :payment_required
      end

      super
      KozeBilling.consume_credit!(account, @inbox) if @inbox&.persisted?
    end
  end
end

# Routes for the Koze controllers (koze_agents_controller.rb, koze_payments_controller.rb).
Rails.application.routes.prepend do
  namespace :api, defaults: { format: 'json' } do
    namespace :v1 do
      resources :accounts, only: [] do
        scope module: :accounts do
          resources :koze_agents, only: [:create]
          resources :koze_payments, only: [:index, :create] do
            member { post :confirm }
            collection { patch :moncash }
          end
        end
      end
    end
  end
end

Rails.application.config.to_prepare do
  Account::BrandingEnrichmentJob.prepend(KozeKeepSignupAccountName)
  User.prepend(KozeAutoConfirmWithoutSmtp) unless User < KozeAutoConfirmWithoutSmtp
  Api::V1::AccountsController.prepend(KozeSignupMoncash) unless Api::V1::AccountsController < KozeSignupMoncash
  unless Api::V1::Accounts::InboxesController < KozeInboxPaywall
    Api::V1::Accounts::InboxesController.prepend(KozeInboxPaywall)
  end
end
