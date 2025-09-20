
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('reader-v1').then(cache => cache.addAll([
    './','./index.html','./settings.html','./styles.css','./script.js','./config.js','./manifest.json'
  ])));
});
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
