import { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Wallet as WalletIcon,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Check,
  AlertCircle
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import { useSettings } from '../contexts/SettingsContext';

const Wallets = () => {
  const { settings } = useSettings();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: 0,
    description: '',
    currency: 'VND',
    is_default: false,
  });
  const [transferData, setTransferData] = useState({
    from_wallet_id: '',
    to_wallet_id: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getAll();
      const walletsData = response?.data?.wallets || response?.data || [];
      setWallets(Array.isArray(walletsData) ? walletsData : []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      setWallets([]);
      alert('Lỗi khi tải danh sách ví');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWallet) {
        await walletAPI.update(editingWallet.id, formData);
        alert('Cập nhật ví thành công!');
      } else {
        await walletAPI.create(formData);
        alert('Tạo ví mới thành công!');
      }
      setShowModal(false);
      setEditingWallet(null);
      setFormData({ name: '', balance: 0, description: '', currency: 'VND', is_default: false });
      fetchWallets();
    } catch (error) {
      console.error('Error saving wallet:', error);
      alert(error.response?.data?.error || 'Lỗi khi lưu ví');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await walletAPI.transfer(transferData);
      alert('Chuyển tiền thành công!');
      setShowTransferModal(false);
      setTransferData({ from_wallet_id: '', to_wallet_id: '', amount: 0, description: '' });
      fetchWallets();
    } catch (error) {
      console.error('Error transferring:', error);
      alert(error.response?.data?.error || 'Lỗi khi chuyển tiền');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa ví này?')) return;
    try {
      await walletAPI.delete(id);
      alert('Xóa ví thành công!');
      fetchWallets();
    } catch (error) {
      console.error('Error deleting wallet:', error);
      alert(error.response?.data?.error || 'Lỗi khi xóa ví');
    }
  };

  const openEditModal = (wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      balance: wallet.balance,
      description: wallet.description || '',
      currency: wallet.currency,
      is_default: wallet.is_default,
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
      </div>
    );
  }

  const totalBalance = Array.isArray(wallets) ? wallets.reduce((sum, w) => sum + (w.balance || 0), 0) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          icon={WalletIcon} 
          title="Ví của tôi"
          subtitle={`Tổng: ${formatCurrency(totalBalance, settings.currency, settings.numberFormat)}`}
          iconColor="from-blue-500 to-cyan-600"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Chuyển</span>
          </button>
          <button
            onClick={() => {
              setEditingWallet(null);
              setFormData({ name: '', balance: 0, description: '', currency: 'VND', is_default: false });
              setShowModal(true);
            }}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="inline-block mb-4">
            <div className="p-6 bg-gray-100 rounded-2xl">
              <WalletIcon className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có ví nào</h3>
          <p className="text-sm text-gray-600 mb-4">Hãy tạo ví đầu tiên của bạn</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo ví</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 backdrop-blur rounded-lg">
                      <WalletIcon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-white font-semibold text-sm">{wallet.name}</p>
                  </div>
                  {wallet.is_default && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/30 backdrop-blur rounded-full">
                      <Check className="h-3 w-3 text-white" />
                      <span className="text-[10px] font-bold text-white">Mặc định</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/70 mb-1">Số dư</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(wallet.balance || 0, wallet.currency, settings.numberFormat)}
                  </p>
                </div>
                {wallet.description && (
                  <p className="text-xs text-white/70 mt-2 line-clamp-1">{wallet.description}</p>
                )}
              </div>

              {/* Card Actions */}
              <div className="p-3 flex items-center justify-end gap-2 bg-gray-50">
                <button
                  onClick={() => openEditModal(wallet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium border border-blue-200"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(wallet.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium border border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal thêm/sửa ví */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200"
          >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {editingWallet ? 'Sửa ví' : 'Thêm ví mới'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tên ví *</label>
                  <div className="relative">
                    <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      placeholder="Ví của tôi"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số dư ban đầu</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    rows="3"
                    placeholder="Mô tả về ví..."
                  />
                </div>

                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="default-wallet"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="default-wallet" className="flex items-center space-x-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span>Đặt làm ví mặc định</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingWallet(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-md transition-all"
                  >
                    {editingWallet ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Modal chuyển tiền */}
      {showTransferModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200"
          >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Chuyển tiền
                </h2>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleTransfer} className="space-y-5">
                <div className="p-4 bg-blue-50 rounded-2xl flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Chuyển tiền giữa các ví của bạn
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Từ ví *</label>
                  <div className="relative">
                    <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={transferData.from_wallet_id}
                      onChange={(e) => setTransferData({ ...transferData, from_wallet_id: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-semibold appearance-none"
                      required
                    >
                      <option value="">Chọn ví nguồn</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance || 0)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full">
                    <ArrowRightLeft className="h-6 w-6 text-green-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Đến ví *</label>
                  <div className="relative">
                    <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={transferData.to_wallet_id}
                      onChange={(e) => setTransferData({ ...transferData, to_wallet_id: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-semibold appearance-none"
                      required
                    >
                      <option value="">Chọn ví đích</option>
                      {wallets.filter(w => w.id !== parseInt(transferData.from_wallet_id)).map((w) => (
                        <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance || 0)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={transferData.amount}
                      onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-lg font-semibold"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú</label>
                  <input
                    type="text"
                    value={transferData.description}
                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                    className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="Mô tả giao dịch..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
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
        )}
    </div>
  );
};

export default Wallets;
