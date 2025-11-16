import { registerSW } from 'virtual:pwa-register';

let updateSW;

// Check if service worker is supported before registering
if ('serviceWorker' in navigator) {
  // Check if running on secure context
  const isSecureContext = window.isSecureContext || 
                          location.protocol === 'https:' || 
                          location.hostname === 'localhost' || 
                          location.hostname === '127.0.0.1' ||
                          location.hostname.includes('192.168.') ||
                          location.hostname.includes('10.');
  
  if (!isSecureContext) {
    console.warn('[SW] Service Worker requires HTTPS or localhost. Current:', location.protocol + '//' + location.hostname);
  }
  
  // Register service worker
  updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('Có phiên bản mới! Bạn có muốn cập nhật không?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('[SW] App is ready to work offline');
    },
    onRegistered(registration) {
      console.log('[SW] Service Worker registered:', registration);
      console.log('[SW] Registration scope:', registration?.scope);
      console.log('[SW] Has pushManager:', registration && 'pushManager' in registration);
      
      // Add push event listener for future server-sent push notifications
      // Based on webpush-ios-example pattern
      if (registration && 'pushManager' in registration) {
        console.log('[SW] Push Manager is available - ready for push subscriptions');
      } else {
        console.warn('[SW] Push Manager not available. On iOS, this requires adding app to Home Screen.');
      }
      
      // Inject push and notificationclick event listeners into service worker
      // These are critical for receiving push notifications from server
      if (registration && registration.active) {
        registration.active.postMessage({
          type: 'INIT_PUSH_LISTENERS',
          // Service worker should have these listeners already if using injectManifest
          // But we can verify they're working
        });
      }
    },
    onRegisterError(error) {
      console.error('[SW] Service Worker registration error:', error);
      console.error('[SW] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
    },
  });
  
  // Check for updates every hour
  setInterval(() => {
    if (updateSW) {
      updateSW(true);
    }
  }, 60 * 60 * 1000);
} else {
  console.warn('[SW] Service Worker is not supported in this browser');
  // Create a no-op function
  updateSW = () => {};
}

export default updateSW;
