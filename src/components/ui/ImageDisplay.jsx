import { Flex } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import styles from './ImageDisplay.module.css';

export function ImageDisplay({ image = null, alt = 'Image', className = '', imageClassName = null, width, height }, isCover = false) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  className = `${styles.container} ${className}`;
  imageClassName = `${styles.image} ${imageClassName || (isCover ? 'image--cover' : '')}`;

  // Mémorise l'identifiant de l'image pour éviter les rechargements inutiles
  const imageUuid = useMemo(() => {
    return image?.uuid || image?.id || null;
  }, [image?.uuid, image?.id]);

  useEffect(() => {
    if (!image || !imageUuid) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        // PROTECTION: Vérifier que image.blob existe et est un Blob
        if (image.blob && image.blob instanceof Blob) {
          setImageUrl(URL.createObjectURL(image.blob));
        } else if (image.url) {
          // Fallback si tu as une URL directe
          setImageUrl(image.url);
        } else {
          console.error('Image sans blob ni URL valide:', image);
          setError(true);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup: libérer l'URL de l'objet quand l'imageUuid change
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUuid]); // Dépendance sur imageUuid au lieu de image complet

  const props = {
  };

  return (
    <Flex align="center" justify="center" {...props} style={{ width, height }} className={className}>
      {loading && 'Chargement...'}
      {error && '❌ Erreur de chargement'}
      {image ? (
        <img
          src={imageUrl}
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
};