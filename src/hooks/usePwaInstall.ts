import { useEffect, useState } from 'react';

/**
 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt handler
 * before a user is prompted to "install" a web site to a home screen on mobile.
 *
 * @deprecated Only supported on Chrome and Android Webview.
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns an array of DOMString items containing the platforms on which the event was dispatched.
   * This is provided for user agents that want to present a choice of versions to the user such as,
   * for example, "web" or "play" which would allow the user to chose between a web version or
   * an Android version.
   */
  readonly platforms: Array<string>;

  /**
   * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  /**
   * Allows a developer to show the install prompt at a time of their own choosing.
   * This method returns a Promise.
   */
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Vérifie le mode standalone
    const standalone = Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && window.navigator['standalone']),
    );
    setIsStandalone(standalone);

    // Détecte iOS (Safari mobile)
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    // Capture l’événement "avant installation"
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', (e) =>
      handler(e as BeforeInstallPromptEvent),
    );

    return () =>
      window.removeEventListener('beforeinstallprompt', (e) =>
        handler(e as BeforeInstallPromptEvent),
      );
  }, []);

  // Fonction pour lancer le prompt
  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { isStandalone, isIos, canInstall: !!deferredPrompt, promptInstall };
}
