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

  # `pay_with` lets the owner pay this one time from another MonCash account than the one
  # saved on the Koze account.
  def start_payment(account, pay_with = nil)
    number = pay_with.present? ? normalize_moncash(pay_with) : moncash_number(account)
    raise Error, 'Add a MonCash number to your account first' if number.blank?
    raise Error, 'Enter a valid MonCash number: +509 followed by 8 digits' unless number.match?(MONCASH_NUMBER)

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

# Team rules: at most 3 agents and 2 administrators per account (the owner counts as an
# administrator); an agent can be paused without being removed; each agent can have weekly
# working hours. State lives in account.custom_attributes:
#   koze_paused_user_ids: [user_id, ...]
#   koze_schedules: { "user_id" => { "timezone" => "America/Port-au-Prince",
#                                    "days" => { "mon" => { "start" => "08:00", "end" => "17:00" } } } }
# A day missing from "days" is a day off. Outside working hours, or while paused, an agent
# is set offline (so no conversation is assigned to them) and cannot send messages.
module KozeTeam
  MAX_AGENTS = 3
  MAX_ADMINISTRATORS = 2
  DEFAULT_TIMEZONE = 'America/Port-au-Prince'.freeze
  DAYS = %w[sun mon tue wed thu fri sat].freeze
  TIME = /\A([01]\d|2[0-3]):[0-5]\d\z/

  class Error < StandardError; end

  module_function

  # Raises when adding (or promoting) someone to this role would exceed the limit.
  def check_quota!(account, role, except_user_id: nil)
    role = role.to_s.presence || 'agent'
    scope = account.account_users.where(role: role)
    scope = scope.where.not(user_id: except_user_id) if except_user_id
    limit = role == 'administrator' ? MAX_ADMINISTRATORS : MAX_AGENTS
    return if scope.count < limit

    label = role == 'administrator' ? 'administrators' : 'agents'
    raise Error, "This account already has the maximum of #{limit} #{label}"
  end

  def paused_ids(account)
    Array(account.custom_attributes['koze_paused_user_ids']).map(&:to_i)
  end

  def paused?(account, user)
    paused_ids(account).include?(user.id)
  end

  def set_paused!(account, user, paused)
    ids = paused_ids(account) - [user.id]
    ids << user.id if paused
    account.update!(custom_attributes: account.custom_attributes.merge('koze_paused_user_ids' => ids))
    sync_availability!(account, account.account_users.find_by(user_id: user.id))
  end

  def schedules(account)
    account.custom_attributes['koze_schedules'] || {}
  end

  def schedule_for(account, user)
    schedules(account)[user.id.to_s]
  end

  # nil removes the schedule (the agent can then work at any time).
  def set_schedule!(account, user, schedule)
    all = schedules(account).dup
    if schedule.nil?
      all.delete(user.id.to_s)
    else
      all[user.id.to_s] = normalize_schedule(schedule)
    end
    account.update!(custom_attributes: account.custom_attributes.merge('koze_schedules' => all))
    sync_availability!(account, account.account_users.find_by(user_id: user.id))
  end

  def normalize_schedule(raw)
    timezone = raw['timezone'].presence || DEFAULT_TIMEZONE
    raise Error, 'Unknown timezone' unless ActiveSupport::TimeZone[timezone]

    days = (raw['days'] || {}).to_h.each_with_object({}) do |(day, hours), result|
      day = day.to_s
      raise Error, "Unknown day #{day}" unless DAYS.include?(day)

      start_at = hours['start'].to_s
      end_at = hours['end'].to_s
      raise Error, "Use HH:MM times for #{day}" unless start_at.match?(TIME) && end_at.match?(TIME)
      raise Error, "The end must be after the start on #{day}" unless end_at > start_at

      result[day] = { 'start' => start_at, 'end' => end_at }
    end
    { 'timezone' => timezone, 'days' => days }
  end

  # True when the user has no schedule, or `time` falls inside today's working hours.
  def working?(account, user, time = Time.current)
    schedule = schedule_for(account, user)
    return true if schedule.blank?

    local = time.in_time_zone(schedule['timezone'] || DEFAULT_TIMEZONE)
    hours = schedule.dig('days', DAYS[local.wday])
    return false if hours.blank?

    now = local.strftime('%H:%M')
    now >= hours['start'] && now < hours['end']
  end

  # Paused or outside working hours → offline; back inside hours → online. Users without a
  # schedule who are not paused keep whatever status they chose.
  def sync_availability!(account, account_user)
    return unless account_user

    user = account_user.user
    desired = if paused?(account, user) then 'offline'
              elsif schedule_for(account, user).present? then working?(account, user) ? 'online' : 'offline'
              end
    return if desired.nil? || account_user.availability == desired

    account_user.update!(availability: desired)
  end
