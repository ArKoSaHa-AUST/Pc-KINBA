import { resizeImageToDataUrl } from '../utils/image';
import { createClient } from '../utils/supabase/client';

export interface UploadResult {
  url: string;
  provider: 'supabase' | 'imagekit';
  message?: string;
}

const supabase = createClient();

/**
 * Uploads a user photo to cloud storage:
 * 1. Optimizes the image for the web (max 512px JPEG).
 * 2. Attempts direct Supabase Storage upload.
 * 3. Falls back or routes to ImageKit Cloud CDN via backend API.
 * 4. Returns the hosted HTTPS CDN URL.
 */
export async function uploadUserAvatar(file: File, userId?: string): Promise<UploadResult> {
  // Step 1: Pre-process and optimize on client
  const dataUrl = await resizeImageToDataUrl(file, 512, 0.85);

  // Step 2: Try direct Supabase Storage if authenticated
  if (userId && !userId.startsWith('user_')) {
    try {
      const mimeMatch = dataUrl.match(/^data:image\/(\w+);base64,/);
      const ext = mimeMatch ? mimeMatch[1] : 'jpg';
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${ext}` });

      const fileName = `avatar_${userId}_${Date.now()}.${ext}`;

      const { data: sData, error: sErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${ext}`,
        });

      if (!sErr && sData) {
        const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        if (pubData && pubData.publicUrl) {
          return {
            url: pubData.publicUrl,
            provider: 'supabase',
            message: 'Uploaded to Supabase Storage',
          };
        }
      }
    } catch {
      // Fall through to ImageKit API upload
    }
  }

  // Step 3: Upload to ImageKit via backend upload endpoint
  const response = await fetch('/api/upload/avatar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: dataUrl,
      fileName: `avatar_${userId || 'user'}_${Date.now()}.jpg`,
      userId: userId || undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details || 'Failed to upload image to ImageKit.');
  }

  const result = await response.json();
  return {
    url: result.url,
    provider: result.provider || 'imagekit',
    message: result.message || 'Uploaded to ImageKit Cloud CDN',
  };
}
