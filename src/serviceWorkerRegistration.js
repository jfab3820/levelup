// Registers the service worker that makes LevelUp installable and usable offline.
// The worker itself is built from src/service-worker.js (production builds only).

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// config.onUpdate(registration) fires when a new version has downloaded and is waiting.
// config.onSuccess(registration) fires the first time the app is cached for offline use.
export function register(config) {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);
    } else {
      registerValidSW(swUrl, config);
    }
  });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      // A version that downloaded on an earlier visit and is still waiting.
      if (registration.waiting && navigator.serviceWorker.controller) {
        if (config && config.onUpdate) config.onUpdate(registration);
      }

      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state !== 'installed') return;
          if (navigator.serviceWorker.controller) {
            if (config && config.onUpdate) config.onUpdate(registration);
          } else if (config && config.onSuccess) {
            config.onSuccess(registration);
          }
        };
      };

      // Look for a new deployment whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    })
    .catch(error => console.error('Service worker registration failed:', error));
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (response.status === 404 || (contentType != null && contentType.indexOf('javascript') === -1)) {
        // No worker at this URL (for example a different app on the same localhost port).
        navigator.serviceWorker.ready
          .then(registration => registration.unregister())
          .then(() => window.location.reload());
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => console.log('No internet connection found. App is running in offline mode.'));
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => registration.unregister())
      .catch(error => console.error(error.message));
  }
}
