import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { fromBlob } from 'image-resize-compress';
import { useEffect, useId, useRef, useState } from 'react';
import { Image } from '../../../models/entities/Image';

export function ImageUploadField({ image, onImageUploaded, onImageRemoved, processOptions = null, className = '' }) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputId = useId();

  // Types d'images acceptés
  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  useEffect(() => {
    if (image) {

      if (image.url) {
        setUploadedImage(image.url);
      } else if (image.blob && image.blob instanceof Blob) {
        setUploadedImage(URL.createObjectURL(image.blob));
      }
    } else {
      setUploadedImage(null);
    }
  }, [image]);

  const handleFileSelect = async (event) => {
    let file = event.target.files[0];
    if (!file) return;

    // Validation du type de fichier
    if (!acceptedTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.');
      return;
    }

    // Validation de la taille
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximale: 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const optimizedFile = await handleProcessFile(file);
      // const newImageId = await StorageService.saveImage(optimizedFile);

      setUploadedImage(URL.createObjectURL(optimizedFile));
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
      alert('Erreur lors de la sauvegarde de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessFile = async (file) => {
    const quality = processOptions?.quality || 80; // For webp and jpeg formats
    const width = processOptions?.width || 'auto'; // Original width
    const height = processOptions?.height || 'auto'; // Original height
    const format = processOptions?.format || 'webp'; // Output format

    const resizedBlob = await fromBlob(file, quality, width, height, format);

    // const url = await blobToURL(resizedBlob);

    // Ici, vous pouvez ajouter des options de traitement si nécessaire
    // Par exemple, redimensionner l'image, appliquer des filtres, etc.
    return resizedBlob; // Retourne le fichier tel quel pour l'instant
  }


  const handleRemove = () => {
    onImageRemoved();
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Flex className={className} gap="2" align="start">
      <TextField.Root
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        hidden
        className="input--unstyled"
      >
        <TextField.Slot px="0" htmlFor={fileInputRef.current?.id}>
          <Button asChild>
            <Text as="label" htmlFor={fileInputId} cursor="pointer">
              {uploadedImage ? "Changer d'image" : "Définir une image"
              }
            </Text>
          </Button>
        </TextField.Slot>
      </TextField.Root>
      {uploadedImage && (
        <Button variant="surface" color="danger" onClick={handleRemove} >Supprimer</Button>
      )}
    </Flex>
  );
};