import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Wallet as WalletIcon,
  DollarSign,
  TrendingUp,
  AlertCircle,
  X
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import { useSettings } from '../contexts/SettingsContext';

const Transfer = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferData, setTransferData] = useState({
    from_wallet_id: '',
    to_wallet_id: '',
    amount: 0,
    description: ''
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await walletAPI.getAll();
      setWallets(res.data.wallets || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      alert('Lỗi khi tải danh sách ví');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await walletAPI.transfer(transferData);
      alert('Chuyển tiền thành công!');
      navigate('/wallets');
    } catch (error) {
      console.error('Error transferring:', error);
      alert(error.response?.data?.error || 'Lỗi khi chuyển tiền');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        icon={ArrowRightLeft}
        title="Chuyển tiền"
        subtitle="Chuyển tiền giữa các ví của bạn"
        iconColor="from-green-500 to-emerald-600"
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-slate-700">
        <form onSubmit={handleTransfer} className="space-y-5">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Chuyển tiền giữa các ví của bạn
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Từ ví *
            </label>
            <div className="relative">
              <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
              <select
                value={transferData.from_wallet_id}
                onChange={(e) => setTransferData({ ...transferData, from_wallet_id: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 transition-all font-semibold appearance-none"
                required
              >
                <option value="">Chọn ví nguồn</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatCurrency(w.balance || 0, w.currency, settings.numberFormat)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full">
              <ArrowRightLeft className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Đến ví *
            </label>
            <div className="relative">
              <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
              <select
                value={transferData.to_wallet_id}
                onChange={(e) => setTransferData({ ...transferData, to_wallet_id: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 transition-all font-semibold appearance-none"
                required
              >
                <option value="">Chọn ví đích</option>
                {wallets
                  .filter((w) => w.id !== parseInt(transferData.from_wallet_id))
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance || 0, w.currency, settings.numberFormat)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Số tiền *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="number"
                step="0.01"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 transition-all text-lg font-semibold"
                placeholder="0"
                required
                min="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Ghi chú
            </label>
            <input
              type="text"
              value={transferData.description}
              onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
              className="w-full px-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 transition-all"
              placeholder="Mô tả giao dịch..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/wallets')}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Chuyển tiền</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Transfer;

