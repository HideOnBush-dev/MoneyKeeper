import { useState, useEffect, useRef } from 'react';
import { Crown, Sparkles, Zap, Check, MessageSquare, Globe, Settings as SettingsIcon, Bell, Smartphone } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import Select from '../components/Select';
import PageHeader from '../components/PageHeader';
import { sendTestNotification, isStandalone, isNotificationSupported, getNotificationPermission, getDeviceInfo } from '../utils/notifications';
import { initPushNotifications, getPushPermissionState, isPushManagerActive } from '../utils/pushSubscription';
import { notify } from '../services/notify';
import { useTranslation } from 'react-i18next';

const Settings = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [premiumInfo, setPremiumInfo] = useState({ premium: false, chatMessageCount: 0, limit: 200 });
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(() => {
    try {
      return localStorage.getItem('mk_debug_mode') === 'true';
    } catch {
      return false;
    }
  });
  const debugModeToggleRef = useRef(false);
  const prevDebugModeRef = useRef(isDebugMode);

  useEffect(() => {
    // Load premium status from user context
    if (user) {
      setPremiumInfo({
        premium: user.premium || false,
        chatMessageCount: user.chat_message_count || 0,
        limit: user.premium ? Infinity : 200,
      });
    }

    // Check notification status (async)
    // Based on webpush-ios-example: initServiceWorker pattern
    const checkStatus = async () => {
      try {
        const deviceInfo = await getDeviceInfo();
        
        // Also check push notification initialization
        if ('serviceWorker' in navigator) {
          try {
            const pushInit = await initPushNotifications();
            setNotificationStatus({
              ...deviceInfo,
              pushInit, // Add push initialization info
            });
          } catch (e) {
            console.error('Error initializing push:', e);
            setNotificationStatus(deviceInfo);
          }
        } else {
          setNotificationStatus(deviceInfo);
        }
      } catch (error) {
        console.error('Error getting device info:', error);
      }
    };
    
    checkStatus();

    // Refresh notification status periodically to detect changes
    const interval = setInterval(checkStatus, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Show toast when debug mode changes (but not on initial load)
  useEffect(() => {
    // Skip on initial mount
    if (prevDebugModeRef.current === isDebugMode) {
      return;
    }
    
    // Only show toast if it's a user-initiated change (not initial load)
    if (prevDebugModeRef.current !== undefined) {
      notify({
        type: 'info',
        message: isDebugMode ? t('settings.debugModeOn') : t('settings.debugModeOff')
      });
    }
    
    prevDebugModeRef.current = isDebugMode;
  }, [isDebugMode]);

  // Keyboard shortcut for debug mode: Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+D (or Cmd+Shift+D on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent duplicate calls with debounce
        if (debugModeToggleRef.current) {
          return;
        }
        
        debugModeToggleRef.current = true;
        
        setIsDebugMode((prev) => {
          const newValue = !prev;
          try {
            localStorage.setItem('mk_debug_mode', String(newValue));
          } catch {
            // ignore storage errors
          }
          return newValue;
        });
        
        // Reset debounce after 300ms
        setTimeout(() => {
          debugModeToggleRef.current = false;
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      debugModeToggleRef.current = false;
    };
  }, []);

  const handleUpgrade = () => {
    alert(t('settings.paymentFeatureComingSoon'));
  };

  const handleTestNotification = async (e) => {
    // Ensure this is called from a user interaction
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsTestingNotification(true);
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        throw new Error(t('settings.notificationsNotSupported'));
      }

      // Check if running on HTTPS or localhost (required for notifications)
      const isSecureContext = window.isSecureContext || 
                              location.protocol === 'https:' || 
                              location.hostname === 'localhost' || 
                              location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        throw new Error(t('settings.notificationsRequireHTTPS'));
      }

      // Check permission first
      let permission = Notification.permission;
      console.log('Current notification permission:', permission);
      
      // If permission is default, request it directly from user interaction
      if (permission === 'default') {
        console.log('Requesting notification permission...');
        // This MUST be called directly from user interaction to show popup
        permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        
        // Update status after permission request
        const deviceInfo = await getDeviceInfo();
        setNotificationStatus(deviceInfo);
      }

      if (permission === 'denied') {
        throw new Error(t('settings.notificationPermissionDenied'));
      }

      if (permission !== 'granted') {
        throw new Error(t('settings.notificationPermissionNotGranted'));
      }

      // iOS Safari only supports notifications in standalone mode
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const isStandaloneMode = window.navigator.standalone === true || 
                                window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandaloneMode) {
          throw new Error(t('settings.iosNotificationRequiresPWA'));
        }
      }

      // Send notification
      const options = {
        body: t('settings.testNotificationBody'),
        icon: '/img/app-icon.png',
        badge: '/img/app-icon.png',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false,
      };

      const notification = new Notification(t('settings.testNotificationTitle'), options);

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Update status
      const deviceInfo = await getDeviceInfo();
      setNotificationStatus(deviceInfo);

      notify({ 
        type: 'success', 
        message: t('settings.testNotificationSent') 
      });
    } catch (error) {
      notify({ 
        type: 'error', 
        message: error.message || t('settings.testNotificationFailed') 
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      <PageHeader icon={SettingsIcon} title={t('settings.title')} iconColor="from-gray-600 to-slate-700" />

      {/* Premium Section */}
      <div className={`relative overflow-hidden rounded-2xl shadow-md ${
          premiumInfo.premium
            ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500'
            : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600'
        } p-6 text-white`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <Crown className="h-6 w-6" />
          <h2 className="text-xl font-bold">
            {premiumInfo.premium ? t('settings.premium') : t('settings.upgradePremium')}
          </h2>
        </div>

        {premiumInfo.premium ? (
            <div className="space-y-3">
              <p className="text-sm opacity-90">
                {t('settings.thankYouPremium')} 🎉
              </p>
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 bg-white/20 backdrop-blur rounded-xl">
                  <p className="text-xs opacity-80">{t('settings.aiMessages')}</p>
                  <p className="text-lg font-bold">{t('settings.unlimited')}</p>
                </div>
                <div className="px-3 py-2 bg-white/20 backdrop-blur rounded-xl">
                  <p className="text-xs opacity-80">{t('settings.status')}</p>
                  <p className="text-sm font-bold flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    {t('settings.active')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm opacity-90">
                {t('settings.unlockAllPremiumFeatures')}
              </p>

              {/* Message usage */}
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-semibold text-sm">{t('settings.aiMessagesToday')}</span>
                  </div>
                  <span className="text-lg font-bold">
                    {premiumInfo.chatMessageCount}/{premiumInfo.limit}
                  </span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((premiumInfo.chatMessageCount / premiumInfo.limit) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm mt-2 opacity-75">
                  {premiumInfo.chatMessageCount >= premiumInfo.limit
                    ? t('settings.limitReachedUpgrade')
                    : t('settings.messagesRemaining', { count: premiumInfo.limit - premiumInfo.chatMessageCount })}
                </p>
              </div>

              {/* Features list */}
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  t('settings.featureUnlimitedAI'),
                  t('settings.featureAdvancedReports'),
                  t('settings.featureUnlimitedExport'),
                  t('settings.featurePrioritySupport'),
                  t('settings.featureEarlyAccess'),
                  t('settings.featureNoAds')
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                className="w-full py-3 bg-white text-purple-600 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Zap className="h-5 w-5" />
                {t('settings.upgradePremium')}
              </button>
            </div>
          )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-3 dark:text-gray-100">{t('settings.numberFormat')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.numberFormatDescription')}</p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4"
              checked={settings.numberFormat === 'vi-VN'}
              onChange={() => updateSettings({ numberFormat: 'vi-VN' })}
            />
            <div>
              <p className="font-medium text-sm dark:text-gray-200">{t('settings.vietnamese')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.example')}: 1.234.567,89</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4"
              checked={settings.numberFormat === 'en-US'}
              onChange={() => updateSettings({ numberFormat: 'en-US' })}
            />
            <div>
              <p className="font-medium text-sm dark:text-gray-200">{t('settings.english')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.example')}: 1,234,567.89</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-3 dark:text-gray-100">{t('settings.defaultCurrency')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.defaultCurrencyDescription')}</p>
        <Select
          value={settings.currency}
          onChange={(value) => updateSettings({ currency: value })}
          options={[
            { value: 'VND', label: 'VND – Vietnamese Dong', icon: '🇻🇳' },
            { value: 'USD', label: 'USD – US Dollar', icon: '🇺🇸' },
            { value: 'EUR', label: 'EUR – Euro', icon: '🇪🇺' },
            { value: 'JPY', label: 'JPY – Japanese Yen', icon: '🇯🇵' },
          ]}
          icon={Globe}
          placeholder={t('settings.selectCurrency')}
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-3 dark:text-gray-100">{t('settings.theme')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.themeDescription')}</p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4"
              checked={settings.theme === 'light'}
              onChange={() => updateSettings({ theme: 'light' })}
            />
            <span className="text-sm font-medium dark:text-gray-200">{t('settings.light')}</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4"
              checked={settings.theme === 'dark'}
              onChange={() => updateSettings({ theme: 'dark' })}
            />
            <span className="text-sm font-medium dark:text-gray-200">{t('settings.dark')}</span>
          </label>
        </div>
      </div>

      {/* Test Notification Section - Debug Mode Only */}
      {isDebugMode && (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold dark:text-gray-100">{t('settings.notifications')}</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.testNotificationDescription')}
        </p>

        {notificationStatus ? (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-2">
            {/* Service Worker Support Warning */}
            {!notificationStatus.serviceWorkerReady && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">
                  ⚠️ Service Worker không hoạt động
                </p>
                <p className="text-xs text-red-700 mb-2">
                  Service Worker yêu cầu <strong>HTTPS</strong> hoặc <strong>localhost</strong> để hoạt động.
                </p>
                <p className="text-xs text-red-700 mb-2">
                  Hiện tại: <code className="bg-red-100 px-1 rounded">{window.location.protocol}//{window.location.hostname}</code>
                </p>
                {notificationStatus.isIOS && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800 font-medium mb-1">📱 Trên iPhone:</p>
                    <p className="text-xs text-yellow-700">
                      Truy cập qua IP (192.168.x.x) không được coi là secure context. 
                      Bạn cần truy cập qua <strong>HTTPS</strong> hoặc sử dụng tunnel như <strong>ngrok</strong>.
                    </p>
                  </div>
                )}
                <div className="mt-2 text-xs text-red-700">
                  <p className="font-medium mb-1">Giải pháp:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Sử dụng <code className="bg-red-100 px-1 rounded">https://localhost:3000</code> (chỉ trên máy tính)</li>
                    <li>Setup HTTPS cho development server</li>
                    <li>Sử dụng ngrok: <code className="bg-red-100 px-1 rounded">ngrok http 3000</code></li>
                    <li>Deploy lên server có HTTPS</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Trạng thái PWA:</span>
              <span className={`font-medium ${notificationStatus.isStandaloneMode ? 'text-green-600' : 'text-orange-600'}`}>
                {notificationStatus.isStandaloneMode ? '✓ Đã cài đặt' : '✗ Chưa cài đặt'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Secure Context:</span>
              <span className={`font-medium ${notificationStatus.isSecureContext ? 'text-green-600' : 'text-red-600'}`}>
                {notificationStatus.isSecureContext ? '✓ HTTPS/localhost' : '✗ Không secure'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Service Worker:</span>
              <span className={`font-medium ${notificationStatus.serviceWorkerReady ? 'text-green-600' : 'text-red-600'}`}>
                {notificationStatus.serviceWorkerReady ? '✓ Sẵn sàng' : '✗ Chưa sẵn sàng'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Hỗ trợ thông báo:</span>
              <span className={`font-medium ${notificationStatus.notificationSupported ? 'text-green-600' : 'text-red-600'}`}>
                {notificationStatus.notificationSupported ? '✓ Có' : '✗ Không'}
              </span>
            </div>
            {notificationStatus.isIOS && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Push Manager:</span>
                  <span className={`font-medium ${notificationStatus.pushManagerAvailable ? 'text-green-600' : 'text-orange-600'}`}>
                    {notificationStatus.pushManagerAvailable ? '✓ Sẵn sàng' : '✗ Chưa sẵn sàng'}
                  </span>
                </div>
                {notificationStatus.pushManagerDebug && (
                  <div className="mt-1 text-xs text-gray-500">
                    Debug: hasPushManager={String(notificationStatus.pushManagerDebug.hasPushManager)}, 
                    SW Ready={String(notificationStatus.serviceWorkerReady)}
                  </div>
                )}
                {notificationStatus.pushInit && notificationStatus.pushInit.supported && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Push Permission:</span>
                    <span className={`font-medium ${
                      notificationStatus.pushInit.permissionState === 'granted' ? 'text-green-600' :
                      notificationStatus.pushInit.permissionState === 'denied' ? 'text-red-600' :
                      notificationStatus.pushInit.permissionState === 'prompt' ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {notificationStatus.pushInit.permissionState === 'granted' ? '✓ Đã cấp' :
                       notificationStatus.pushInit.permissionState === 'denied' ? '✗ Đã từ chối' :
                       notificationStatus.pushInit.permissionState === 'prompt' ? '? Chờ xác nhận' :
                       'N/A'}
                    </span>
                  </div>
                )}
                {notificationStatus.pushInit?.needsHomeScreen && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-xs text-yellow-800">
                      <p className="font-medium mb-1">⚠️ Cần thêm vào Home Screen:</p>
                      <p>pushManager chỉ xuất hiện sau khi thêm app vào Home Screen từ Safari.</p>
                    </div>
                  </div>
                )}
                {!notificationStatus.pushManagerAvailable && !notificationStatus.pushInit?.needsHomeScreen && (
                  <div className="mt-1 text-xs text-orange-600">
                    ⚠️ pushManager chưa sẵn sàng. Vui lòng reload trang sau khi thêm vào Home Screen.
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Quyền thông báo:</span>
              <span className={`font-medium ${
                notificationStatus.notificationPermission === 'granted' ? 'text-green-600' :
                notificationStatus.notificationPermission === 'denied' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {notificationStatus.notificationPermission === 'granted' ? '✓ Đã cấp' :
                 notificationStatus.notificationPermission === 'denied' ? '✗ Đã từ chối' :
                 notificationStatus.notificationPermission === 'default' ? '? Chưa xác định' :
                 '✗ Không hỗ trợ'}
              </span>
            </div>
            {notificationStatus.notificationPermission === 'denied' && (
              <div className="mt-2 text-xs text-red-600">
                💡 Tip: Xóa dữ liệu website trong cài đặt trình duyệt để reset quyền
              </div>
            )}
            {notificationStatus.isIOS && !notificationStatus.isStandaloneMode && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Smartphone className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium mb-1">Lưu ý cho iOS:</p>
                    <p>Trên iOS, thông báo chỉ hoạt động khi app được cài đặt như PWA. 
                    Vui lòng mở Safari, nhấn nút Share (⎋) và chọn "Add to Home Screen".</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('common.loading')}</p>
          </div>
        )}

        <div className="space-y-2">
          {notificationStatus && notificationStatus.notificationPermission === 'default' && (
            <button
              onClick={async (e) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                try {
                  if (!('Notification' in window)) {
                    notify({ type: 'error', message: 'Notifications không được hỗ trợ' });
                    return;
                  }
                  
                  const permission = await Notification.requestPermission();
                  const deviceInfo = await getDeviceInfo();
                  setNotificationStatus(deviceInfo);
                  
                  if (permission === 'granted') {
                    notify({ type: 'success', message: 'Đã cấp quyền thông báo!' });
                  } else if (permission === 'denied') {
                    notify({ type: 'error', message: 'Quyền thông báo đã bị từ chối' });
                  }
                } catch (error) {
                  notify({ type: 'error', message: error.message || 'Không thể yêu cầu quyền' });
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Yêu cầu quyền thông báo
            </button>
          )}
          
          <button
            onClick={handleTestNotification}
            disabled={
              isTestingNotification || 
              !notificationStatus?.notificationSupported ||
              (notificationStatus?.notificationPermission !== 'granted')
            }
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bell className="h-5 w-5" />
            {isTestingNotification ? t('common.loading') : t('settings.sendTestNotification')}
          </button>
          
          {/* Debug button to check service worker status */}
          <button
            onClick={async () => {
              console.log('=== DEBUG SERVICE WORKER ===');
              console.log('Service Worker in navigator:', 'serviceWorker' in navigator);
              console.log('Protocol:', window.location.protocol);
              console.log('Hostname:', window.location.hostname);
              console.log('Is Secure Context:', window.isSecureContext);
              
              if (!('serviceWorker' in navigator)) {
                notify({ 
                  type: 'error', 
                  message: 'Service Worker không được hỗ trợ trên trình duyệt này. Vui lòng dùng Chrome, Firefox, Safari, hoặc Edge.' 
                });
                return;
              }
              
              // Check secure context
              const isSecure = window.isSecureContext || 
                              window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
              
              if (!isSecure) {
                notify({ 
                  type: 'error', 
                  message: 'Service Worker chỉ hoạt động trên HTTPS hoặc localhost. Hiện tại: ' + window.location.protocol + '//' + window.location.hostname 
                });
                return;
              }
              
              try {
                // Check existing registrations
                const registrations = await navigator.serviceWorker.getRegistrations();
                console.log('Existing registrations:', registrations.length);
                
                if (registrations.length === 0) {
                  console.log('No service worker registered. Trying to register...');
                  notify({ 
                    type: 'warning', 
                    message: 'Chưa có Service Worker được register. Vui lòng reload trang để đăng ký.' 
                  });
                  return;
                }
                
                const registration = await navigator.serviceWorker.ready;
                console.log('Service Worker registration:', registration);
                console.log('Has pushManager:', 'pushManager' in registration);
                console.log('pushManager value:', registration.pushManager);
                console.log('Registration keys:', Object.keys(registration));
                console.log('Service Worker state:', registration.active?.state, registration.waiting?.state, registration.installing?.state);
                
                if (registration.pushManager) {
                  try {
                    const permissionState = await registration.pushManager.permissionState({ userVisibleOnly: true });
                    console.log('Permission state:', permissionState);
                  } catch (e) {
                    console.error('Error getting permission state:', e);
                  }
                } else {
                  console.warn('pushManager không có trong registration');
                }
                
                const deviceInfo = await getDeviceInfo();
                setNotificationStatus(deviceInfo);
                
                notify({ type: 'success', message: 'Đã kiểm tra Service Worker. Xem console để biết chi tiết.' });
              } catch (e) {
                console.error('Error:', e);
                notify({ type: 'error', message: 'Lỗi khi kiểm tra Service Worker: ' + e.message });
              }
            }}
            className="w-full py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors mt-2"
          >
            🔍 Debug Service Worker
          </button>
          
          {/* Button to unregister and re-register service worker */}
          <button
            onClick={async () => {
              try {
                console.log('=== UNREGISTER SERVICE WORKER ===');
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  console.log('Current registrations:', registrations.length);
                  
                  for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Unregistered:', registration.scope);
                  }
                  
                  notify({ type: 'success', message: 'Đã xóa Service Worker. Trang sẽ reload để đăng ký lại.' });
                  
                  // Reload after a short delay
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              } catch (e) {
                console.error('Error unregistering service worker:', e);
                notify({ type: 'error', message: 'Lỗi: ' + e.message });
              }
            }}
            className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors mt-2"
          >
            🔄 Reset Service Worker (Reload trang)
          </button>
        </div>

        {notificationStatus && !notificationStatus.notificationSupported && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Trình duyệt của bạn không hỗ trợ thông báo
          </p>
        )}

        {notificationStatus && notificationStatus.notificationPermission === 'denied' && (
          <div className="mt-2 space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                ⚠️ Quyền thông báo đã bị từ chối
              </p>
              <p className="text-xs text-red-700 mb-3">
                Quyền thông báo đã bị từ chối. Để bật lại, bạn cần reset quyền trong cài đặt trình duyệt:
              </p>
              
              <div className="space-y-2 text-xs text-red-700">
                {notificationStatus.isIOS ? (
                  <>
                    <div className="font-medium">Trên iOS Safari:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Mở <strong>Cài đặt</strong> trên iPhone/iPad</li>
                      <li>Cuộn xuống và chọn <strong>Safari</strong></li>
                      <li>Chọn <strong>Website Settings</strong> hoặc <strong>Cài đặt Website</strong></li>
                      <li>Tìm website này và bật <strong>Notifications</strong></li>
                      <li>Hoặc xóa dữ liệu website và thử lại</li>
                    </ol>
                  </>
                ) : notificationStatus.isAndroid ? (
                  <>
                    <div className="font-medium">Trên Chrome Android:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Mở Chrome, nhấn menu (⋮)</li>
                      <li>Chọn <strong>Settings</strong> → <strong>Site settings</strong></li>
                      <li>Tìm website này</li>
                      <li>Bật <strong>Notifications</strong></li>
                    </ol>
                  </>
                ) : (
                  <>
                    <div className="font-medium">Trên Chrome/Edge Desktop:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Nhấn vào biểu tượng <strong>🔒</strong> hoặc <strong>ℹ️</strong> bên trái thanh địa chỉ</li>
                      <li>Chọn <strong>Site settings</strong> hoặc <strong>Cài đặt trang</strong></li>
                      <li>Tìm mục <strong>Notifications</strong></li>
                      <li>Chọn <strong>Allow</strong> hoặc <strong>Cho phép</strong></li>
                      <li>Tải lại trang và thử lại</li>
                    </ol>
                    <div className="font-medium mt-2">Hoặc:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Nhấn <strong>F12</strong> để mở Developer Tools</li>
                      <li>Vào tab <strong>Application</strong> (Ứng dụng)</li>
                      <li>Chọn <strong>Notifications</strong> ở sidebar</li>
                      <li>Xóa website này và tải lại trang</li>
                    </ol>
                  </>
                )}
              </div>
            </div>
            
            <button
              onClick={async (e) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                try {
                  // Thử request lại permission (một số trình duyệt có thể cho phép)
                  if (!('Notification' in window)) {
                    notify({ type: 'error', message: 'Notifications không được hỗ trợ' });
                    return;
                  }
                  
                  // Một số trình duyệt có thể cho phép thử lại nếu đã reset
                  const permission = await Notification.requestPermission();
                  const deviceInfo = await getDeviceInfo();
                  setNotificationStatus(deviceInfo);
                  
                  if (permission === 'granted') {
                    notify({ type: 'success', message: 'Đã cấp quyền thông báo!' });
                  } else {
                    notify({ 
                      type: 'info', 
                      message: 'Vui lòng bật lại quyền trong cài đặt trình duyệt theo hướng dẫn ở trên' 
                    });
                  }
                } catch (error) {
                  notify({ type: 'error', message: error.message || 'Không thể yêu cầu quyền' });
                }
              }}
              className="w-full py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Thử yêu cầu quyền lại
            </button>
          </div>
        )}
      </div>
      )}

      {/* Debug Mode Indicator */}
      {isDebugMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm">🐛 Debug Mode</span>
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              (Nhấn Ctrl+Shift+D để tắt)
            </span>
          </div>
          <button
            onClick={() => {
              setIsDebugMode(false);
              try {
                localStorage.setItem('mk_debug_mode', 'false');
              } catch {
                // ignore
              }
              // Toast will be shown by useEffect when isDebugMode changes
            }}
            className="text-xs text-yellow-700 dark:text-yellow-300 hover:underline"
          >
            Tắt
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
