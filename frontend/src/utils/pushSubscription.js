/**
 * Push Subscription utilities
 * Based on webpush-ios-example pattern
 * 
 * For server-sent push notifications, you need to:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Subscribe using pushManager.subscribe()
 * 3. Send subscription to backend
 * 4. Backend uses subscription to send push notifications
 */

/**
 * Check if push subscription is supported
 */
export const isPushSubscriptionSupported = async () => {
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
 * Check if pushManager is active
 * Based on webpush-ios-example pattern
 * Returns false if pushManager is not available (iOS needs add to Home Screen)
 */
export const isPushManagerActive = (pushManager) => {
  if (!pushManager) {
    // Check if iOS and not in standalone mode
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      if (!window.navigator.standalone) {
        // Should show "add to home screen" message
        return false;
      } else {
        // iOS standalone but pushManager still not available
        console.error('PushManager is not active even in standalone mode');
        return false;
      }
    }
    return false;
  }
  return true;
};

/**
 * Get push permission state
 * Based on webpush-ios-example pattern
 */
export const getPushPermissionState = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration || !('pushManager' in registration)) {
      return null;
    }
    
    const pushManager = registration.pushManager;
    if (!isPushManagerActive(pushManager)) {
      return null;
    }
    
    // Check permission state
    const permissionState = await pushManager.permissionState({ userVisibleOnly: true });
    return permissionState; // 'prompt', 'granted', or 'denied'
  } catch (e) {
    console.error('Error getting push permission state:', e);
    return null;
  }
};

/**
 * Subscribe to push notifications
 * Based on webpush-ios-example pattern
 * 
 * @param {string} vapidPublicKey - VAPID public key (base64url encoded, NOT Uint8Array)
 * @returns {Promise<PushSubscription>} Push subscription object
 */
export const subscribeToPush = async (vapidPublicKey) => {
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is required');
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;
  
  if (!registration) {
    throw new Error('Service Worker is not ready');
  }

  const pushManager = registration.pushManager;
  
  // Check if pushManager is active (based on webpush-ios-example)
  if (!isPushManagerActive(pushManager)) {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
      throw new Error(
        'pushManager is not available. ' +
        'On iOS, you must add the app to Home Screen first. ' +
        'Please use Safari Share menu > Add to Home Screen.'
      );
    }
    throw new Error('pushManager is not available');
  }

  // Check existing subscription first
  let subscription = await pushManager.getSubscription();
  
  if (subscription) {
    console.log('Already subscribed:', subscription.toJSON());
    return subscription;
  }

  // Subscribe with VAPID key
  // Note: VAPID key should be base64url string, not Uint8Array for iOS
  // iOS Safari handles the conversion automatically
  const subscriptionOptions = {
    userVisibleOnly: true, // Required for all browsers
    applicationServerKey: vapidPublicKey, // Use string directly for iOS compatibility
  };

  try {
    subscription = await pushManager.subscribe(subscriptionOptions);
    console.log('Push subscription successful:', subscription.toJSON());
    return subscription;
  } catch (error) {
    console.error('Push subscription error:', error);
    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
      throw new Error('Notification permission denied or not supported. Please grant notification permission first.');
    }
    if (error.message && error.message.includes('applicationServerKey')) {
      throw new Error('Invalid VAPID key format. Please check your VAPID public key.');
    }
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  const registration = await navigator.serviceWorker.ready;
  
  if (!registration || !('pushManager' in registration)) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    const result = await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications');
    return result;
  }
  
  return false;
};

/**
 * Get current push subscription
 */
export const getPushSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration || !('pushManager' in registration)) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (e) {
    console.error('Error getting push subscription:', e);
    return null;
  }
};

/**
 * Convert VAPID public key from base64url to Uint8Array
 * VAPID keys from web-push are base64url encoded
 * Note: iOS Safari may accept string directly, but other browsers need Uint8Array
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Initialize push notification system
 * Based on webpush-ios-example pattern
 * Checks permission state and returns appropriate status
 */
