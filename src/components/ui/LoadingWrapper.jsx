import { LoadingIndicator } from "./LoadingIndicator"

export const LoadingWrapper = ({ isLoading, children, ...loaderProps }) => {
  return isLoading ? <LoadingIndicator {...loaderProps} /> : children
}