// Firebase Cloud Messaging Service Worker
// Must be at the root of the served domain

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Matches js/firebase-config.js — keep in sync
firebase.initializeApp({
  apiKey:            "YOUR_API_KEY",
  authDomain:        "bellepros-piri-rush.firebaseapp.com",
  projectId:         "bellepros-piri-rush",
  storageBucket:     "bellepros-piri-rush.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Background push handler (app not in foreground)
messaging.onBackgroundMessage(payload => {
  const { title, body, image } = payload.notification || {};
  const data = payload.data || {};

  const options = {
    body: body || 'Open Bellepros Piri Rush!',
    icon:  '/assets/icon-192.png',
    badge: '/assets/badge-96.png',
    image,
    tag:   data.type || 'bellepros',
    data:  { url: '/', ...data },
    actions: [
      { action: 'play',   title: '▶ Play Now' },
      { action: 'dismiss',title: '✕ Dismiss'  },
    ],
    requireInteraction: data.type === 'challenge',
  };

  self.registration.showNotification(title || 'Bellepros Piri Rush 🍗', options);
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
