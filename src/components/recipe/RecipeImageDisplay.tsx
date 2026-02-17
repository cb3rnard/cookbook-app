import { ReloadIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { EventBus } from '@src//services/utils/EventBus';
import { config } from '@src/config/config';
import { useApi } from '@src/contexts/ApiContext';
import { useData } from '@src/contexts/DataContext';
import { getErrorMessage } from '@src/services/utils/GlobalUtils';
import { ImageData } from '@src/types/entities';
import { useEffect, useState } from 'react';
import { ImageDisplay } from '../ui/ImageDisplay';
import styles from './RecipeImageDisplay.module.css';

export interface RecipeImageDisplayProps {
  imageUuid?: string;
  recipeUuid?: string;
  image?: ImageData | null;
  isCover?: boolean;
  width?: number | string;
  height?: number | string;
  showSyncButton?: boolean;
  onImageSynced?: (image: ImageData) => void;
  onImageRemoved?: () => void;
  alt?: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Composant pour afficher l'image d'une recette avec gestion des images manquantes
 * et possibilité de synchronisation
 */
export function RecipeImageDisplay({
  imageUuid = '',
  recipeUuid = '',
  image = null,
  alt,
  className = '',
  imageClassName = '',
  isCover = false,
  width,
  height,
  onImageSynced,
  onImageRemoved,
  showSyncButton = true,
}: RecipeImageDisplayProps) {
  const { connection } = useApi();
  const { getRepository } = useData();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncNotFound, setSyncNotFound] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const [eventBus] = useState(() => EventBus.getInstance());

  const recipeRepository = getRepository(config.ENDPOINTS_CONSTANTS.RECIPES);

  // Mettre à jour l'image si elle change dans les props
  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  // Vérifier si l'image est manquante (imageUuid existe mais pas de blob)
  const isMissingImage = imageUuid && (!currentImage || !currentImage.blob);
  // Vérifier si la sync est possible
  const canSync = connection.authenticated && connection.online;

  const handleSyncImage = async () => {
    setSyncNotFound(false);

    if (!canSync || syncing) return;

    setSyncing(true);
    setSyncError('');

    try {
      // Appeler directement retrieveRemoteImage pour synchroniser depuis le serveur
      const syncedImage = await recipeRepository.retrieveRemoteImage(imageUuid);

      if (syncedImage?.blob) {
        // Mettre à jour l'état local
        setCurrentImage(syncedImage);

        // Notifier le parent si callback fourni
        onImageSynced?.(syncedImage);
        eventBus.emit('image:synced', { image: syncedImage });
      } else {
        setSyncNotFound(true);
        setSyncError('Image introuvable sur le serveur');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Erreur lors de la synchronisation de l'image",
      );
      console.error('Failed to sync image:', error);
      setSyncError(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleImageRemove = async () => {
    if (!imageUuid || !recipeUuid) return;

    try {
      await recipeRepository.removeImage(recipeUuid, imageUuid, true);
      setCurrentImage(null);
      setSyncNotFound(false);
      onImageRemoved?.();
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Erreur lors de la suppression de l'image",
      );
      setSyncError(errorMessage);
    }
  };

  // Si l'image existe et a un blob, affichage normal
  if (currentImage?.blob) {
    return (
      <ImageDisplay
        image={currentImage}
        alt={alt}
        className={className}
        imageClassName={imageClassName}
        isCover={isCover}
        width={width}
        height={height}
      />
    );
  }

  // Image manquante
  if (isMissingImage) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        className={`${styles.missingImage} ${className}`}
        style={{ width, height }}
      >
        <Box className={styles.icon}>📷</Box>
        <Text size="2" color="gray" align="center">
          Image manquante
        </Text>
        {syncError && (
          <Text size="1" color="red" align="center">
            {syncError}
          </Text>
        )}
        <Flex gap="2" align="center">
          {showSyncButton && (
            <Button
              size="2"
              variant="soft"
              onClick={handleSyncImage}
              disabled={!canSync || syncing}
              title={
                !connection.authenticated
                  ? 'Connexion requise'
                  : !connection.online
                    ? 'Serveur indisponible'
                    : "Synchroniser l'image"
              }
            >
              <ReloadIcon className={syncing ? styles.spinning : ''} />
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </Button>
          )}
          {syncNotFound && recipeUuid && (
            <Button
              size="2"
              variant="solid"
              color="red"
              onClick={handleImageRemove}
            >
              Supprimer
            </Button>
          )}
        </Flex>
      </Flex>
    );
  }

  // Pas d'image du tout
  return (
    <Flex
      align="center"
      justify="center"
      className={`${styles.noImage} ${className}`}
      style={{ width, height }}
    >
      <Text size="2" color="gray">
        Aucune image
      </Text>
    </Flex>
  );
}
