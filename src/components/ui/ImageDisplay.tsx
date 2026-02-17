import { Flex } from '@radix-ui/themes';
import { Image } from '@src/models/entities/Image';
import { ImageData } from '@src/types/entities';
import { useEffect, useState } from 'react';
import styles from './ImageDisplay.module.css';

export interface ImageDisplayProps {
  image?: Image | ImageData;
  imageUrl?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  width?: number | string;
  height?: number | string;
  isCover?: boolean;
}

export function ImageDisplay({
  image,
  imageUrl = '',
  alt = 'Image',
  className = '',
  imageClassName = '',
  width = '',
  height = '',
  isCover = false,
}: ImageDisplayProps) {
  const [displayImageUrl, setDisplayImageUrl] = useState(imageUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  className = `${styles.container} ${className}`;
  imageClassName = `${styles.image} ${imageClassName || (isCover ? 'image--cover' : '')}`;

  useEffect(() => {
    if (imageUrl || !image || !image?.uuid) {
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        // PROTECTION: Vérifier que image.blob existe et est un Blob
        if (image?.blob && image.blob instanceof Blob) {
          setDisplayImageUrl(URL.createObjectURL(image.blob));
        } else {
          throw new Error('Image blob is missing or invalid');
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup: libérer l'URL de l'objet quand l'imageUuid change
    return () => {
      if (displayImageUrl && displayImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(displayImageUrl);
      }
    };
  }, [image]); // Dépendance sur imageUuid au lieu de image complet

  const props = {};

  return (
    <Flex
      align="center"
      justify="center"
      {...props}
      style={{ width, height }}
      className={className}
    >
      {loading && 'Chargement...'}
      {error && '❌ Erreur de chargement'}
      {displayImageUrl ? (
        <img
          src={displayImageUrl}
          alt={alt}
          style={{ width, height }}
          className={imageClassName}
          onError={() => setError(true)}
        />
      ) : (
        '📷 Aucune image'
      )}
    </Flex>
  );
}
