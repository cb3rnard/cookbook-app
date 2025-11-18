import { Box, Button, Flex, Text } from '@radix-ui/themes'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Notice } from './components/ui/Notice'

export function PWABadge() {
  // periodic sync is disabled, change the value to enable it, the period is in milliseconds
  // You can remove onRegisteredSW callback and registerPeriodicSync function
  const period = 0

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return
      if (r?.active?.state === 'activated') {
        registerPeriodicSync(period, swUrl, r)
      }
      else if (r?.installing) {
        r.installing.addEventListener('statechange', (e) => {
          /** @type {ServiceWorker} */
          const sw = e.target
          if (sw.state === 'activated')
            registerPeriodicSync(period, swUrl, r)
        })
      }
    },
  })

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <>
      {(offlineReady || needRefresh)
        && (
          <Box position="fixed" bottom="4" right="4" style={{ zIndex: 1000 }}>
            <Notice asAlert className="PWABadge" opaque args={{ 'aria-labelledby': 'toast-message' }}>
              <Flex direction="column" gap="2" align="end">
                <Text as="p">
                  {offlineReady
                    ? "App ready to work offline"
                    : "New content available, click on reload button to update."
                  }
                </Text>
                {needRefresh && <Button className="PWABadge-toast-button" onClick={() => updateServiceWorker(true)}>Reload</Button>}
                <Button onClick={() => close()}>Close</Button>
              </Flex>
            </Notice >
          </Box>
        )
      }
    </>
  )
}

/**
 * This function will register a periodic sync check every hour, you can modify the interval as needed.
 * @param period {number}
 * @param swUrl {string}
 * @param r {ServiceWorkerRegistration}
 */
function registerPeriodicSync(period, swUrl, r) {
  if (period <= 0) return

  setInterval(async () => {
    if ('onLine' in navigator && !navigator.onLine)
      return

    const resp = await fetch(swUrl, {
      cache: 'no-store',
      headers: {
        'cache': 'no-store',
        'cache-control': 'no-cache',
      },
    })

    if (resp?.status === 200)
      await r.update()
  }, period)
}
