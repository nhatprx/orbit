import { apiRequest, seg } from './httpClient';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

export function validateChatImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return 'Only JPEG, PNG, WebP, and GIF images are supported.';
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return 'Image size must be under 10 MB.';
  }
  return null;
}

export async function uploadChatImage(channelId: string, file: File): Promise<UploadedChatImage> {
  const err = validateChatImageFile(file);
  if (err) throw new Error(err);

  const presign = await apiRequest<ChatImagePresignResponse>(
    'POST',
    `/api/v1/chat/channels/${seg(channelId)}/images/presign`,
    {
      body: {
        filename: file.name || 'image.png',
        contentType: file.type,
        fileSize: file.size,
      },
    }
  );

  const uploadRes = await fetch(presign.uploadUrl, {
    method: presign.method || 'PUT',
    headers: { 'Content-Type': presign.contentType || file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload image. Please try again.');
  }

  return {
    attachmentName: file.name || 'image.png',
    attachmentUrl: presign.attachmentUrl,
  };
}
