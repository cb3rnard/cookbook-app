import { LoadingIndicator } from "./LoadingIndicator";

export const LoadingWrapper = ({ isLoading, children, ...props }) => {
  return isLoading ? <LoadingIndicator {...props} /> : children;
};
