
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('reader-v3k-fix').then(cache => cache.addAll([
    './','./index.html','./settings.html','./styles.css','./script.js','./config.js','./manifest.json','./assets/novel_chapters.csv'
  ])));
});
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
