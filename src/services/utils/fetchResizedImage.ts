import { fromBlob, ImageFormat } from 'image-resize-compress';

interface FetchResizedImageOptions {
  quality?: number;
  width?: number | 'auto';
  height?: number | 'auto';
  format?: ImageFormat;
}

export async function fetchResizedImage(
  imageUrl: string,
  options: Partial<FetchResizedImageOptions> = {
    quality: 60,
    width: 800,
    height: 'auto',
    format: 'webp',
  },
): Promise<Blob> {
  const {
    quality = 60,
    width = 800,
    height = 'auto',
    format = 'webp',
  } = options;
  // Fetch image blob from URL
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const resizedBlob = await fromBlob(blob, quality, width, height, format);

  return resizedBlob;
}
