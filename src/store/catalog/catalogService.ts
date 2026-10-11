import { apiService } from '@/services/APIService';
import type { CatalogItem, CatalogItemInput, CatalogResponse } from '@/types/Catalog';

// Koze: the catalog API (server/koze_catalog_controller.rb). Callers show the server's own
// error message with showAdminError.
const ownErrors = { skipErrorToast: true };

const toFormData = (input: CatalogItemInput): FormData => {
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('description', input.description);
  formData.append('price', input.price);
  formData.append('currency', input.currency);
  formData.append('in_stock', String(input.in_stock));
  if (input.image) {
    formData.append('image', {
      uri: input.image.uri,
      name: input.image.fileName || `produit-${Date.now()}.jpg`,
      type: input.image.type || 'image/jpeg',
    } as unknown as Blob);
  } else if (input.remove_image) {
    formData.append('remove_image', 'true');
  }
  return formData;
};

const multipart = { ...ownErrors, headers: { 'Content-Type': 'multipart/form-data' } };

export class CatalogService {
  // With the version the phone already has, the server answers { unchanged: true } only.
  static async fetch(knownVersion?: number): Promise<CatalogResponse> {
    const response = await apiService.get<CatalogResponse>('koze_catalog', {
      ...ownErrors,
      params: knownVersion ? { version: knownVersion } : undefined,
    });
    return response.data;
  }

  static async create(input: CatalogItemInput): Promise<CatalogItem> {
    const response = await apiService.post<CatalogItem>(
      'koze_catalog/items',
      toFormData(input),
      multipart,
    );
    return response.data;
  }

  static async update(id: string, input: CatalogItemInput): Promise<CatalogItem> {
    const response = await apiService.patch<CatalogItem>(
      `koze_catalog/items/${id}`,
      toFormData(input),
      multipart,
    );
    return response.data;
  }

  static async remove(id: string): Promise<void> {
    await apiService.delete(`koze_catalog/items/${id}`, ownErrors);
  }
}
