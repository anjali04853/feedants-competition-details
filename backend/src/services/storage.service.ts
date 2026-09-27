import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Local-disk storage for submission files. In production this would be swapped
 * for object storage (S3/GCS) with pre-signed upload URLs so large videos never
 * pass through the API servers. Only `storageKey` is persisted, so switching
 * backends does not require a data migration.
 */
export const uploadDir = path.resolve(env.UPLOAD_DIR);

export async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export function publicFileUrl(storageKey: string, requestBaseUrl: string): string {
  const base = env.PUBLIC_BASE_URL || requestBaseUrl;
  return `${base.replace(/\/$/, '')}/uploads/${encodeURIComponent(storageKey)}`;
}

export async function deleteFile(storageKey: string) {
  try {
    await fs.unlink(path.join(uploadDir, path.basename(storageKey)));
  } catch (err) {
    logger.warn({ err, storageKey }, 'Failed to delete stored file');
  }
}
