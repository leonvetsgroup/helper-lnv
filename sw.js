// Service worker: menyimpan tampilan aplikasi supaya tetap bisa dibuka tanpa internet,
// dan menampilkan notifikasi pengingat penilaian.
// Naikkan VERSI setiap kali file aplikasi diperbarui.
const VERSI = 'kacab-v6';
const META = 'kc-meta'; // berisi sesi login untuk notifikasi; jangan dihapus saat update
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(FILES)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI && k !== META).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // data ke server tidak di-cache di sini
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSI).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit || caches.match('index.html'));
      return hit || net;
    })
  );
});

// ---------- notifikasi ----------
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let judul = 'Penilaian helper', isi = 'Ketuk untuk melihat helper yang belum dinilai.';
    try {
      const r = await (await caches.open(META)).match('sesi');
      if (r) {
        const s = await r.json();
        const ctl = new AbortController(); setTimeout(() => ctl.abort(), 20000);
        const res = await fetch(s.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ fn: 'pengingat', token: s.token, args: {} }), signal: ctl.signal });
        const j = await res.json();
        if (j.ok && j.data) { judul = j.data.judul; isi = j.data.isi; }
      }
    } catch (_) {}
    await self.registration.showNotification(judul, { body: isi, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'pengingat', renotify: true, data: { url: './' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.postMessage('muat-ulang-pr'); return c.focus(); } }
    return self.clients.openWindow('./');
  })());
});
