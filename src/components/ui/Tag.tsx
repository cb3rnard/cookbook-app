import { Text } from '@radix-ui/themes';
import style from './Tag.module.css';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  rounded?: boolean;
  uppercase?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Tag({
  color = '',
  rounded = false,
  uppercase = false,
  className,
  children,
  ...props
}: TagProps) {
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
