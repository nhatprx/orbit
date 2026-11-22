import { apiRequest, seg } from './httpClient';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|sh|msi|dmg|app|js|mjs|html|htm|svg)$/i;

interface ChatImagePresignResponse {
  key: string;
  uploadUrl: string;
  attachmentUrl: string;
  method: string;
  contentType: string;
  expiresAt: string;
}

export interface UploadedChatImage {
  attachmentName: string;
  attachmentUrl: string;
}

export function isChatImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase());
}

export function validateChatImageFile(file: File): string | null {
  if (!isChatImageFile(file)) {
    return 'Only JPEG, PNG, WebP, and GIF images are supported.';
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return 'Image size must be under 10 MB.';
  }
  return null;
}

export function validateChatFile(file: File): string | null {
  if (isChatImageFile(file)) return validateChatImageFile(file);
  if (BLOCKED_EXTENSIONS.test(file.name)) {
    return `File type not allowed: ${file.name}`;
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return 'File size must be under 25 MB.';
  }
  return null;
}

export async function uploadChatFile(channelId: string, file: File): Promise<UploadedChatImage> {
  const err = validateChatFile(file);
  if (err) throw new Error(err);

  const contentType = file.type || 'application/octet-stream';
  const presign = await apiRequest<ChatImagePresignResponse>(
    'POST',
    `/api/v1/chat/channels/${seg(channelId)}/images/presign`,
    {
      body: {
        filename: file.name || 'attachment',
        contentType,
        fileSize: file.size,
      },
    }
  );

  const uploadRes = await fetch(presign.uploadUrl, {
    method: presign.method || 'PUT',
    headers: { 'Content-Type': presign.contentType || contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload ${file.name || 'file'}. Please try again.`);
  }

  return {
    attachmentName: file.name || 'attachment',
    attachmentUrl: presign.attachmentUrl,
  };
}

export async function uploadChatImage(channelId: string, file: File): Promise<UploadedChatImage> {
  const err = validateChatImageFile(file);
  if (err) throw new Error(err);
  return uploadChatFile(channelId, file);
}
