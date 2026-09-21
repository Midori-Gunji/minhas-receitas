// Nome do cache: mude o número no final sempre que quiser forçar
// os usuários a baixarem uma versão nova dos arquivos.
const CACHE_NAME = 'receitas-cache-v1';

const ARQUIVOS_PARA_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Ao instalar, guarda os arquivos principais do site no cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting();
});

// Ao ativar, apaga caches antigos (de versões anteriores).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: tenta a rede primeiro (pra pegar dados atualizados do
// Firebase e do próprio site); se não tiver internet, usa o cache.
self.addEventListener('fetch', (event) => {
  // Deixa passar direto qualquer chamada para fora do seu site
  // (Firebase, Google Fonts, etc.) sem tentar cachear.
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
