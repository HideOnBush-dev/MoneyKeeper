import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Zap, Receipt, Plus } from 'lucide-react';
import { expenseAPI, walletAPI } from '../services/api';
import { useToast } from '../components/Toast';
import QuickTransactionForm from '../components/QuickTransactionForm';
import OCRScanner from '../components/OCRScanner';
import PageHeader from '../components/PageHeader';

const AddExpense = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getAll();
      setWallets(response.data.wallets || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOCRSuccess = (data) => {
    setOcrData(data);
    setShowOCR(false);
    toast({ type: 'success', message: 'Đã quét hóa đơn thành công!' });
  };

  const handleSuccess = () => {
    toast({ type: 'success', message: 'Đã thêm giao dịch thành công!' });
    navigate('/expenses');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
      {/* Back button */}
      <button
        onClick={() => navigate('/expenses')}
        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Quay lại</span>
      </button>
      
      <PageHeader icon={Plus} title="Thêm giao dịch" iconColor="from-blue-600 to-indigo-600" />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setShowOCR(!showOCR)}
          className={`p-3 rounded-xl border-2 transition-all ${
            showOCR
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'
          }`}
        >
          <Camera className="h-5 w-5 mx-auto mb-1.5" />
          <p className="text-xs font-semibold">Quét hóa đơn</p>
        </button>
        
        <button
          onClick={() => {
            setShowOCR(false);
            setOcrData(null);
          }}
          className={`p-3 rounded-xl border-2 transition-all ${
            !showOCR
              ? 'bg-green-50 border-green-500 text-green-700'
              : 'bg-white border-gray-200 hover:border-green-300 text-gray-700'
          }`}
        >
          <Zap className="h-5 w-5 mx-auto mb-1.5" />
          <p className="text-xs font-semibold">Nhập nhanh</p>
        </button>
      </div>

      {/* OCR Section (Collapsible) */}
      {showOCR && (
        <div className="mb-4 bg-blue-50 rounded-xl p-3 border border-blue-200">
          <OCRScanner onSuccess={handleOCRSuccess} />
        </div>
      )}

      {/* OCR Result Badge */}
      {ocrData && (
        <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Receipt className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-800">Dữ liệu OCR</p>
            <p className="text-[11px] text-green-600">
              {ocrData.amount?.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <button
            onClick={() => setOcrData(null)}
            className="text-xs text-green-600 hover:text-green-700 font-medium px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Transaction Form */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <QuickTransactionForm
          wallets={wallets}
          initialData={ocrData}
          onSuccess={handleSuccess}
          onCancel={() => navigate('/expenses')}
          variant="page"
        />
      </div>
    </div>
  );
};

export default AddExpense;

