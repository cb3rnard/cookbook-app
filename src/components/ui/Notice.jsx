import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { Box, Button, Callout, Flex, Heading } from "@radix-ui/themes";
import { useState } from "react";
import styles from "./Notice.module.css";

export function Notice({
  id = null,
  type = "info",
  IconComponent = null,
  title = "",
  message = "",
  opaque = false,
  dismissible = false,
  asAlert = false,
  children,
  ...props
}) {
  const [dismissed, setDismissed] = useState(false);

  // Auto assign default icons based on type if no IconComponent is provided
  const defaultIcons = {
    error: CrossCircledIcon,
    warning: ExclamationTriangleIcon,
    success: CheckCircledIcon,
    info: null,
    neutral: null,
  };
  const IconToRender = IconComponent || defaultIcons[type] || null;
  const IconComponentFinal = IconToRender ? IconToRender : null;
  const opaqueStyle = opaque && type ? styles[`${type}-opaque`] : null;

  // Mapper les types vers les couleurs Radix
  const getRadixColor = (type) => {
    switch (type) {
      case "error":
        return "red";
      case "warning":
        return "orange";
      case "success":
        return "green";
      case "info":
        return "blue";
      case "neutral":
        return "gray";
      default:
        return "gray";
    }
  };

  return !dismissed ? (
    <Box asChild {...props}>
      <Callout.Root
        key={id}
        color={getRadixColor(type)}
        className={opaqueStyle}
        role={asAlert ? "alert" : "region"}
      >
        {dismissible && (
          <Flex justify="end">
            <Button
              variant="ghost"
              size="1"
              onClick={() => setDismissed(true)}
              style={{ marginLeft: "auto" }}
            >
              ×
            </Button>
          </Flex>
        )}

        {(title || IconComponentFinal) && (
          <Flex asChild align="center" gap="2">
            <Heading as="div" size="2">
              {IconComponentFinal && <IconComponentFinal />}
              {title && <strong>{title}</strong>}
            </Heading>
          </Flex>
        )}

        {message && <Callout.Text>{message}</Callout.Text>}
        {children}
      </Callout.Root>
    </Box>
  ) : null;
}
