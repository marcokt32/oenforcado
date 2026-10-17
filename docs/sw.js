importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDonNicRdW-Cy1MkDVlTLEMksjFkITmg7A",
  authDomain: "oenforcado.firebaseapp.com",
  projectId: "oenforcado",
  storageBucket: "oenforcado.firebasestorage.app",
  messagingSenderId: "179259322356",
  appId: "1:179259322356:web:cecbc39bcf76c665b093a1",
  measurementId: "G-T5SGQRR3VZ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 🔥 IMPORTANTE: altere a versão quando fizer deploy
const CACHE_NAME = "enforcado-v26";

const arquivos = [
  "/",
  "/index.html",
  "/forca.html",
  "/caca-palavras.html",
  "/termo.html",
  "/anagrama.html",
  "/manifest.json",
  "/img/thumb-forca.svg",
  "/img/thumb-caca-palavras.svg",
  "/img/thumb-termo.svg",
  "/img/thumb-anagrama.svg",
  "css/portal.css",
  "css/site-theme.css",
  "css/portal-shell.css",
  "css/footer.css",
  "css/termo.css",
  "css/forca.css",
  "css/caca-palavras.css",
  "css/anagrama.css",
  "js/portal.js",
  "js/banco-palavras.js",
  "js/forca-jogo.js",
  "js/termo.js",
  "js/caca-palavras.js",
  "js/anagrama.js",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// 📦 INSTALL
self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(arquivos.map(url =>
        fetch(new Request(url, { redirect: "follow" }))
          .then(res => (res.ok && !res.redirected) ? cache.put(url, res) : null)
          .catch(() => null)
      ));
    })
  );

});

// 🔄 ACTIVATE
self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim(); // 👈 garante controle imediato

});

// 🌐 FETCH (INTELIGENTE)
self.addEventListener("fetch", event => {

  const request = event.request;

  // Só tratamos GET http(s)
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // Só interceptamos arquivos do próprio site (Firebase, Google e gstatic passam direto)
  if (new URL(request.url).origin !== self.location.origin) return;

  // 🧭 Navegações: rede primeiro, seguindo redirecionamentos (ex.: /forca.html -> /forca)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request.url, { redirect: "follow", credentials: "same-origin" })
        .catch(() => caches.match(request, { ignoreSearch: true }))
    );
    return;
  }

  // 🔥 CSS sempre atualizado
  if (request.url.includes(".css")) {
    event.respondWith(fetch(request));
    return;
  }

  // 🚀 Stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {

      const fetchPromise = fetch(request).then(networkResponse => {

        if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }

        return networkResponse;
      }).catch(() => cachedResponse); // fallback offline

      return cachedResponse || fetchPromise;
    })
  );

});

// 🔔 PUSH (FCM)
self.addEventListener("push", function (event) {

  if (!event.data) return;

  const dados = event.data.json();

  const titulo = dados.notification?.title || "O Enforcado";
  const opcoes = {
    body: dados.notification?.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(titulo, opcoes)
  );

});

// 👆 CLICK NOTIFICAÇÃO
self.addEventListener("notificationclick", function (event) {

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {

      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/");
      }

    })
  );

});