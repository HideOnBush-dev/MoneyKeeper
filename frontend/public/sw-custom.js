/**
 * Custom service worker code for push notifications
 * This will be injected into the generated service worker by VitePWA
 */

// Listen for push events (for future server-sent push notifications)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Money Keeper',
    body: 'Bạn có thông báo mới',
    icon: '/img/app-icon.png',
    badge: '/img/app-icon.png',
    tag: 'money-keeper-notification',
    requireInteraction: false,
    silent: false,
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      // If data is text, use it as body
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      data: notificationData.data || {},
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Get the URL from notification data or use default
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    // Show a test notification from service worker
    event.waitUntil(
      self.registration.showNotification('Money Keeper - Test Notification', {
        body: 'Đây là thông báo test từ Service Worker! 🎉',
        icon: '/img/app-icon.png',
        badge: '/img/app-icon.png',
        tag: 'test-notification-sw',
        requireInteraction: false,
        silent: false,
      })
    );
  }
});

