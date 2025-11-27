import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeScanner from '../components/QRCodeScanner';
import { walletAPI } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Scan as ScanIcon } from 'lucide-react';

const Scan = () => {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(true);

  const handleQRScanSuccess = async (qrDataObj) => {
    try {
      let payload = { can_edit: true };
      
      // Handle URL-based share
      if (qrDataObj.from_url && qrDataObj.token && qrDataObj.wallet_id) {
        payload.token = qrDataObj.token;
        payload.wallet_id = qrDataObj.wallet_id;
      } else {
        // Handle base64 encoded QR data
        const qrJson = JSON.stringify(qrDataObj);
        const qrEncoded = btoa(qrJson);
        payload.qr_data = qrEncoded;
      }
      
      const res = await walletAPI.acceptShare(payload);
      alert(`Đã chấp nhận chia sẻ ví "${res.data.wallet.name}" thành công!`);
      setShowScanner(false);
      navigate('/wallets');
    } catch (error) {
      console.error('Error accepting share:', error);
      alert(error.response?.data?.error || 'Lỗi khi chấp nhận chia sẻ ví');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <PageHeader
        icon={ScanIcon}
        title="Quét QR Code"
        subtitle="Quét mã QR để chia sẻ ví"
        iconColor="from-purple-500 to-pink-600"
      />

      {showScanner && (
        <QRCodeScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => {
            setShowScanner(false);
            navigate('/wallets');
          }}
        />
      )}
    </div>
  );
};

export default Scan;

