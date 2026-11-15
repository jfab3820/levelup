/* eslint-disable no-restricted-globals */

// LevelUp service worker. Create React App compiles this file with Workbox during
// `npm run build` and injects the list of built files (self.__WB_MANIFEST) so the
// whole app shell is cached and the app opens with no connection.

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

clientsClaim();

// Cache every file the build produced (JS, CSS, index.html, icons).
precacheAndRoute(self.__WB_MANIFEST);

// App-shell routing: any page navigation is answered with the cached index.html,
// except real files and the serverless API.
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(({ request, url }) => {
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/_")) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.match(fileExtensionRegexp)) return false;
  return true;
}, createHandlerBoundToURL(process.env.PUBLIC_URL + "/index.html"));

// Google Fonts: keep the stylesheet fresh, keep the font files for a year.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets" })
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// The app posts this when the user taps "Refresh" on the update banner, so a
// newly deployed version takes over right away instead of waiting for every tab to close.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
