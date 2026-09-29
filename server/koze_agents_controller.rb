# Koze: the account owner manages the team from the mobile app. Mounted at
# app/controllers/api/v1/accounts/koze_agents_controller.rb (see docker-compose.yaml); routes
# and the team rules (KozeTeam: quotas, pause, working hours) are in koze_overrides.rb.
#
# GET   /api/v1/accounts/:account_id/koze_agents              team, statuses, limits
# POST  /api/v1/accounts/:account_id/koze_agents              { name, email, password }
# PATCH /api/v1/accounts/:account_id/koze_agents/:id          { name, email, phone_number, password }
# POST  /api/v1/accounts/:account_id/koze_agents/:id/pause    (and /resume)
# PUT   /api/v1/accounts/:account_id/koze_agents/:id/schedule { schedule: { timezone, days } | null }
#
# Chatwoot's own invitation emails the agent a link to pick a password, which cannot work
# while SMTP is not configured, so the owner sets a temporary password instead.
class Api::V1::Accounts::KozeAgentsController < Api::V1::Accounts::BaseController
  before_action :ensure_account_owner
  before_action :fetch_member, only: [:update, :pause, :resume, :schedule]

  rescue_from KozeTeam::Error do |e|
    render json: { message: e.message }, status: :unprocessable_entity
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { message: e.record.errors.full_messages.join(', ') }, status: :unprocessable_entity
  end

  def index
    account = Current.account
    members = account.account_users.includes(:user).order(:created_at)
    render json: {
      limits: { agents: KozeTeam::MAX_AGENTS, administrators: KozeTeam::MAX_ADMINISTRATORS },
      agents: members.map { |account_user| member_json(account, account_user) }
    }
  end

  def create
    email = params.require(:email).to_s.strip.downcase
    existing_user = User.from_email(email)

    ActiveRecord::Base.transaction do
      @agent = AgentBuilder.new(
        email: email,
        name: params[:name].to_s.strip,
        role: 'agent',
        inviter: current_user,
        account: Current.account
      ).perform
      # Someone who already has a Koze account keeps their own password.
      @agent.update!(password: params[:password], password_confirmation: params[:password]) unless existing_user
    end

    render json: {
      id: @agent.id, name: @agent.name, email: @agent.email, role: 'agent',
      confirmed: @agent.confirmed?, existing_user: existing_user.present?
    }
  rescue AgentBuilder::LimitExceededError => e
    render json: { message: e.message }, status: :unprocessable_entity
  end

  # The owner edits anyone's contact details and password, including their own.
  def update
    user = @member.user
    user.name = params[:name].to_s.strip if params.key?(:name)
    if params[:email].present? && params[:email].to_s.strip.downcase != user.email
      # No confirmation email can be sent yet, so the new address applies right away.
      user.skip_reconfirmation!
      user.email = params[:email].to_s.strip.downcase
    end
    if params.key?(:phone_number)
      user.custom_attributes = (user.custom_attributes || {}).merge('phone_number' => params[:phone_number].to_s.strip)
    end
    if params[:password].present?
      user.password = params[:password]
      user.password_confirmation = params[:password]
    end
    user.save!
    render json: member_json(Current.account, @member.reload)
  end

  def pause
    raise KozeTeam::Error, 'The account owner cannot be paused' if owner?(@member)

    KozeTeam.set_paused!(Current.account, @member.user, true)
    render json: member_json(Current.account.reload, @member.reload)
  end

  def resume
    KozeTeam.set_paused!(Current.account, @member.user, false)
    render json: member_json(Current.account.reload, @member.reload)
  end

  def schedule
    raw = params[:schedule].present? ? params.require(:schedule).permit(:timezone, days: {}).to_h : nil
    KozeTeam.set_schedule!(Current.account, @member.user, raw)
    render json: member_json(Current.account.reload, @member.reload)
  end

  private

  def member_json(account, account_user)
    user = account_user.user
    {
      id: user.id, name: user.name, email: user.email,
      phone_number: user.custom_attributes&.dig('phone_number'),
      role: account_user.role, is_owner: owner?(account_user), confirmed: user.confirmed?,
      availability_status: user.availability_status,
      paused: KozeTeam.paused?(account, user),
      schedule: KozeTeam.schedule_for(account, user),
      working_now: KozeTeam.working?(account, user)
    }
  end

  def owner?(account_user)
    account_user.administrator? && account_user.inviter_id.nil?
  end

  def fetch_member
    @member = Current.account.account_users.find_by!(user_id: params[:id])
  end

  # The owner is the administrator who created the account at signup, so nobody invited them.
  def ensure_account_owner
    account_user = Current.account.account_users.find_by(user_id: current_user.id)
    return if account_user && owner?(account_user)

    render json: { message: 'Only the account owner can manage the team from the app' }, status: :forbidden
  end
end
