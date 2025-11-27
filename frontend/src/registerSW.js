import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Có phiên bản mới! Bạn có muốn cập nhật không?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
  onRegistered(registration) {
    console.log('Service Worker registered:', registration);
  },
  onRegisterError(error) {
    console.error('Service Worker registration error:', error);
  },
});

// Check for updates every hour
setInterval(() => {
  updateSW(true);
}, 60 * 60 * 1000);

export default updateSW;