end

# Enforces the team quota wherever agents are added (dashboard, API, the app).
module KozeAgentBuilderQuota
  def perform
    existing = User.from_email(email)
    unless existing && account.account_users.exists?(user_id: existing.id)
      begin
        KozeTeam.check_quota!(account, role)
      rescue KozeTeam::Error => e
        raise KozeQuotaExceeded, e.message
      end
    end
    super
  end
end

# Changing someone's role must respect the quota too.
module KozeAgentRoleQuota
  def update
    new_role = params.dig(:agent, :role)
    if new_role.present? && new_role.to_s != @agent.current_account_user&.role.to_s
      begin
        KozeTeam.check_quota!(Current.account, new_role, except_user_id: @agent.id)
      rescue KozeTeam::Error => e
        return render json: { message: e.message }, status: :unprocessable_entity
      end
    end
    super
  end
end

# A paused agent cannot use the account at all; the owner can never be paused. Hooked into
# the account access check that every account-scoped API request runs once.
module KozePausedAgentGuard
  private

  def account_accessible_for_user?(account)
    super
    return if performed? || @current_account_user.nil?
    return unless KozeTeam.paused?(account, current_user)

    render json: { message: 'Your access to this account is paused', error_code: 'koze_agent_paused' },
           status: :forbidden
  end
end

# Outside working hours an agent cannot send messages. Administrators are never limited.
module KozeWorkingHoursGuard
  def create
    account_user = Current.account.account_users.find_by(user_id: current_user.id)
    if account_user&.agent? && !KozeTeam.working?(Current.account, current_user)
      return render json: { message: 'Outside your working hours', error_code: 'koze_outside_schedule' },
                    status: :forbidden
    end

    super
  end
end

# Password resets without email: the owner gets a one-time 6-digit code for an agent, and
# the agent picks their own new password with it, so the owner never knows it. Only a digest
# of the code is kept, in user.custom_attributes['koze_password_reset'].
module KozePasswordReset
  TTL = 24.hours
  MAX_ATTEMPTS = 5

  class Error < StandardError; end

  module_function

  # Returns the code to hand to the agent; any earlier code stops working.
  def issue!(user)
    code = format('%06d', SecureRandom.random_number(1_000_000))
    user.update!(custom_attributes: (user.custom_attributes || {}).merge(
      'koze_password_reset' => { 'digest' => digest(user, code), 'expires_at' => (Time.current + TTL).iso8601,
                                 'attempts' => 0 }
    ))
    { code: code, expires_at: (Time.current + TTL).iso8601 }
  end

  # One message for every failure, so the endpoint does not reveal which emails exist.
  def redeem!(email, code, password)
    user = User.from_email(email.to_s.strip.downcase)
    reset = user&.custom_attributes&.dig('koze_password_reset')
    raise Error, 'Invalid or expired code' unless reset && Time.zone.parse(reset['expires_at']).future?
    raise Error, 'Invalid or expired code' if reset['attempts'].to_i >= MAX_ATTEMPTS

    unless ActiveSupport::SecurityUtils.secure_compare(reset['digest'], digest(user, code.to_s.strip))
      reset['attempts'] = reset['attempts'].to_i + 1
      user.update!(custom_attributes: user.custom_attributes.merge('koze_password_reset' => reset))
      raise Error, 'Invalid or expired code'
    end

    user.password = password
    user.password_confirmation = password
    user.custom_attributes = user.custom_attributes.except('koze_password_reset')
    user.save!
    user
  end

  def digest(user, code)
    Digest::SHA256.hexdigest("#{Rails.application.secret_key_base}:#{user.id}:#{code}")
  end
end

