import { Directory, File, Paths } from 'expo-file-system';

import type { CatalogItem } from '@/types/Catalog';

// Koze: catalog photos live on the phone, under the app's documents folder, one folder per
// business account. Each photo is downloaded once; its file name carries the server photo id,
// so a replaced photo gets a new file and the old one is cleaned up.

const accountFolder = (accountId: number) =>
  new Directory(Paths.document, 'koze-catalog', String(accountId));

const photoFileName = (item: CatalogItem) => `${item.id}-${item.image_id}.jpg`;

export const ensureAccountFolder = (accountId: number): Directory => {
  const folder = accountFolder(accountId);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  return folder;
};

export const localPhotoFor = (accountId: number, item: CatalogItem): File | null => {
  if (!item.image_id) return null;
  return new File(accountFolder(accountId), photoFileName(item));
};

// Downloads the photo unless the phone already has it; returns the local file uri.
export const ensurePhoto = async (
  accountId: number,
  item: CatalogItem,
  serverUrl: string,
  headers: Record<string, string>,
): Promise<string | undefined> => {
  const target = localPhotoFor(accountId, item);
  if (!target || !item.image_url) return undefined;
  if (target.exists) return target.uri;

  ensureAccountFolder(accountId);
  const url = `${serverUrl.replace(/\/$/, '')}${item.image_url}`;
  const file = await File.downloadFileAsync(url, target, { headers, idempotent: true });
  return file.uri;
};

// After an administrator saves a product with a new photo, keep the picked photo as the local
// copy so this phone does not download what it just uploaded.
export const seedPhoto = (accountId: number, item: CatalogItem, pickedUri: string) => {
  const target = localPhotoFor(accountId, item);
  if (!target || target.exists) return;
  try {
    ensureAccountFolder(accountId);
    new File(pickedUri).copy(target);
  } catch {
    // Not fatal: the next sync downloads it.
  }
};

// Deletes photos of products that were removed or whose photo changed.
export const removeUnusedPhotos = (accountId: number, items: CatalogItem[]) => {
  const folder = accountFolder(accountId);
  if (!folder.exists) return;
  const keep = new Set(items.filter(item => item.image_id).map(photoFileName));
  for (const entry of folder.list()) {
    if (entry instanceof File && !keep.has(entry.name)) {
      try {
        entry.delete();
      } catch {
        // Ignore: a leftover file is harmless.
      }
    }
  }
};
