// Service Worker: بيحفظ ملفات الأبليكشن على الموبايل عشان يشتغل من غير نت.
// مهم: كل ما تعدّل أي ملف وتنشره، غيّر CACHE_VERSION (v1 → v2) عشان الناس تاخد التحديث.

const CACHE_VERSION = 'v6';

const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './storage.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './games/password/password.js',
  './games/password/players.json',
  './games/risk/risk.js',
  './games/risk/questions.json',
];

// أول مرة: نحفظ كل الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// نمسح أي نسخة قديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// أي طلب: لو موجود عندنا نرجّعه، لو لأ نجيبه من النت ونحفظه (زي الخط)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
