import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { ImageDisplay } from '../../ui/ImageDisplay';
import styles from './ImagePreviewField.module.css';
import { ImageUploadField } from './ImageUploadField';

export function ImagePreviewField({ image, imageUrl = null, title = "Image", text = null, onUpload, onRemove }) {
  const handleImageRemove = () => {
    if (image) {
      // handleUpdateRecipe({uuid: formData.uuid, imageId: null});
      onRemove?.();
    }
  };

  const handleImageUploaded = (image) => {
    onUpload?.(image);
  };

  return (
    <Card variant="surface">
      <Flex gap="4" align="center">
        <div className={styles.preview}>
          {imageUrl ? (
            <img
              className="image--cover"
              src={imageUrl}
              alt="Aperçu de l'image"
              width="120"
              height="120"
            />
          ) : (
            <ImageDisplay
              image={image}
              className={styles.image}
              isCover={true}
              width="120"
              height="120"
            />
          )}
        </div>

        <Flex direction="column" gap="2">
          {title && (
            <Heading as="h4" size="4">
              {title}
            </Heading>
          )}
          {text &&
            <Text as="p">
              {text}
            </Text>
          }
          <ImageUploadField
            image={image}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemove}
            processOptions={{
              quality: 60,
              width: '800',
              // height: '350',
              format: 'webp'
            }}
          />
        </Flex>
      </Flex>
    </Card>
  );
};