// ============================================================
// sw.js — Service Worker untuk Pancoran Group Kasir
// Versi 3: Includes new utility files and dashboard
// ============================================================

const CACHE_NAME = 'pancoran-kasir-v3';

const CACHE_FILES = [
    '/',
    '/index.html',
    '/kasir-hotel.html',
    '/kasir-karaoke.html',
    '/kasir-wahana.html',
    '/kasir-fnb.html',
    '/dashboard.html',
    '/style.css',
    '/config.js',
    '/auth-utils.js',
    '/fnb-context.js',
    '/karaoke-logic.js',
    '/closing-utils.js',
    '/supabase.js',
    '/sync.js',
    '/manifest.json',
];

// ===== INSTALL: Cache semua file =====
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW v3] Menginstall cache...');
            return cache.addAll(CACHE_FILES);
        })
    );
    self.skipWaiting();
});

// ===== ACTIVATE: Hapus cache lama =====
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ===== FETCH: Serve dari cache jika offline =====
self.addEventListener('fetch', event => {
    // Jangan intercept request ke Supabase (sync.js yang handle)
    if (event.request.url.includes('supabase.co') || event.request.url.includes('supabase.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
