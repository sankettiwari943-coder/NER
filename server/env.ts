/**
 * Environment configuration and validation.
 *
 * Requirements:
 * - AI Studio development workflow requires: DATABASE_URL, AUTH_SECRET, MAP_PROVIDER_KEY.
 * - Deployment-only credentials such as BLOB_READ_WRITE_TOKEN are optional in development and MUST NOT block startup.
 * - WEATHER_PROVIDER_KEY is optional (keyless high-res Open-Meteo feed used when absent).
 * - Secrets must never be leaked to client-side code.
 */

import dotenv from 'dotenv';
dotenv.config();

export interface AppEnvConfig {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  MAP_PROVIDER_KEY: string;
  GEMINI_API_KEY?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  WEATHER_PROVIDER_KEY?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  isVercel: boolean;
  isVercelProduction: boolean;
}

export function validateEnvironment(): AppEnvConfig {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const nodeEnv = (process.env.NODE_ENV as any) || 'development';
  const isVercelProduction = isVercel && (process.env.VERCEL_ENV === 'production' || nodeEnv === 'production');

  const missingRequired: string[] = [];

  // Required credentials for the current AI Studio development workflow
  const DATABASE_URL = process.env.DATABASE_URL || '';
  if (!DATABASE_URL) {
    missingRequired.push('DATABASE_URL');
  }

  const AUTH_SECRET = process.env.AUTH_SECRET || '';
  if (!AUTH_SECRET) {
    missingRequired.push('AUTH_SECRET');
  }

  const MAP_PROVIDER_KEY = process.env.MAP_PROVIDER_KEY || '';
  if (!MAP_PROVIDER_KEY) {
    missingRequired.push('MAP_PROVIDER_KEY');
  }

  if (missingRequired.length > 0) {
    const errorMsg = `[CRITICAL CONFIG ERROR] Missing required environment variables: ${missingRequired.join(
      ', '
    )}. Please ensure these are set in Settings or .env.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Optional deployment-only credentials: must NOT crash or block development
  const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!BLOB_READ_WRITE_TOKEN) {
    if (isVercelProduction) {
      console.warn(
        '[VERCEL PRODUCTION WARNING] BLOB_READ_WRITE_TOKEN is not configured. Vercel Blob cloud storage will not be available in production.'
      );
    } else {
      console.log(
        '[ENV AUDIT] BLOB_READ_WRITE_TOKEN is absent in development. Using labeled local development media fallback (non-blocking).'
      );
    }
  } else {
    console.log('[ENV AUDIT] BLOB_READ_WRITE_TOKEN detected. Vercel Blob cloud storage active.');
  }

  const WEATHER_PROVIDER_KEY = process.env.WEATHER_PROVIDER_KEY;
  if (!WEATHER_PROVIDER_KEY) {
    console.log(
      '[ENV AUDIT] WEATHER_PROVIDER_KEY is absent. Using keyless real-time Open-Meteo precipitation provider (non-blocking).'
    );
  }

  return {
    DATABASE_URL,
    AUTH_SECRET,
    MAP_PROVIDER_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    BLOB_READ_WRITE_TOKEN,
    WEATHER_PROVIDER_KEY,
    NODE_ENV: nodeEnv,
    isVercel,
    isVercelProduction,
  };
}
