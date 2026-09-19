/**
 * FreshHarvest Supermarket POS - Service Worker
 * Enables offline caching and PWA functionality.
 */

const CACHE_NAME = 'freshharvest-pos-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './home.html',
  './home.css',
  './home.js',
  './billing.html',
  './billing.css',
  './billing.js',
  './products.html',
  './products.css',
  './products.js',
  './items.html',
  './items.css',
  './items.js',
  './all-items.html',
  './all-items.css',
  './all-items.js',
  './stock-control.html',
  './stock-control.css',
  './stock-control.js',
  './stock.html',
  './bills-history.html',
  './bills-history.css',
  './bills-history.js',
  './bills.html',
  './customers.html',
  './customers.css',
  './customers.js',
  './categories.html',
  './categories.css',
  './categories.js',
  './purchases.html',
  './purchases.css',
  './purchases.js',
  './suppliers.html',
  './suppliers.css',
  './suppliers.js',
  './returns.html',
  './returns.css',
  './returns.js',
  './offers-deals.html',
  './offers-deals.css',
  './offers-deals.js',
  './offers.html',
  './loyalty.html',
  './loyalty.css',
  './loyalty.js',
  './reports-profit.html',
  './reports-profit.css',
  './reports-profit.js',
  './reports.html',
  './staff-roles.html',
  './staff-roles.css',
  './staff-roles.js',
  './staff.html',
  './cashier.html',
  './cashier.css',
  './cashier.js',
  './store-settings.html',
  './store-settings.css',
  './store-settings.js',
  './settings.html',
  './backup-restore.html',
  './backup-restore.css',
  './backup-restore.js',
  './backup.html',
  './sidebar.css',
  './sidebar.js',
  './data-store.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./home.html');
        }
      });
    })
  );
});
