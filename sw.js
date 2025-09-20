self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('reader-v3k-compat').then(cache => cache.addAll([
    './','./index.html','./settings.html','./styles.css','./script.js','./app.js',
    './config.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png',
    './assets/novel_chapters.csv','./assets/images/logo.png'
  ])));
});
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });