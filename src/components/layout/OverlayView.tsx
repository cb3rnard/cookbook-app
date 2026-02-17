import { Box, Flex, ScrollArea } from '@radix-ui/themes';
import { useView } from '@src/contexts/ViewContext';
import classNames from 'classnames';
import styles from './OverlayView.module.css';

export function OverlayView({
  contentClassName,
  maxWidth = '60rem',
  unstyledContent = false,
  onClose = () => {},
  style,
  children,
}: {
  contentClassName?: string;
  maxWidth?: string;
  unstyledContent?: boolean;
  onClose?: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { resetCurrentOverlayView } = useView();
  const handleClose = () => {
    resetCurrentOverlayView();
    onClose();
  };

  const className = classNames({
    [styles.content]: true,
    [styles.contentUnstyled]: unstyledContent,
    [styles.contentStyled]: !unstyledContent,
    [contentClassName || '']: contentClassName,
  });

  return (
    <Box className={styles.overlay}>
      <Box className={styles.backdrop} onClick={handleClose} />
      <ScrollArea
        asChild
        scrollbars="vertical"
        className={className}
        style={style}
      >
        <Flex
          maxWidth={unstyledContent ? undefined : maxWidth}
          justify="center"
          align="center"
        >
          {children}
        </Flex>
      </ScrollArea>
    </Box>
  );
}
