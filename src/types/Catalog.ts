// Koze: one product of a business's catalog, as the server sends it.
export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  in_stock?: boolean;
  // Server photo (an ActiveStorage blob id and its path); absent when there is no photo.
  image_id?: number;
  image_url?: string;
  created_at?: number;
  updated_at?: number;
}

// The same product as stored on the phone, with its photo saved locally.
export interface LocalCatalogItem extends CatalogItem {
  localImageUri?: string;
}

export interface CatalogResponse {
  version: number;
  items?: CatalogItem[];
  unchanged?: boolean;
}

// Fields an administrator edits; `image` is a photo picked on the phone.
export interface CatalogItemInput {
  name: string;
  description: string;
  price: string;
  currency: string;
  in_stock: boolean;
  image?: { uri: string; fileName?: string; type?: string };
  remove_image?: boolean;
}
