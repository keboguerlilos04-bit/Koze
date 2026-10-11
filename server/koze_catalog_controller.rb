# Koze: a product catalog per business account, built by its administrators and kept on every
# agent's phone. The server only holds a small list (in the account's custom_attributes) and one
# compressed photo per product; phones download each photo once and then work from their own
# copy, asking the server only whether the catalog version changed.
#
# Mounted at app/controllers/api/v1/accounts/koze_catalog_controller.rb (see docker-compose.yaml);
# routes and the account's photo attachment are added in koze_overrides.rb.
#
# GET    /api/v1/accounts/:account_id/koze_catalog?version=N   everyone in the account
# POST   /api/v1/accounts/:account_id/koze_catalog/items        administrators (multipart)
# PATCH  /api/v1/accounts/:account_id/koze_catalog/items/:id    administrators (multipart)
# DELETE /api/v1/accounts/:account_id/koze_catalog/items/:id    administrators
class Api::V1::Accounts::KozeCatalogController < Api::V1::Accounts::BaseController
  CATALOG_KEY = 'koze_catalog'.freeze
  MAX_ITEMS = 300
  # The app shrinks photos to about 800px before upload; refuse anything much bigger.
  MAX_IMAGE_BYTES = 600.kilobytes
  IMAGE_TYPES = %w[image/jpeg image/png image/webp].freeze

  before_action :ensure_administrator, except: [:show]

  def show
    catalog = read_catalog
    # The phone already has this version: answer with almost nothing.
    if params[:version].present? && params[:version].to_i == catalog['version']
      render json: { version: catalog['version'], unchanged: true }
    else
      render json: catalog
    end
  end

  def create
    update_catalog do |items|
      raise KozeCatalogError, "Le catalogue est limité à #{MAX_ITEMS} produits" if items.size >= MAX_ITEMS

      item = { 'id' => SecureRandom.uuid, 'created_at' => Time.current.to_i }
      apply_fields(item)
      raise KozeCatalogError, 'Le nom du produit est obligatoire' if item['name'].blank?

      items << item
      item
    end
  end

  def update
    update_catalog do |items|
      item = items.find { |entry| entry['id'] == params[:id] }
      raise ActiveRecord::RecordNotFound unless item

      apply_fields(item)
      raise KozeCatalogError, 'Le nom du produit est obligatoire' if item['name'].blank?

      item
    end
  end

  def destroy
    update_catalog do |items|
      item = items.find { |entry| entry['id'] == params[:id] }
      raise ActiveRecord::RecordNotFound unless item

      purge_image(item['image_id'])
      items.delete(item)
      { 'id' => item['id'], 'deleted' => true }
    end
  end

  private

  class KozeCatalogError < StandardError; end

  def read_catalog
    stored = Current.account.custom_attributes&.dig(CATALOG_KEY) || {}
    { 'version' => stored['version'].to_i, 'items' => Array(stored['items']) }
  end

  # Changes the catalog under a row lock so two administrators cannot overwrite each other,
  # then bumps the version phones compare against.
  def update_catalog
    result = nil
    account = Current.account
    account.with_lock do
      catalog = read_catalog
      result = yield catalog['items']
      catalog['version'] += 1
      account.custom_attributes = (account.custom_attributes || {}).merge(CATALOG_KEY => catalog)
      account.save!
      result = result.merge('version' => catalog['version'])
    end
    render json: result
  rescue KozeCatalogError => e
    render json: { message: e.message }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotFound
    render json: { message: 'Produit introuvable' }, status: :not_found
  end

  def apply_fields(item)
    item['name'] = params[:name].to_s.strip.first(120) if params.key?(:name)
    item['description'] = params[:description].to_s.strip.first(1000) if params.key?(:description)
    item['price'] = params[:price].to_s.strip.first(40) if params.key?(:price)
    item['currency'] = params[:currency].to_s.strip.upcase.first(8) if params.key?(:currency)
    item['in_stock'] = ActiveModel::Type::Boolean.new.cast(params[:in_stock]) if params.key?(:in_stock)
    replace_image(item, params[:image]) if params[:image].present?
    if ActiveModel::Type::Boolean.new.cast(params[:remove_image])
      purge_image(item['image_id'])
      item.except!('image_id', 'image_url')
    end
    item['updated_at'] = Time.current.to_i
  end

  def replace_image(item, upload)
    raise KozeCatalogError, 'Format de photo non pris en charge' unless IMAGE_TYPES.include?(upload.content_type)
    raise KozeCatalogError, 'La photo est trop lourde (600 Ko maximum)' if upload.size > MAX_IMAGE_BYTES

    old_image_id = item['image_id']
    Current.account.koze_catalog_images.attach(
      io: upload.tempfile, filename: upload.original_filename.presence || 'produit.jpg',
      content_type: upload.content_type
    )
    blob = Current.account.koze_catalog_images.blobs.order(:created_at).last
    item['image_id'] = blob.id
    item['image_url'] = Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true)
    purge_image(old_image_id)
  end

  def purge_image(blob_id)
    return if blob_id.blank?

    Current.account.koze_catalog_images.find_by(blob_id: blob_id)&.purge_later
  end

  def ensure_administrator
    account_user = Current.account.account_users.find_by(user_id: current_user.id)
    return if account_user&.administrator?

    render json: { message: 'Seuls les administrateurs peuvent modifier le catalogue' }, status: :forbidden
  end
end
