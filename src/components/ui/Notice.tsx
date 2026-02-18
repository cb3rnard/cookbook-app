import {
  CheckCircledIcon,
  Cross1Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { Box, Button, Callout, Flex, Heading } from '@radix-ui/themes';
import { BoxProps } from '@radix-ui/themes/src/components/box.tsx';
import { RootProps } from '@radix-ui/themes/src/components/callout.tsx';
import { NoticeType } from '@src/config/config';
import { useState } from 'react';
import styles from './Notice.module.css';

// Enumération des types de notice
export interface NoticeProps {
  id?: string;
  type?: NoticeType;
  IconComponent?: React.ComponentType | null;
  title: string;
  message?: string;
  opaque?: boolean;
  dismissible?: boolean;
  asAlert?: boolean;
  children?: React.ReactNode;
  variant?: RootProps['variant'];
  size?: RootProps['size'];
  highContrast?: RootProps['highContrast'];
  onDismiss?: () => void;
}

export function Notice({
  type = 'info',
  IconComponent = null,
  title = '',
  message = '',
  opaque = false,
  dismissible = false,
  asAlert = false,
  variant,
  size,
  highContrast,
  onDismiss,
  children,
  ...props
}: NoticeProps & RootProps & BoxProps) {
  const [dismissed, setDismissed] = useState(false);

  // Auto assign default icons based on type if no IconComponent is provided
  const defaultIcons = {
    error: CrossCircledIcon,
    warning: ExclamationTriangleIcon,
    success: CheckCircledIcon,
    info: null,
    neutral: null,
  };
  const IconToRender = IconComponent || (type ? defaultIcons[type] : null);
  const IconComponentFinal = IconToRender ? IconToRender : null;
  const opaqueStyle = opaque && type ? styles[`${type}-opaque`] : undefined;

  // Mapper les types vers les couleurs Radix
  const getRadixColor = (type: NoticeProps['type']) => {
    switch (type) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'success':
        return 'green';
      case 'info':
        return 'blue';
      case 'neutral':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return !dismissed ? (
    <Box asChild {...props}>
      <Callout.Root
        color={getRadixColor(type)}
        className={opaqueStyle}
        role={asAlert ? 'alert' : 'region'}
        variant={variant}
        size={size}
        highContrast={highContrast}
      >
        {(title || IconComponentFinal || dismissible) && (
          <Flex align="center" gap="2" justify={'between'}>
            {(title || IconComponentFinal) && (
              <Flex align="center" gap="2">
                {IconComponentFinal && <IconComponentFinal />}
                {(title || IconComponentFinal) && (
                  <Heading size="2">
                    {title && <strong>{title}</strong>}
                  </Heading>
                )}
              </Flex>
            )}

            {dismissible && (
              <Button
                variant="ghost"
                size="1"
                onClick={() => {
                  setDismissed(true);
                  onDismiss?.();
                }}
                style={{ marginLeft: 'auto' }}
              >
                <Cross1Icon />
              </Button>
            )}
          </Flex>
        )}

        {message && <Callout.Text>{message}</Callout.Text>}
        {children}
      </Callout.Root>
    </Box>
  ) : null;
}
