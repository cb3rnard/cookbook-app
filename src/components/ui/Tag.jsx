import { Text } from '@radix-ui/themes';
import style from './Tag.module.css';

export function Tag({ color = null, rounded = false, uppercase = false, className, children, ...props }) {
  return (
    <Text
      as="span"
      className={`${style.tag} ${color ? `${style[`${color}`]}` : ''} ${rounded ? style.rounded : ''} ${uppercase ? 'uppercase' : ''} ${className ?? ''}`}
      size="1"
      {...props}
    >
      {children}
    </Text>
  );
}