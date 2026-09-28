# Koze: lets the account owner add an agent with a temporary password from the mobile app.
# Chatwoot's own invitation emails the agent a link to pick a password, which cannot work
# while SMTP is not configured. Mounted at
# app/controllers/api/v1/accounts/koze_agents_controller.rb (see docker-compose.yaml);
# the route is added in koze_overrides.rb.
#
# POST /api/v1/accounts/:account_id/koze_agents { name, email, password }
class Api::V1::Accounts::KozeAgentsController < Api::V1::Accounts::BaseController
  before_action :ensure_account_owner

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
  rescue ActiveRecord::RecordInvalid => e
    render json: { message: e.record.errors.full_messages.join(', ') }, status: :unprocessable_entity
  rescue AgentBuilder::LimitExceededError => e
    render json: { message: e.message }, status: :payment_required
  end

  private

  # The owner is the administrator who created the account at signup, so nobody invited them.
  def ensure_account_owner
    account_user = Current.account.account_users.find_by(user_id: current_user.id)
    return if account_user&.administrator? && account_user.inviter_id.nil?

    render json: { message: 'Only the account owner can add agents from the app' }, status: :forbidden
  end
end
