import { Button, Popover } from "@radix-ui/themes";
import { usePwaInstall } from "../../hooks/usePwaInstall";

export function InstallButton({ size = "2", color = null, variant = "solid" }) {
  const { isStandalone, isIos, canInstall, promptInstall } = usePwaInstall();

  if (isStandalone) {
    return null; // déjà installé => rien à afficher
  }

  return (isIos ? (
    <Popover.Root>
      <Popover.Trigger>
        <Button variant={variant} color={color} size={size}>
          Installer l'application
        </Button>
      </Popover.Trigger>
      <Popover.Content width="360px">
        <Text as="div">
          📱 Sur iPhone/iPad : ouvrez Safari → bouton « Partager » → « Ajouter à l’écran d’accueil ».
        </Text>
        <Popover.Close>
          <Button variant={variant} color={color} size={size}>
            Installer l'application
          </Button>
        </Popover.Close>
      </Popover.Content>
    </Popover.Root>
  ) : (
    canInstall ? (
      <Button
        onClick={promptInstall}
        size={size}
        color={color}
        variant={variant}
      >
        Installer l’application
      </Button >
    ) : null
  )
  )
};