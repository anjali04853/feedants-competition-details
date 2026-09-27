import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ApiErrorCode } from './types';
import { recordServerTime } from './serverClock';

/**
 * Resolution order:
 *  1. EXPO_PUBLIC_API_URL
 *  2. The machine running Metro (works for Expo Go on a device on the same Wi-Fi)
 *  3. localhost (web / iOS simulator)
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.10:8081"
  const host = hostUri?.split(':')[0];
  if (Platform.OS !== 'web' && host && host !== 'localhost') return `http://${host}:4000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export const API_BASE_URL = resolveBaseUrl();
const API_PREFIX = `${API_BASE_URL}/api/v1`;
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

interface Envelope<T> {
  data: T;
  meta?: { serverTime?: string };
}

async function parseResponse<T>(res: Response, startedAt: number): Promise<T> {
  const body = await res.json().catch(() => null);
  if (body?.meta?.serverTime) recordServerTime(body.meta.serverTime, startedAt, Date.now());

  if (!res.ok) {
    const code: ApiErrorCode = body?.error?.code ?? 'INTERNAL_ERROR';
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, code, body?.error?.message ?? 'Request failed');
  }
  return (body as Envelope<T>).data;
}

export async function request<T>(
  path: string,
  { method = 'GET', body, query }: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const url = `${API_PREFIX}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      // Public responses carry Cache-Control for CDNs; the app itself must always see
      // fresh seat counts (React Query is our client cache).
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return await parseResponse<T>(res, startedAt);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Multipart upload with progress reporting. fetch() cannot report upload
 * progress, so this uses XMLHttpRequest, which React Native supports natively.
 */
export function uploadFile<T>(
  path: string,
  file: { uri: string; name: string; type: string; webFile?: File },
  onProgress?: (fraction: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    if (file.webFile) form.append('file', file.webFile);
    // React Native's FormData accepts { uri, name, type } descriptors for local files.
    else form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    const startedAt = Date.now();
    xhr.open('POST', `${API_PREFIX}${path}`);
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      const res = new Response(xhr.responseText, { status: xhr.status, headers: { 'Content-Type': 'application/json' } });
      parseResponse<T>(res, startedAt).then(resolve, reject);
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Upload failed'));
    xhr.ontimeout = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Upload timed out'));
    xhr.send(form);
  });
}
