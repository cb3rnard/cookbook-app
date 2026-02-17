import { LoadingIndicator } from './LoadingIndicator';
import { BoxProps } from '@radix-ui/themes/src/components/box.tsx';

export const LoadingWrapper = ({
  isLoading,
  children,
  ...props
}: { isLoading: boolean; children: React.ReactNode } & BoxProps) => {
  return isLoading ? <LoadingIndicator {...props} /> : children;
};
