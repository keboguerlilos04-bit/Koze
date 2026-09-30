# Koze: an agent sets a new password with the one-time code their account owner generated
# (KozePasswordReset in koze_overrides.rb). Public, since the agent cannot sign in yet.
# Mounted at app/controllers/api/v1/koze_password_resets_controller.rb (docker-compose.yaml).
#
# POST /api/v1/koze_password_resets { email, code, password }
class Api::V1::KozePasswordResetsController < Api::BaseController
  skip_before_action :authenticate_user!, raise: false

  def create
    KozePasswordReset.redeem!(params[:email], params[:code], params[:password])
    head :ok
  rescue KozePasswordReset::Error => e
    render json: { message: e.message }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { message: e.record.errors.full_messages.join(', ') }, status: :unprocessable_entity
  end
end
