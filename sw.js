// PsicoTech PWA Service Worker: Cache básico + offline para núcleo y recursos
const CACHE = 'psicotech-v1';
const CORE = [
  '/', '/index.html', '/style.css', '/app.js',
  '/manifest.json', '/images/icon-192x192.png', '/images/icon-512x512.png'
];

// Install: precache núcleo
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
  self.skipWaiting();
});

// Activate: limpiar viejo
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.map(k=>k!==CACHE?caches.delete(k):null)
  )));
  self.clients.claim();
});

// Fetch: Cache First con fallback a red y cacheo lazy
self.addEventListener('fetch', e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      const clone = res.clone();
      if (req.method==='GET' && res.status===200 && req.url.startsWith(self.location.origin)) {
        caches.open(CACHE).then(c=>c.put(req, clone));
      }
      return res;
    }).catch(()=> cached || new Response('Sin conexión', {status:503})))
  );
});
