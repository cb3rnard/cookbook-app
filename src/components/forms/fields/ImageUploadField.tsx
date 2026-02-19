import { Button, Flex } from '@radix-ui/themes';
import { ImageData } from '@src/types/entities';
import { fromBlob } from 'image-resize-compress';
import { useEffect, useId, useRef, useState } from 'react';
import { Image } from '../../../models/entities/Image';

export function ImageUploadField({
  image,
  imageUrl = '',
  onImageUploaded,
  onImageRemoved,
  processOptions = {},
  className = '',
}: {
  image?: Image | ImageData;
  imageUrl?: string;
  onImageUploaded: (image: Image) => void;
  onImageRemoved: () => void;
  processOptions?: {
    quality?: number; // 0-100
    width?: number | 'auto';
    height?: number | 'auto';
    format?: 'jpeg' | 'png' | 'webp';
  };
  className?: string;
}) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState(imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [isUploading, setIsUploading] = useState(false);

  // Types d'images acceptés
  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 20 * 1024 * 1024; // 20MB

  useEffect(() => {
    if (imageUrl) {
    } else if (image?.blob && image.blob instanceof Blob) {
      setUploadedImageUrl(URL.createObjectURL(image.blob));
    } else {
      setUploadedImageUrl('');
    }
  }, [imageUrl, image]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Validation du type de fichier
    if (!acceptedTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.');
      return;
    }

    // Validation de la taille
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximale: 20MB.');
      return;
    }

    setIsUploading(true);
    try {
      const optimizedFile = await handleProcessFile(file);
      // const newImageId = await StorageService.saveImage(optimizedFile);

      setUploadedImageUrl(URL.createObjectURL(optimizedFile));
      if (onImageUploaded) {
        const newImage = new Image({
          blob: optimizedFile,
          // name: file.name,
          size: optimizedFile.size,
          mimeType: optimizedFile.type,
        });
        onImageUploaded(newImage);
      }

      // Reset
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert("Erreur lors de la sauvegarde de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessFile = async (file: File): Promise<Blob> => {
    const quality = processOptions?.quality || 80; // For webp and jpeg formats
    const width = processOptions?.width || 'auto'; // Original width
    const height = processOptions?.height || 'auto'; // Original height
    const format = processOptions?.format || 'webp'; // Output format

    const resizedBlob = await fromBlob(file, quality, width, height, format);

    // const url = await blobToURL(resizedBlob);

    // Ici, vous pouvez ajouter des options de traitement si nécessaire
    // Par exemple, redimensionner l'image, appliquer des filtres, etc.
    return resizedBlob; // Retourne le fichier tel quel pour l'instant
  };

  const handleRemove = () => {
    onImageRemoved();
    setUploadedImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Flex className={className} gap="2" align="start">
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        hidden
        disabled={isUploading}
      />
      <Button asChild>
        <label htmlFor={fileInputId} style={{ cursor: 'pointer' }}>
          {uploadedImageUrl ? "Changer d'image" : 'Définir une image'}
        </label>
      </Button>
      {uploadedImageUrl && (
        <Button
          variant="surface"
          color="red"
          onClick={handleRemove}
          disabled={isUploading}
        >
          Supprimer
        </Button>
      )}
    </Flex>
  );
}