# Only the owner changes their own name or email; everyone else's are managed by the owner
# (koze_agents). Agents still update their phone number and password through the profile.
module KozeProfileGuard
  def update
    owner = current_user.account_users.exists?(role: :administrator, inviter_id: nil)
    params[:profile]&.delete(:name) unless owner
    params[:profile]&.delete(:email) unless owner
    params[:profile]&.delete(:display_name) unless owner
    super
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

# Routes for the Koze controllers (koze_agents_controller.rb, koze_payments_controller.rb,
# koze_catalog_controller.rb).
Rails.application.routes.prepend do
  namespace :api, defaults: { format: 'json' } do
    namespace :v1 do
      # Public: an agent sets a new password with the owner's reset code.
      resources :koze_password_resets, only: [:create]
      resources :accounts, only: [] do
        scope module: :accounts do
          resources :koze_agents, only: [:index, :create, :update] do
            member do
              post :pause
              post :resume
              put :schedule
              post :reset_password
            end
          end
          resources :koze_payments, only: [:index, :create] do
            member { post :confirm }
            collection { patch :moncash }
          end
          # Product catalog (koze_catalog_controller.rb).
          get 'koze_catalog', to: 'koze_catalog#show'
          post 'koze_catalog/items', to: 'koze_catalog#create'
          patch 'koze_catalog/items/:id', to: 'koze_catalog#update'
          delete 'koze_catalog/items/:id', to: 'koze_catalog#destroy'
        end
      end
    end
  end
end

# Catalog photos belong to the business account. ActiveStorage attachments need no migration.
module KozeCatalogImages
  extend ActiveSupport::Concern

  included do
    has_many_attached :koze_catalog_images
  end
end

Rails.application.config.to_prepare do
  Account.include(KozeCatalogImages) unless Account < KozeCatalogImages
  Account::BrandingEnrichmentJob.prepend(KozeKeepSignupAccountName)
  User.prepend(KozeAutoConfirmWithoutSmtp) unless User < KozeAutoConfirmWithoutSmtp
  Api::V1::AccountsController.prepend(KozeSignupMoncash) unless Api::V1::AccountsController < KozeSignupMoncash
  unless Api::V1::Accounts::InboxesController < KozeInboxPaywall
    Api::V1::Accounts::InboxesController.prepend(KozeInboxPaywall)
  end

  # Team rules (KozeTeam).
  unless defined?(KozeQuotaExceeded)
    # AgentsController answers AgentBuilder::LimitExceededError with a 402 and its message.
    Object.const_set(:KozeQuotaExceeded, Class.new(AgentBuilder::LimitExceededError) do
      def initialize(message)
        @koze_message = message
        super()
      end

      def message
        @koze_message
      end
    end)
  end
  # Every 5 minutes (cron below), applies working hours and pauses to agents' availability.
  unless defined?(KozeTeamAvailabilityJob)
    Object.const_set(:KozeTeamAvailabilityJob, Class.new(ApplicationJob) do
      queue_as :scheduled_jobs

      def perform
        Account.where("custom_attributes ? 'koze_schedules' OR custom_attributes ? 'koze_paused_user_ids'")
               .find_each do |account|
          account.account_users.includes(:user).find_each { |au| KozeTeam.sync_availability!(account, au) }
        end
      end
    end)
  end
  AgentBuilder.prepend(KozeAgentBuilderQuota) unless AgentBuilder < KozeAgentBuilderQuota
  Api::V1::ProfilesController.prepend(KozeProfileGuard) unless Api::V1::ProfilesController < KozeProfileGuard
  unless Api::V1::Accounts::AgentsController < KozeAgentRoleQuota
    Api::V1::Accounts::AgentsController.prepend(KozeAgentRoleQuota)
  end
  unless Api::V1::Accounts::BaseController < KozePausedAgentGuard
    Api::V1::Accounts::BaseController.prepend(KozePausedAgentGuard)
  end
  unless Api::V1::Accounts::Conversations::MessagesController < KozeWorkingHoursGuard
    Api::V1::Accounts::Conversations::MessagesController.prepend(KozeWorkingHoursGuard)
  end
end

# Schedule the availability sync in the Sidekiq process only.
Rails.application.config.after_initialize do
  if defined?(Sidekiq::Cron::Job) && Sidekiq.server?
    Sidekiq::Cron::Job.create(
      name: 'koze_team_availability', cron: '*/5 * * * *',
      class: 'KozeTeamAvailabilityJob', queue: 'scheduled_jobs'
    )
  end
end
