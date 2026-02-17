import { Button, Popover, Text } from '@radix-ui/themes';
import { buttonPropDefs } from '@radix-ui/themes/src/components/button.props.tsx';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export interface InstallButtonProps {
  variant?: (typeof buttonPropDefs.variant.values)[number];
  color?: (typeof buttonPropDefs.color.values)[number];
  size?: (typeof buttonPropDefs.size.values)[number];
}

export function InstallButton({
  size = '2',
  color = buttonPropDefs.color.default,
  variant = 'solid',
}: InstallButtonProps) {
  const { isStandalone, isIos, canInstall, promptInstall } = usePwaInstall();

  if (isStandalone) {
    return null; // déjà installé => rien à afficher
  }

  return isIos ? (
    <Popover.Root>
      <Popover.Trigger>
        <Button variant={variant} color={color} size={size}>
          Installer l'application
        </Button>
      </Popover.Trigger>
      <Popover.Content width="360px">
        <Text as="div">
          📱 Sur iPhone/iPad : ouvrez Safari → bouton « Partager » → « Ajouter à
          l’écran d’accueil ».
        </Text>
        <Popover.Close>
          <Button variant={variant} color={color} size={size}>
            Installer l'application
          </Button>
        </Popover.Close>
      </Popover.Content>
    </Popover.Root>
  ) : canInstall ? (
    <Button onClick={promptInstall} size={size} color={color} variant={variant}>
      Installer l’application
    </Button>
  ) : null;
}
