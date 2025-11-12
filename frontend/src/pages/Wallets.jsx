import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Wallet as WalletIcon,
  ArrowRightLeft,
  DollarSign,
  Sparkles,
  CreditCard,
  TrendingUp,
  Check,
  AlertCircle
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';

const Wallets = () => {
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
      setWallets(response.data.wallets || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
        />
        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
      </div>
    );
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Animated Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Background Blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-300/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl"
              >
                <WalletIcon className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Ví của tôi
                </h1>
                <p className="text-gray-600 mt-1 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Tổng: {formatCurrency(totalBalance)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <ArrowRightLeft className="h-5 w-5" />
                <span className="hidden md:inline">Chuyển tiền</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setEditingWallet(null);
                  setFormData({ name: '', balance: 0, description: '', currency: 'VND', is_default: false });
                  setShowModal(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm ví</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-16 text-center shadow-2xl border border-white/20"
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <div className="p-8 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl">
              <WalletIcon className="h-20 w-20 text-blue-500" />
            </div>
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Chưa có ví nào</h3>
          <p className="text-gray-600 mb-6">Hãy tạo ví đầu tiên của bạn</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Tạo ví đầu tiên</span>
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet, index) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-6 shadow-2xl"
            >
              {/* Card Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white"></div>
                <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-white"></div>
              </div>

              {/* Card Content */}
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{wallet.name}</h3>
                      {wallet.is_default && (
                        <span className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 text-xs bg-white/30 text-white rounded-full backdrop-blur-sm">
                          <Check className="h-3 w-3" />
                          <span>Mặc định</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-white/80 font-semibold">{wallet.currency}</span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-white/80 mb-1">Số dư</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(wallet.balance || 0)}
                  </p>
                </div>

                {wallet.description && (
                  <p className="text-sm text-white/90 mb-4 line-clamp-2">{wallet.description}</p>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openEditModal(wallet)}
                    className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold flex items-center justify-center space-x-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Sửa</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(wallet.id)}
                    className="flex-1 px-3 py-2 bg-red-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-red-600 transition-all font-semibold flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal thêm/sửa ví */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass backdrop-blur-2xl bg-white/90 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20"
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
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowModal(false);
                      setEditingWallet(null);
                    }}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    {editingWallet ? 'Cập nhật' : 'Tạo mới'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal chuyển tiền */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass backdrop-blur-2xl bg-white/90 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20"
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
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span>Chuyển tiền</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wallets;
