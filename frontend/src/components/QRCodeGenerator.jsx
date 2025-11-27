import { useState } from 'react';
import QRCode from 'react-qr-code';
import { X, Copy, Check } from 'lucide-react';

const QRCodeGenerator = ({ qrData, walletName, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (qrData && qrData.url) {
      navigator.clipboard.writeText(qrData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrValue = qrData?.url || qrData;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            QR Code chia sẻ ví "{walletName}"
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-xl border-2 border-gray-200 dark:border-slate-600 flex justify-center">
            {qrValue && (
              <QRCode
                value={qrValue}
                size={256}
                level="H"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Quét mã QR này để chia sẻ ví
          </p>
          
          {qrData?.expires_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Mã QR hết hạn: {new Date(qrData.expires_at).toLocaleString('vi-VN')}
            </p>
          )}
          
          {qrValue && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Sao chép link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;

