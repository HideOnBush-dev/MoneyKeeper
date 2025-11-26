import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Share2,
  Users,
  QrCode
} from 'lucide-react';
import { walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import { useSettings } from '../contexts/SettingsContext';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { useTranslation } from 'react-i18next';

const Wallets = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSharedUsersModal, setShowSharedUsersModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null);
  const [sharingWallet, setSharingWallet] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareFormData, setShareFormData] = useState({
    username: '',
    can_edit: true
  });
  const [formData, setFormData] = useState({
    name: '',
    balance: 0,
    description: '',
    currency: 'VND',
    is_default: false,
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
      alert(t('wallet.errorLoadingWallets'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWallet) {
        await walletAPI.update(editingWallet.id, formData);
        alert(t('wallet.walletUpdateSuccess'));
      } else {
        await walletAPI.create(formData);
        alert(t('wallet.walletCreateSuccess'));
      }
      setShowModal(false);
      setEditingWallet(null);
      setFormData({ name: '', balance: 0, description: '', currency: 'VND', is_default: false });
      fetchWallets();
    } catch (error) {
      console.error('Error saving wallet:', error);
      alert(error.response?.data?.error || t('wallet.errorLoadingWallets'));
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
    if (!confirm(t('wallet.confirmDeleteWallet'))) return;
    try {
      await walletAPI.delete(id);
      alert(t('wallet.walletDeleteSuccess'));
      fetchWallets();
    } catch (error) {
      console.error('Error deleting wallet:', error);
      alert(error.response?.data?.error || t('wallet.errorLoadingWallets'));
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareFormData.username) {
      alert(t('wallet.enterUsernameOrEmail'));
      return;
    }
    try {
      await walletAPI.share(sharingWallet.id, shareFormData);
      alert(t('wallet.shareSuccess'));
      setShowShareModal(false);
      setShareFormData({ username: '', can_edit: true });
      setSharingWallet(null);
      fetchWallets();
    } catch (error) {
      console.error('Error sharing wallet:', error);
      alert(error.response?.data?.error || t('wallet.errorLoadingWallets'));
    }
  };

  const handleUnshare = async (userId) => {
    if (!confirm(t('wallet.confirmUnshare'))) return;
    try {
      await walletAPI.unshare(sharingWallet.id, userId);
      alert(t('wallet.unshareSuccess'));
      const res = await walletAPI.getSharedUsers(sharingWallet.id);
      setSharedUsers(res.data.shared_users || []);
      fetchWallets();
    } catch (error) {
      console.error('Error unsharing wallet:', error);
      alert(error.response?.data?.error || t('wallet.errorLoadingWallets'));
    }
  };

  const handleGenerateQR = async (wallet) => {
    try {
      const res = await walletAPI.getShareQR(wallet.id);
      // Use share_url for QR code display, but keep qr_data for API
      setQrData({
        url: res.data.share_url,
        encoded: res.data.qr_data,
        expires_at: res.data.expires_at
      });
      setSharingWallet(wallet);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert(error.response?.data?.error || t('wallet.qrCodeError'));
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
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
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
          title={t('wallet.myWallets')}
          subtitle={`${t('common.total')}: ${formatCurrency(totalBalance, settings.currency, settings.numberFormat)}`}
          iconColor="from-blue-500 to-cyan-600"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/transfer')}
            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.transfer')}</span>
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
            <span>{t('common.add')}</span>
          </button>
        </div>
      </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="inline-block mb-4">
            <div className="p-6 bg-gray-100 dark:bg-slate-700 rounded-2xl">
              <WalletIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t('wallet.noWallets')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('wallet.createFirstWallet')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('wallet.createWallet')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 p-6 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shadow-lg">
                        <WalletIcon className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-white font-bold text-base">{wallet.name}</p>
                    </div>
                    {wallet.is_default && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400/30 backdrop-blur-md rounded-full shadow-md">
                        <Check className="h-3.5 w-3.5 text-white" />
                        <span className="text-xs font-bold text-white">{t('wallet.defaultWallet')}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/80 mb-2 font-medium">{t('wallet.balance')}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {formatCurrency(wallet.balance || 0, wallet.currency, settings.numberFormat)}
                    </p>
                  </div>
                  {wallet.description && (
                    <p className="text-xs text-white/75 mt-3 line-clamp-2 leading-relaxed">{wallet.description}</p>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-700/50 dark:to-slate-800">
                {!wallet.is_shared ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleGenerateQR(wallet)}
                      className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-105 transition-all duration-200 text-sm font-semibold border border-indigo-100 dark:border-indigo-800/50 shadow-sm hover:shadow-md"
                      title={t('wallet.scanQR')}
                    >
                      <QrCode className="h-5 w-5" />
                      <span className="text-xs">{t('wallet.scanQR')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSharingWallet(wallet);
                        setShowShareModal(true);
                      }}
                      className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105 transition-all duration-200 text-sm font-semibold border border-green-100 dark:border-green-800/50 shadow-sm hover:shadow-md"
                    >
                      <Share2 className="h-5 w-5" />
                      <span className="text-xs">{t('common.share')}</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await walletAPI.getSharedUsers(wallet.id);
                          setSharedUsers(res.data.shared_users || []);
                          setSharingWallet(wallet);
                          setShowSharedUsersModal(true);
                        } catch (error) {
                          console.error('Error fetching shared users:', error);
                          alert(t('wallet.errorLoadingWallets'));
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105 transition-all duration-200 text-sm font-semibold border border-purple-100 dark:border-purple-800/50 shadow-sm hover:shadow-md"
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-xs">{t('wallet.sharedUsers')}</span>
                    </button>
                    <button
                      onClick={() => openEditModal(wallet)}
                      className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 transition-all duration-200 text-sm font-semibold border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-md"
                    >
                      <Edit2 className="h-5 w-5" />
                      <span className="text-xs">{t('common.edit')}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(wallet.id)}
                      className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105 transition-all duration-200 text-sm font-semibold border border-red-100 dark:border-red-800/50 shadow-sm hover:shadow-md col-span-2 sm:col-span-1"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="text-xs">{t('common.delete')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                      {t('wallet.sharedBy')} {wallet.owner?.username || t('common.none')}
                    </span>
                  </div>
                )}
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
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {editingWallet ? t('wallet.editWallet') : t('wallet.newWallet')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('wallet.walletName')} *</label>
                <div className="relative">
                  <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all font-semibold"
                    placeholder={t('wallet.walletName')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('wallet.initialBalance')}</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                    className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all text-lg font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('wallet.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all resize-none"
                  rows="3"
                  placeholder={t('wallet.description')}
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <input
                  type="checkbox"
                  id="default-wallet"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="default-wallet" className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{t('wallet.setAsDefault')}</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingWallet(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-md transition-all"
                >
                  {editingWallet ? t('wallet.update') : t('wallet.createNew')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal chuyển tiền */}
      {/* Share Wallet Modal */}
      {showShareModal && sharingWallet && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowShareModal(false);
            setShareFormData({ username: '', can_edit: true });
            setSharingWallet(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {t('wallet.shareWalletTitle')} "{sharingWallet.name}"
              </h2>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareFormData({ username: '', can_edit: true });
                  setSharingWallet(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleShare} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {t('wallet.usernameOrEmail')} *
                </label>
                <input
                  type="text"
                  value={shareFormData.username}
                  onChange={(e) => setShareFormData({ ...shareFormData, username: e.target.value })}
                  placeholder={t('wallet.enterUsernameOrEmail')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareFormData.can_edit}
                    onChange={(e) => setShareFormData({ ...shareFormData, can_edit: e.target.checked })}
                    className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('wallet.allowEdit')}
                  </span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    setShareFormData({ username: '', can_edit: true });
                    setSharingWallet(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {t('common.share')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Users Modal */}
      {showSharedUsersModal && sharingWallet && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSharedUsersModal(false);
            setSharedUsers([]);
            setSharingWallet(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t('wallet.sharedUsers')} "{sharingWallet.name}"
              </h2>
              <button
                onClick={() => {
                  setShowSharedUsersModal(false);
                  setSharedUsers([]);
                  setSharingWallet(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            {sharedUsers.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('wallet.noSharedUsers')}
              </p>
            ) : (
              <div className="space-y-3">
                {sharedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {user.can_edit ? t('wallet.canEdit') : t('wallet.viewOnly')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnshare(user.id)}
                      className="px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
                    >
                      {t('common.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {showQRModal && sharingWallet && qrData && (
        <QRCodeGenerator
          qrData={qrData}
          walletName={sharingWallet.name}
          onClose={() => {
            setShowQRModal(false);
            setQrData(null);
            setSharingWallet(null);
          }}
        />
      )}

    </div>
  );
};

export default Wallets;
