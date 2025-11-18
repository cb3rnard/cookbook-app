import { useCallback, useEffect, useRef } from 'react';
import { DebugService } from '../services/DebugService';

/**
 * @param {string} context - Le contexte de debug par défaut
 * @returns {object} - Méthodes de debug
 */
export function useDebug(context = 'component') {
    const componentName = useRef(null);

    // Détection du nom du composant
    useEffect(() => {
        if (!componentName.current) {
            const stack = new Error().stack;
            const match = stack?.match(/at (\w+)/g);
            if (match && match[1]) {
                componentName.current = match[1].replace('at ', '');
            } else {
                componentName.current = context;
            }
        }
    }, [context]);

    const debug = useCallback((log = null, level = 'log') => {
        if (log === null) return;
        DebugService.debug(log, context, level);
    }, [context]);

    const log = useCallback((log = null) => {
        if (log === null) return;
        DebugService.log(log, context);
    }, [context]);

    const info = useCallback((log = null) => {
        if (log === null) return;
        DebugService.info(log, context);
    }, [context]);

    const warn = useCallback((log = null) => {
        if (log === null) return;
        DebugService.warn(log, context);
    }, [context]);

    const error = useCallback((log = null) => {
        if (log === null) return;
        DebugService.error(log, context);
    }, [context]);

    // Debug pour les effets de montage/démontage
    const lifecycle = useCallback((event, data = null) => {
        const finalContext = componentName.current || context;
        DebugService.info(`[${finalContext}] ${event}`, 'component');
        if (data) {
            DebugService.info({ component: finalContext, event, data }, 'component');
        }
    }, [context]);

    // Debug pour les états
    const state = useCallback((stateName, oldValue, newValue) => {
        const finalContext = componentName.current || context;
        DebugService.info({
            component: finalContext,
            state: stateName,
            change: { from: oldValue, to: newValue }
        }, 'component');
    }, [context]);

    // Debug pour les props
    const props = useCallback((propsData) => {
        const finalContext = componentName.current || context;
        DebugService.info({
            component: finalContext,
            props: propsData
        }, 'component');
    }, [context]);

    // Debug pour les événements
    const event = useCallback((eventName, eventData = null) => {
        const finalContext = componentName.current || context;
        if (eventData) {
            DebugService.info({
                component: finalContext,
                event: eventName,
                data: eventData
            }, 'component');
        } else {
            DebugService.info(`[${finalContext}] Event: ${eventName}`, 'component');
        }
    }, [context]);

    // Mesure de performance
    const time = useCallback((label, fn) => {
        const finalContext = componentName.current || context;
        return DebugService.time(`${finalContext}: ${label}`, context, fn);
    }, [context]);

    // ========================================================================
    // Raccourcis contextuels SYNCHRONES
    // ========================================================================

    const apiLog = useCallback((...log) => {
        DebugService.apiLog(...log);
    }, []);

    const syncLog = useCallback((...log) => {
        DebugService.syncLog(...log);
    }, []);

    const storageLog = useCallback((...log) => {
        DebugService.storageLog(...log);
    }, []);

    const entityLog = useCallback((...log) => {
        DebugService.entityLog(...log);
    }, []);

    const componentLog = useCallback((...log) => {
        DebugService.componentLog(...log);
    }, []);

    return {
        // Méthodes de base
        debug,
        log,
        info,
        warn,
        error,

        // Méthodes spécialisées
        lifecycle,
        state,
        props,
        event,
        time,

        // Raccourcis contextuels (plus d'await!)
        apiLog,
        syncLog,
        storageLog,
        entityLog,
        componentLog
    };
};