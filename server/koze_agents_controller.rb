# Koze: the account owner manages the team from the mobile app. Mounted at
# app/controllers/api/v1/accounts/koze_agents_controller.rb (see docker-compose.yaml); routes
# and the team rules (KozeTeam: quotas, pause, working hours) are in koze_overrides.rb.
#
# GET   /api/v1/accounts/:account_id/koze_agents              team, statuses, limits
# POST  /api/v1/accounts/:account_id/koze_agents              { name, email, role }
# PATCH /api/v1/accounts/:account_id/koze_agents/:id          { name, email, phone_number, gender }
# POST  /api/v1/accounts/:account_id/koze_agents/:id/reset_password
# POST  /api/v1/accounts/:account_id/koze_agents/:id/pause    (and /resume)
# PUT   /api/v1/accounts/:account_id/koze_agents/:id/schedule { schedule: { timezone, days } | null }
#
# Chatwoot's own invitation emails the agent a link to pick a password, which cannot work
# while SMTP is not configured. Instead the owner gets a one-time reset code to hand over,
# and the member picks their own password with it: the owner never knows it.
class Api::V1::Accounts::KozeAgentsController < Api::V1::Accounts::BaseController
  before_action :ensure_account_owner
  before_action :fetch_member, only: [:update, :pause, :resume, :schedule, :reset_password]

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
    role = params[:role].to_s == 'administrator' ? 'administrator' : 'agent'
    existing_user = User.from_email(email)
    reset = nil

    ActiveRecord::Base.transaction do
      @agent = AgentBuilder.new(
        email: email,
        name: params[:name].to_s.strip,
        role: role,
        inviter: current_user,
        account: Current.account
      ).perform
      # A new member picks their password with a reset code; someone who already has a Koze
      # account keeps their own password.
      reset = KozePasswordReset.issue!(@agent) unless existing_user
    end

    render json: {
      id: @agent.id, name: @agent.name, email: @agent.email, role: role,
      confirmed: @agent.confirmed?, existing_user: existing_user.present?,
      reset_code: reset&.dig(:code), reset_expires_at: reset&.dig(:expires_at)
    }
  rescue AgentBuilder::LimitExceededError => e
    render json: { message: e.message }, status: :unprocessable_entity
  end

  # The owner edits anyone's name, email, phone and gender, including their own. Passwords
  # are never set here: see reset_password.
  def update
    user = @member.user
    user.name = params[:name].to_s.strip if params.key?(:name)
    if params[:email].present? && params[:email].to_s.strip.downcase != user.email
      # No confirmation email can be sent yet, so the new address applies right away.
      user.skip_reconfirmation!
      user.email = params[:email].to_s.strip.downcase
    end
    extra = {}
    extra['phone_number'] = params[:phone_number].to_s.strip if params.key?(:phone_number)
    if params.key?(:gender)
      gender = params[:gender].to_s
      raise KozeTeam::Error, 'Unknown gender' unless ['', 'female', 'male', 'other'].include?(gender)

      extra['gender'] = gender
    end
    user.custom_attributes = (user.custom_attributes || {}).merge(extra) if extra.any?
    user.save!
    render json: member_json(Current.account, @member.reload)
  end

  # A one-time code (24 h) the member uses to choose a new password on the login screen.
  def reset_password
    raise KozeTeam::Error, 'Use "Change my password" for your own account' if @member.user_id == current_user.id

    render json: KozePasswordReset.issue!(@member.user)
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
      gender: user.custom_attributes&.dig('gender'),
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