export const initPushNotifications = async () => {
  try {
    console.log('[Push Init] Starting initialization...');
    console.log('[Push Init] Navigator:', {
      hasServiceWorker: 'serviceWorker' in navigator,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecureContext: window.isSecureContext,
    });
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('[Push Init] Service Worker not supported in this browser');
      return {
        supported: false,
        message: 'Service Worker không được hỗ trợ trên trình duyệt này. Vui lòng dùng Chrome, Firefox, Safari, hoặc Edge.',
      };
    }
    
    // Check if running on HTTPS or localhost (required for service workers)
    const isSecureContext = window.isSecureContext || 
                            window.location.protocol === 'https:' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname.includes('192.168.') ||
                            window.location.hostname.includes('10.');
    
    if (!isSecureContext) {
      console.log('[Push Init] Not running on secure context');
      return {
        supported: false,
        message: 'Service Worker chỉ hoạt động trên HTTPS hoặc localhost. Hiện tại đang chạy trên: ' + window.location.protocol + '//' + window.location.hostname,
      };
    }

    console.log('[Push Init] Waiting for service worker ready...');
    
    // Try to get existing registration first
    let registration = null;
    try {
      registration = await navigator.serviceWorker.getRegistration();
      console.log('[Push Init] Existing registration:', registration);
    } catch (e) {
      console.log('[Push Init] No existing registration, waiting for ready...');
    }
    
    // Wait for service worker to be ready
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.ready;
        console.log('[Push Init] Service worker ready:', registration);
      } catch (e) {
        console.error('[Push Init] Error waiting for service worker ready:', e);
        return {
          supported: false,
          message: 'Không thể đợi service worker sẵn sàng. Có thể service worker chưa được register.',
          error: e.toString(),
        };
      }
    }
    
    if (!registration) {
      return {
        supported: false,
        message: 'Service Worker chưa được register. Vui lòng reload trang.',
      };
    }
    
    // Check if pushManager exists
    const hasPushManager = 'pushManager' in registration;
    console.log('[Push Init] Has pushManager:', hasPushManager);
    console.log('[Push Init] Registration object keys:', Object.keys(registration));
    
    const pushManager = registration.pushManager;
    console.log('[Push Init] pushManager value:', pushManager);

    // Check standalone mode for iOS
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    console.log('[Push Init] iOS:', isIOS, 'Standalone:', isStandalone);

    if (!isPushManagerActive(pushManager)) {
      console.log('[Push Init] Push Manager is not active');
      if (isIOS && !isStandalone) {
        console.log('[Push Init] iOS not in standalone mode - needs Home Screen');
        return {
          supported: false,
          needsHomeScreen: true,
          message: 'Please add app to Home Screen to enable push notifications',
        };
      }
      if (isIOS && isStandalone) {
        console.log('[Push Init] iOS in standalone but pushManager still not available');
        return {
          supported: false,
          message: 'Push Manager is not active. Try reloading the page after adding to Home Screen.',
        };
      }
      return {
        supported: false,
        message: 'Push Manager is not active',
      };
    }

    console.log('[Push Init] Push Manager is active, checking permission state...');
    
    // Check permission state
    let permissionState;
    try {
      permissionState = await pushManager.permissionState({ userVisibleOnly: true });
      console.log('[Push Init] Permission state:', permissionState);
    } catch (e) {
      console.error('[Push Init] Error getting permission state:', e);
      permissionState = null;
    }
    
    // Check existing subscription
    let subscription = null;
    try {
      subscription = await pushManager.getSubscription();
      console.log('[Push Init] Existing subscription:', subscription ? 'Yes' : 'No');
    } catch (e) {
      console.error('[Push Init] Error getting subscription:', e);
    }

    return {
      supported: true,
      permissionState, // 'prompt', 'granted', or 'denied'
      hasSubscription: !!subscription,
      subscription: subscription ? subscription.toJSON() : null,
    };
  } catch (error) {
    console.error('[Push Init] Error initializing push notifications:', error);
    return {
      supported: false,
      message: error.message || 'Unknown error',
      error: error.toString(),
    };
  }
};

