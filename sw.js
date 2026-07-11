/* ============================================================
   FinanceFlow — Service Worker (PWA)
   Estratégia:
   · HTML: network-first (sempre busca a versão mais nova,
     cai para o cache offline)
   · Assets: stale-while-revalidate (rápido + atualiza por trás)
   · skipWaiting + clients.claim: nova versão assume na hora e
     o app recarrega (atualização em tempo real)
   ============================================================ */

const VERSION = 'ff-v1.3.0';

const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'pages/dashboard.html', 'pages/entradas.html', 'pages/saidas.html',
  'pages/metas.html', 'pages/sonhos.html', 'pages/investimentos.html',
  'pages/projetos.html', 'pages/estatisticas.html', 'pages/simulador.html',
  'pages/ia-financeira.html', 'pages/conquistas.html', 'pages/configuracoes.html',
  'assets/css/style.css',
  'assets/js/core/utils.js', 'assets/js/core/icons.js', 'assets/js/core/store.js',
  'assets/js/core/gamification.js', 'assets/js/core/ui.js', 'assets/js/core/auth.js',
  'assets/js/core/sync.js', 'assets/js/app.js',
  'assets/js/dashboard.js', 'assets/js/transacoes.js', 'assets/js/metas.js',
  'assets/js/sonhos.js', 'assets/js/investimentos.js', 'assets/js/projetos.js',
  'assets/js/estatisticas.js', 'assets/js/simulador.js', 'assets/js/ia.js',
  'assets/js/conquistas.js', 'assets/js/configuracoes.js', 'assets/js/landing.js',
  'assets/vendor/chart.umd.min.js',
  'assets/fonts/inter-latin-400-normal.woff2', 'assets/fonts/inter-latin-500-normal.woff2',
  'assets/fonts/inter-latin-600-normal.woff2', 'assets/fonts/inter-latin-700-normal.woff2',
  'assets/fonts/inter-latin-800-normal.woff2',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(PRECACHE.map(p => new Request(p, { cache: 'reload' }))))
      .catch(() => { /* offline no primeiro install: segue sem precache completo */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const isHTML = req.mode === 'navigate' || req.destination === 'document';
  const isCodeAsset = req.destination === 'style' || req.destination === 'script';

  if (isHTML || isCodeAsset) {
    // network-first: HTML/CSS/JS sempre frescos, cache só como fallback
    // offline. Evita servir estilos/scripts antigos presos no cache
    // depois de um deploy — o app muda com frequência nesta fase.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || (isHTML ? caches.match('index.html') : undefined)))
    );
    return;
  }

  // stale-while-revalidate para fontes/imagens/libs vendorizadas (mudam raramente)
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
