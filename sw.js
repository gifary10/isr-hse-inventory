const CACHE_NAME = 'isr-static-v2';
const OFFLINE_URL = '/offline.html';

// Hanya file statis dari origin sendiri yang di-cache (termasuk library CDN)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/main.js',
  '/config.js',
  '/cache.js',
  '/dashboard.js',
  '/distribution.js',
  '/dom.js',
  '/helpers.js',
  '/history.js',
  '/items.js',
  '/router.js',
  '/services.js',
  '/stockOpname.js',
  '/isr.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => console.error('[SW] Cache addAll error:', err))
  );
  self.skipWaiting();
});

// Activate event – hapus cache lama
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fungsi bantu: cek apakah request boleh di-cache
function isCacheableRequest(request) {
  const url = new URL(request.url);
  // Hanya method GET
  if (request.method !== 'GET') return false;
  // Tolak skema yang tidak didukung (chrome-extension, chrome-devtools, dll)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  // Jangan ganggu API Google Apps Script
  if (url.hostname.includes('script.google.com')) return false;
  // Jangan cache request dari ekstensi atau devtools
  if (url.protocol === 'chrome-extension:') return false;
  return true;
}

// Fetch event
self.addEventListener('fetch', event => {
  const request = event.request;

  // Lewatkan request yang tidak boleh di-cache
  if (!isCacheableRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        // Cache respons jika sukses dan merupakan GET
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback untuk navigasi (halaman)
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline - konten tidak tersedia', { status: 503 });
      });
    })
  );
});