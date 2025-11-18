import { useEffect, useState } from "react";

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Vérifie le mode standalone
        const standalone = window.matchMedia("(display-mode: standalone)").matches
            || window.navigator.standalone === true;
        setIsStandalone(standalone);

        // Détecte iOS (Safari mobile)
        const ua = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(ua);
        setIsIos(ios);

        // Capture l’événement "avant installation"
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    // Fonction pour lancer le prompt
    const promptInstall = async () => {
        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return outcome === "accepted";
    };

    return { isStandalone, isIos, canInstall: !!deferredPrompt, promptInstall };
}