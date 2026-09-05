/**
 * Storage Engine for Citizen Incident Photos & Attachments.
 *
 * Supports:
 * 1. Vercel Blob Storage when BLOB_READ_WRITE_TOKEN is configured (Production).
 * 2. Clearly labeled Local Disk Storage Fallback in development when BLOB_READ_WRITE_TOKEN is absent.
 *
 * Never claims that the development fallback is persistent cloud storage.
 * In production deployment, requires BLOB_READ_WRITE_TOKEN when persistent storage is needed.
 */

import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

export interface StorageUploadResult {
  url: string;
  storageKey: string;
  provider: 'VERCEL_BLOB' | 'LOCAL_DEV_FALLBACK';
  isPersistentCloud: boolean;
  label: string;
  warning?: string;
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function getStorageStatus() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const isProduction = process.env.NODE_ENV === 'production';

  if (token) {
    return {
      name: 'Vercel Blob Object Storage',
      status: 'ONLINE (Vercel Blob)',
      provider: 'VERCEL_BLOB' as const,
      isPersistentCloud: true,
      storagePath: 'https://blob.vercel-storage.com',
      note: 'Production persistent cloud object storage active.',
    };
  }

  return {
    name: 'Local Development Fallback Storage',
    status: isProduction && isVercel ? 'UNCONFIGURED_IN_PROD' : 'DEVELOPMENT_FALLBACK (Local Disk)',
    provider: 'LOCAL_DEV_FALLBACK' as const,
    isPersistentCloud: false,
    storagePath: '/api/v1/media',
    note: 'Development fallback active. Files stored locally; this is NOT persistent cloud storage.',
  };
}

export async function storeIncidentPhoto(
  file: Express.Multer.File
): Promise<StorageUploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. If Vercel Blob Token is configured, upload to Vercel Blob
  if (token) {
    try {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const blobPath = `landslide-reports/rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

      const fileBuffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!fileBuffer) {
        throw new Error('No file buffer or path available for Blob upload.');
      }

      const blob = await put(blobPath, fileBuffer, {
        access: 'public',
        token,
        contentType: file.mimetype || 'image/jpeg',
      });

      return {
        url: blob.url,
        storageKey: blobPath,
        provider: 'VERCEL_BLOB',
        isPersistentCloud: true,
        label: 'Vercel Blob Object Storage (Production Cloud Persistence)',
      };
    } catch (err: any) {
      console.warn('[STORAGE] Vercel Blob upload failed, utilizing local development fallback:', err?.message || err);
      // If we are in local development, allow fallback
      if (!isProduction || !isVercel) {
        return createLocalFallback(file);
      }
      throw new Error(`Vercel Blob upload failed in production: ${err?.message || err}`);
    }
  }

  // 2. If in Vercel production deployment and BLOB_READ_WRITE_TOKEN is missing
  if (isProduction && isVercel) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required in Vercel production deployment for persistent cloud photo storage. Please add BLOB_READ_WRITE_TOKEN to your Vercel project environment variables.'
    );
  }

  // 3. In AI Studio / local development: clearly labeled fallback
  return createLocalFallback(file);
}

function createLocalFallback(file: Express.Multer.File): StorageUploadResult {
  // Ensure file is in UPLOADS_DIR
  let filename = file.filename;
  if (!filename) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    filename = `rep_img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    if (file.buffer) {
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
    }
  }

  return {
    url: `/api/v1/media/${filename}`,
    storageKey: filename,
    provider: 'LOCAL_DEV_FALLBACK',
    isPersistentCloud: false,
    label: 'Development Local Disk Fallback (Non-cloud transient storage)',
    warning: 'Stored using local development fallback. Not saved to persistent cloud storage.',
  };
}
