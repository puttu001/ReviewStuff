// Minimal service worker. Required for the app to be installable as a PWA,
// which is what makes it appear in the OS share sheet.
// Deliberately no caching strategy yet — the app needs fresh data on every
// open, and a stale-cache bug here would be worse than no offline support.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass through to the network.
});
