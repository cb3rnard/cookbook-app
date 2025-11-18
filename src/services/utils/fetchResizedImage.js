import { fromBlob } from 'image-resize-compress';

export async function fetchResizedImage(imageUrl, { quality = 60, width = 800, height = 'auto', format = 'webp' } = {}) {
    // Fetch image blob from URL
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const resizedBlob = await fromBlob(blob, quality, width, height, format);

    return resizedBlob;
}