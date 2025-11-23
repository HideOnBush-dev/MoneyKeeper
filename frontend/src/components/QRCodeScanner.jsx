import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

const QRCodeScanner = ({ onScanSuccess, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (html5QrCodeRef.current && scanning) {
        html5QrCodeRef.current.stop().catch(() => { });
      }
    };
  }, [scanning]);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Calculate QR box size based on viewport (very small on mobile)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 640; // sm breakpoint
      const qrBoxSize = isMobile 
        ? Math.min(150, Math.min(viewportWidth, viewportHeight * 0.4) * 0.5) 
        : Math.min(250, viewportWidth * 0.7);
      
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: qrBoxSize, height: qrBoxSize },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Success callback
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Error callback - ignore most errors, they're just scanning attempts
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    await stopScanning();

    try {
      let qrData;

      // Check if it's a URL with token parameter
      if (decodedText.includes('token=') && decodedText.includes('wallet_id=')) {
        try {
          // Try to parse as URL
          const url = new URL(decodedText);
          const token = url.searchParams.get('token');
          const walletId = url.searchParams.get('wallet_id');

          if (token && walletId) {
            qrData = {
              type: 'wallet_share',
              token: token,
              wallet_id: parseInt(walletId),
              from_url: true
            };
          }
        } catch (urlErr) {
          // If URL parsing fails, try to extract from string manually
          const tokenMatch = decodedText.match(/token=([^&]+)/);
          const walletIdMatch = decodedText.match(/wallet_id=(\d+)/);
          if (tokenMatch && walletIdMatch) {
            qrData = {
              type: 'wallet_share',
              token: tokenMatch[1],
              wallet_id: parseInt(walletIdMatch[1]),
              from_url: true
            };
          }
        }
      }

      // If not URL, try to parse as base64 encoded JSON
      if (!qrData) {
        try {
          const decoded = atob(decodedText);
          qrData = JSON.parse(decoded);
        } catch {
          // If not base64, try direct JSON
          try {
            qrData = JSON.parse(decodedText);
          } catch {
            throw new Error('Invalid QR code format');
          }
        }
      }

      if (qrData && (qrData.type === 'wallet_share' || qrData.from_url)) {
        onScanSuccess(qrData);
      } else {
        setError('Mã QR không hợp lệ. Vui lòng quét lại mã QR chia sẻ ví.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('QR parse error:', err);
      setError('Không thể đọc mã QR. Vui lòng thử lại.');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100]">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-2 sm:p-6 w-full sm:max-w-md shadow-xl border border-gray-200 dark:border-slate-700 max-h-[60vh] sm:max-h-[95vh] flex flex-col sm:rounded-b-2xl">
        {/* Drag handle for mobile */}
        <div className="flex justify-center mb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
        
        <div className="flex items-center justify-between mb-1 sm:mb-4 flex-shrink-0">
          <h2 className="text-xs sm:text-xl font-bold text-gray-900 dark:text-white">
            Quét QR
          </h2>
          <button
            onClick={async () => {
              await stopScanning();
              onClose();
            }}
            className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-1 sm:space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-1 p-1 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[9px] sm:text-sm flex-shrink-0">
              <AlertCircle className="h-2.5 w-2.5 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-[9px] sm:text-sm">{error}</p>
            </div>
          )}

          <div className="relative w-full rounded-md sm:rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
            <div
              id="qr-reader"
              className="w-full"
              style={{ 
                minHeight: '150px',
                maxHeight: '28vh',
                height: 'auto'
              }}
            />
          </div>

          {!scanning && (
            <button
              onClick={startScanning}
              className="w-full flex items-center justify-center gap-1 px-2 sm:px-4 py-1.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-[10px] sm:text-base flex-shrink-0"
            >
              <Camera className="h-3 w-3 sm:h-5 sm:w-5" />
              <span>Bắt đầu</span>
            </button>
          )}

          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full px-2 sm:px-4 py-1.5 sm:py-3 bg-red-600 text-white rounded-md sm:rounded-xl font-semibold hover:bg-red-700 transition-colors text-[10px] sm:text-base flex-shrink-0"
            >
              Dừng
            </button>
          )}

          <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 text-center flex-shrink-0 hidden sm:block">
            Đặt mã QR vào khung hình để quét
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;

