import type { AuthUser } from '../types/auth.types';
import { apiRequest } from './workspace/httpClient';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface AvatarPresignResponse {
  key: string;
  uploadUrl: string;
  method: string;
  expiresAt: string;
  contentType: string;
}

export interface IAvatarService {
  validateAvatarFile(file: File): string | null;
  uploadAvatar(file: File, signal?: AbortSignal): Promise<AuthUser>;
  removeAvatar(signal?: AbortSignal): Promise<AuthUser>;
  fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser>;
}

export function validateAvatarFile(file: File): string | null {
  const mime = file.type.trim().toLowerCase();
  if (!ALLOWED_AVATAR_TYPES.has(mime)) {
    return 'Avatar must be a JPEG, PNG, WebP, or GIF image.';
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return 'Avatar file size must be between 1 byte and 5 MB.';
  }
  return null;
}

class HttpAvatarService implements IAvatarService {
  validateAvatarFile(file: File): string | null {
    return validateAvatarFile(file);
  }

  async uploadAvatar(file: File, signal?: AbortSignal): Promise<AuthUser> {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const presigned = await apiRequest<AvatarPresignResponse>(
      'POST',
      '/api/v1/auth/profile/avatar/presign',
      {
        body: {
          filename: file.name,
          contentType: file.type.trim().toLowerCase(),
          fileSize: file.size,
        },
        signal,
      }
    );

    let uploadRes: Response;
    try {
      uploadRes = await fetch(presigned.uploadUrl, {
        method: presigned.method || 'PUT',
        headers: { 'Content-Type': presigned.contentType },
        body: file,
        signal,
      });
    } catch {
      throw new Error('Failed to upload image to AWS S3. Check bucket CORS and network connection.');
    }

    if (!uploadRes.ok) {
      throw new Error(`AWS S3 upload failed (${uploadRes.status}).`);
    }

    return apiRequest<AuthUser>('PUT', '/api/v1/auth/profile/avatar', {
      body: { key: presigned.key },
      signal,
    });
  }

  removeAvatar(signal?: AbortSignal): Promise<AuthUser> {
    return apiRequest<AuthUser>('DELETE', '/api/v1/auth/profile/avatar', { signal });
  }

  fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
    return apiRequest<AuthUser>('GET', '/api/v1/auth/me', { signal });
  }
}

export const avatarService: IAvatarService = new HttpAvatarService();
