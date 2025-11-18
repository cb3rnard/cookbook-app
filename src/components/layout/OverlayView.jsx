import { Box, Flex, ScrollArea } from '@radix-ui/themes';
import classNames from 'classnames';
import { useView } from '../../contexts';
import styles from './OverlayView.module.css';

export function OverlayView({ contentClassName = '', maxWidth = '60rem', unstyledContent = false, onClose = () => { }, style = null, children }) {
  const { setCurrentOverlayView } = useView();
  const handleClose = (e) => {
    setCurrentOverlayView(null);
    onClose();
  };

  const className = classNames({
    [styles.content]: true,
    [styles.contentUnstyled]: unstyledContent,
    [styles.contentStyled]: !unstyledContent,
    [contentClassName]: contentClassName
  });

  return (
    <Box className={styles.overlay}>
      <Box className={styles.backdrop} onClick={handleClose} />
      <ScrollArea
        asChild
        type="vertical"
        className={className}
        style={style}
        position="relative"
      >
        <Flex maxWidth={unstyledContent ? null : maxWidth} justify="center" align="center">
          {children}
        </Flex>
      </ScrollArea>
    </Box >
  );
}