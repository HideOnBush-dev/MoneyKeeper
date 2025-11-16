/**
 * Utility functions for handling browser notifications
 * iOS Safari supports notifications from iOS 16.4+ but only in standalone mode (PWA)
 */

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export const isStandalone = () => {
  // Check for iOS standalone mode
  if (window.navigator.standalone === true) {
    return true;
  }
  // Check for Android/Chrome standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // Check for other browsers
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  return false;
};

/**
 * Check if notifications are supported
 */
export const isNotificationSupported = () => {
  return 'Notification' in window;
};

/**
 * Check if notification permission has been granted
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Request notification permission
 * Note: This MUST be called directly from a user interaction (click event)
 * for browsers to show the permission popup
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications không được hỗ trợ trên trình duyệt này');
  }

  // iOS Safari only supports notifications in standalone mode
  if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
    if (!isStandalone()) {
      throw new Error(
        'Trên iOS, thông báo chỉ hoạt động khi app được cài đặt như PWA. ' +
        'Vui lòng thêm vào màn hình chính từ Safari (Share > Add to Home Screen)'
      );
    }
  }

  const currentPermission = Notification.permission;
  
  if (currentPermission === 'granted') {
    return 'granted';
  }

  if (currentPermission === 'denied') {
    throw new Error('Quyền thông báo đã bị từ chối. Vui lòng bật lại trong cài đặt trình duyệt.');
  }

  // Request permission - this will show the browser popup
  // This MUST be called from a user interaction event
  const permission = await Notification.requestPermission();
  
  if (permission !== 'granted') {
    throw new Error('Quyền thông báo đã bị từ chối');
  }

  return permission;
};

/**
 * Send a test notification
 * Note: This function should be called directly from a user interaction (click event)
 * to ensure Notification.requestPermission() works properly
 */
export const sendTestNotification = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications không được hỗ trợ trên trình duyệt này');
  }

  // iOS Safari only supports notifications in standalone mode
  // Based on webpush-ios-example: pushManager only appears after adding to Home Screen
  if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
    if (!isStandalone()) {
      throw new Error(
        'Trên iOS, thông báo chỉ hoạt động khi app được cài đặt như PWA. ' +
        'Vui lòng thêm vào màn hình chính từ Safari (Share > Add to Home Screen). ' +
        'pushManager chỉ xuất hiện sau khi thêm vào Home Screen.'
      );
    }
    
    // Check if pushManager is available (required for iOS WebPush)
    // According to webpush-ios-example, pushManager only appears after adding to Home Screen
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !('pushManager' in registration)) {
        throw new Error(
          'pushManager chưa sẵn sàng. Vui lòng đảm bảo app đã được thêm vào Home Screen và reload lại trang.'
        );
      }
    } catch (e) {
      if (e.message && e.message.includes('pushManager')) {
        throw e;
      }
      // Service worker not ready yet, continue
    }
  }

  // Request permission if not already granted
  // This MUST be called directly from user interaction for browsers to show the popup
  let permission = Notification.permission;
  
  if (permission === 'default') {
    // Request permission - this will show the browser popup
    permission = await Notification.requestPermission();
  }

  if (permission === 'denied') {
    throw new Error('Quyền thông báo đã bị từ chối. Vui lòng bật lại trong cài đặt trình duyệt.');
  }

  if (permission !== 'granted') {
    throw new Error('Quyền thông báo chưa được cấp');
  }

  const options = {
    body: 'Đây là thông báo test từ Money Keeper! 🎉',
    icon: '/img/app-icon.png',
    badge: '/img/app-icon.png',
    tag: 'test-notification',
    requireInteraction: false,
    silent: false,
  };

  // Show notification via service worker (required for iOS PWA)
  // Based on webpush-ios-example pattern: use serviceWorker.showNotification()
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      // Use service worker to show notification (required for iOS)
      await registration.showNotification('Money Keeper - Test Notification', options);
      return null; // Service worker handles the notification
    }
  } catch (e) {
    console.log('Service worker not available, using direct Notification API:', e);
  }

  // Fallback: Show notification directly (for non-PWA contexts)
  const notification = new Notification('Money Keeper - Test Notification', options);

  // Auto close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  return notification;
};

/**
 * Check if pushManager is available (required for iOS WebPush)
 * pushManager only appears after adding site to Home Screen on iOS
 */
export const isPushManagerAvailable = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    return registration && 'pushManager' in registration;
  } catch (e) {
    return false;
  }
};

/**
 * Get device info for debugging
 * Based on webpush-ios-example pattern
 */
export const getDeviceInfo = async () => {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isStandaloneMode = isStandalone();
  const notificationSupported = isNotificationSupported();
  const notificationPermission = getNotificationPermission();
  
  // Check pushManager availability (critical for iOS)
  let pushManagerAvailable = false;
  let serviceWorkerReady = false;
  let pushManagerDebug = null;
  let isSecureContext = false;
  
  // Check secure context
  try {
    isSecureContext = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  } catch (e) {
    console.log('Error checking secure context:', e);
  }
  
  try {
    if ('serviceWorker' in navigator) {
      // Only try to get service worker if in secure context
      if (isSecureContext) {
        try {
          const registration = await navigator.serviceWorker.ready;
          serviceWorkerReady = !!registration;
          pushManagerAvailable = registration && 'pushManager' in registration;
          
          // Debug info
          if (registration) {
            pushManagerDebug = {
              hasPushManager: 'pushManager' in registration,
              registrationKeys: Object.keys(registration),
              pushManagerValue: registration.pushManager ? 'exists' : 'null/undefined',
            };
            console.log('[Device Info] Service Worker debug:', pushManagerDebug);
          }
        } catch (e) {
          console.log('[Device Info] Service Worker not ready:', e);
          serviceWorkerReady = false;
        }
      } else {
        console.log('[Device Info] Not in secure context, skipping service worker check');
      }
    }
  } catch (e) {
    console.log('Error checking service worker:', e);
  }

  return {
    isIOS,
    isAndroid,
    isStandaloneMode,
    notificationSupported,
    notificationPermission,
    pushManagerAvailable,
    serviceWorkerReady,
    pushManagerDebug,
    isSecureContext,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    userAgent: navigator.userAgent,
  };
};

