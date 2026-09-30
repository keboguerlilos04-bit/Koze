# Koze: MonCash payments that unlock inbox creation (1,500 HTG per inbox, 30 days).
# Mounted at app/controllers/api/v1/accounts/koze_payments_controller.rb (docker-compose.yaml);
# routes in koze_overrides.rb.
#
# GET  /api/v1/accounts/:account_id/koze_payments             billing summary
# POST /api/v1/accounts/:account_id/koze_payments             start a payment
#                                                              { moncash_number } to pay from another number
# POST /api/v1/accounts/:account_id/koze_payments/:id/confirm  check it with the gateway
# PATCH /api/v1/accounts/:account_id/koze_payments/moncash     set the MonCash number
#
# Payments live in account.custom_attributes['koze_payments'] (KozeBilling in
# koze_overrides.rb). Only the account owner may pay.
class Api::V1::Accounts::KozePaymentsController < Api::V1::Accounts::BaseController
  before_action :ensure_account_owner

  def index
    render json: summary
  end

  def create
    payment = KozeBilling.start_payment(Current.account, params[:moncash_number])
    render json: { payment: payment, **summary }
  rescue KozeBilling::Error => e
    render json: { message: e.message }, status: :unprocessable_entity
  end

  def confirm
    payment = KozeBilling.confirm_payment(Current.account, params[:id])
    render json: { payment: payment, **summary }
  rescue KozeBilling::Error => e
    render json: { message: e.message }, status: :unprocessable_entity
  end

  # Accounts created before the MonCash field existed add their number here.
  def moncash
    number = KozeBilling.normalize_moncash(params[:moncash_number])
    unless number.match?(KozeBilling::MONCASH_NUMBER)
      return render json: { message: 'Enter a valid MonCash number: +509 followed by 8 digits' },
                    status: :unprocessable_entity
    end

    account = Current.account
    account.update!(custom_attributes: account.custom_attributes.merge('moncash_number' => number))
    render json: summary
  end

  private

  def summary
    account = Current.account.reload
    {
      moncash_number: KozeBilling.moncash_number(account),
      price: KozeBilling::PRICE_HTG,
      currency: 'HTG',
      period_days: KozeBilling::PERIOD_DAYS,
      gateway: KozeBilling.gateway_name,
      available_credits: KozeBilling.available_credits(account).size
    }
  end

  # Same rule as KozeAgentsController: the administrator nobody invited.
  def ensure_account_owner
    account_user = Current.account.account_users.find_by(user_id: current_user.id)
    return if account_user&.administrator? && account_user.inviter_id.nil?

    render json: { message: 'Only the account owner can pay for inboxes' }, status: :forbidden
  end
end
