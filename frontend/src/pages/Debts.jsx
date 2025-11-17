import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  Trash2,
  Edit,
  DollarSign,
  Calendar,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  User,
  History,
  Wallet
} from 'lucide-react';
import { debtsAPI, walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountLive } from '../lib/numberFormat';
import PageHeader from '../components/PageHeader';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Không định kỳ' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Hàng năm' },
];

const Debts = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payments, setPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const { toast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    fetchDebts();
    fetchStatistics();
  }, []);

  const fetchDebts = async () => {
    try {
      const response = await debtsAPI.getAll();
      setDebts(response.data.debts || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast({ type: 'error', message: 'Lỗi khi tải danh sách nợ' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await debtsAPI.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchPaymentHistory = async (debtId) => {
    try {
      const response = await debtsAPI.getPayments(debtId);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({ type: 'error', message: 'Lỗi khi tải lịch sử thanh toán' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    const parsedAmount = parseAmountInput(paymentAmountInput || String(paymentData.amount), { numberFormat: settings.numberFormat });
    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      toast({ type: 'warning', message: 'Vui lòng nhập số tiền thanh toán lớn hơn 0' });
      return;
    }

    if (parsedAmount > selectedDebt.remaining_amount) {
      toast({ type: 'warning', message: 'Số tiền thanh toán không được vượt quá số nợ còn lại' });
      return;
    }

    try {
      await debtsAPI.recordPayment(selectedDebt.id, {
        ...paymentData,
        amount: parsedAmount,
      });
      
      toast({ type: 'success', message: 'Ghi nhận thanh toán thành công!' });
      setShowPaymentModal(false);
      setPaymentData({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setPaymentAmountInput('');
      fetchDebts();
      fetchStatistics();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi ghi nhận thanh toán' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa khoản nợ này?')) return;
    try {
      await debtsAPI.delete(id);
      toast({ type: 'success', message: 'Xóa khoản nợ thành công!' });
      fetchDebts();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi xóa khoản nợ' });
    }
  };

  const handleEdit = (debt) => {
    navigate(`/debts/${debt.id}/edit`);
  };

  const openPaymentModal = (debt) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
  };

  const openPaymentHistory = async (debt) => {
    setSelectedDebt(debt);
    await fetchPaymentHistory(debt.id);
    setShowPaymentHistory(true);
  };

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (percentage, isLending) => {
    // For lending, more paid = better
    // For owing, more paid = better
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
      </div>
    );
  }

  // Separate debts into lending and owing
  const lendingDebts = debts.filter(d => d.is_lending && !d.is_paid);
  const owingDebts = debts.filter(d => !d.is_lending && !d.is_paid);
  const paidDebts = debts.filter(d => d.is_paid);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          icon={CreditCard} 
          title="Quản lý nợ"
          subtitle={`${owingDebts.length + lendingDebts.length} khoản đang hoạt động`}
          iconColor="from-red-500 to-rose-600"
        />
        <button
          onClick={() => navigate('/debts/new')}
          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo khoản nợ</span>
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 shadow-lg overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-red-100 text-xs font-medium">Tổng số nợ</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(statistics.total_debt, settings.currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-red-100">
                <span>{statistics.active_debts} khoản đang nợ</span>
                {statistics.overdue_debts > 0 && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {statistics.overdue_debts} quá hạn
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-xs font-medium">Tổng cho vay</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(statistics.total_lending, settings.currency)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-100">
                Người khác nợ bạn
              </p>
            </div>
          </div>

          <div className={`relative bg-gradient-to-br ${statistics.net_position >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'} rounded-2xl p-6 shadow-lg overflow-hidden group hover:shadow-xl transition-all`}>
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-xs font-medium">Vị thế ròng</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {statistics.net_position >= 0 ? '+' : '-'}{formatCurrency(Math.abs(statistics.net_position), settings.currency)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/90">
                {statistics.net_position >= 0 ? 'Được nợ nhiều hơn' : 'Đang nợ nhiều hơn'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Owing Debts */}
      {owingDebts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Các khoản đang nợ
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {owingDebts.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRecordPayment={openPaymentModal}
                onViewHistory={openPaymentHistory}
                getProgressColor={getProgressColor}
                getDaysUntil={getDaysUntil}
                settings={settings}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lending Debts */}
      {lendingDebts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Các khoản cho vay
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lendingDebts.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRecordPayment={openPaymentModal}
                onViewHistory={openPaymentHistory}
                getProgressColor={getProgressColor}
                getDaysUntil={getDaysUntil}
                settings={settings}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paid Debts */}
      {paidDebts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Đã thanh toán
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paidDebts.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRecordPayment={openPaymentModal}
                onViewHistory={openPaymentHistory}
                getProgressColor={getProgressColor}
                getDaysUntil={getDaysUntil}
                settings={settings}
                isPaid
              />
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Chưa có khoản nợ nào</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thêm khoản nợ để theo dõi và quản lý tốt hơn
            </p>
            <button
              onClick={() => navigate('/debts/new')}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Thêm khoản nợ đầu tiên
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full md:max-w-md md:rounded-2xl rounded-t-3xl md:rounded-b-2xl shadow-xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">Ghi nhận thanh toán</h3>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 md:p-6 space-y-4 md:space-y-5 pb-28 md:pb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 p-5 rounded-xl border border-gray-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${selectedDebt.is_lending ? 'bg-green-500' : 'bg-red-500'}`}>
                    {selectedDebt.is_lending ? (
                      <TrendingUp className="h-4 w-4 text-white" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Khoản nợ</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{selectedDebt.name}</p>
                  </div>
                </div>
                <div className="border-t border-gray-300 dark:border-slate-600 pt-3 mt-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Số nợ còn lại</p>
                  <p className={`text-2xl font-bold ${selectedDebt.is_lending ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(selectedDebt.remaining_amount, settings.currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Số tiền thanh toán <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={paymentAmountInput}
                    onChange={e => {
                      const formatted = formatAmountLive(e.target.value, { numberFormat: settings.numberFormat });
                      setPaymentAmountInput(formatted);
                      const parsed = parseAmountInput(formatted, { numberFormat: settings.numberFormat });
                      setPaymentData(prev => ({ ...prev, amount: parsed || 0 }));
                    }}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ngày thanh toán
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={e => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ghi chú
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={e => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  className="flex min-h-[100px] w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all resize-none"
                  placeholder="Ghi chú về lần thanh toán này..."
                />
              </div>

              <div className="fixed md:static bottom-16 md:bottom-auto left-0 right-0 flex gap-2 md:gap-3 p-4 md:p-0 md:pt-5 bg-white/95 dark:bg-slate-800/95 md:bg-white md:dark:bg-slate-800 backdrop-blur-md md:backdrop-blur-none border-t border-gray-200 dark:border-slate-700 z-40">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 md:flex-none px-4 md:px-5 py-2.5 h-10 md:h-auto bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm md:text-base flex items-center justify-center"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 h-10 md:h-auto bg-gradient-to-r ${
                    selectedDebt.is_lending ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600'
                  } text-white rounded-lg font-semibold hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Ghi nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowPaymentHistory(false)}>
          <div className="bg-white dark:bg-slate-800 w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl md:rounded-b-2xl shadow-xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">Lịch sử thanh toán</h3>
              <button 
                onClick={() => setShowPaymentHistory(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 p-5 rounded-xl border border-gray-200 dark:border-slate-600 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${selectedDebt.is_lending ? 'bg-green-500' : 'bg-red-500'}`}>
                    {selectedDebt.is_lending ? (
                      <TrendingUp className="h-5 w-5 text-white" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Khoản nợ</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedDebt.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-300 dark:border-slate-600">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tổng</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedDebt.total_amount, settings.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Còn lại</p>
                    <p className={`font-bold ${selectedDebt.is_lending ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(selectedDebt.remaining_amount, settings.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {payments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {payments.map(payment => (
                    <div key={payment.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                              {formatCurrency(payment.amount, settings.currency)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(payment.payment_date).toLocaleDateString('vi-VN', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 pl-11 italic">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Chưa có lịch sử thanh toán</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Ghi nhận thanh toán đầu tiên để theo dõi</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Debt Card Component
const DebtCard = ({ debt, onEdit, onDelete, onRecordPayment, onViewHistory, getProgressColor, getDaysUntil, settings, isPaid = false }) => {
  const daysUntil = getDaysUntil(debt.next_payment_date);
  const isOverdue = debt.is_overdue;

  return (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-xl border ${
      isOverdue && !isPaid
        ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10'
        : 'border-gray-200 dark:border-slate-700'
    } hover:border-${debt.is_lending ? 'green' : 'red'}-300 dark:hover:border-${debt.is_lending ? 'green' : 'red'}-600 hover:shadow-lg transition-all overflow-hidden ${isPaid ? 'opacity-70' : ''}`}>
      {/* Accent border on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${
        debt.is_lending ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'
      }`} />
      
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {debt.is_lending ? (
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              )}
              <h4 className="font-bold text-gray-900 dark:text-gray-100">{debt.name}</h4>
            </div>
            {debt.creditor_name && (
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 ml-8">
                <User className="h-3.5 w-3.5" />
                {debt.creditor_name}
              </p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(debt)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
              title="Chỉnh sửa"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(debt.id)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
              title="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Tiến độ thanh toán</span>
              <span className="font-bold">{debt.progress_percentage.toFixed(1)}%</span>
            </div>
            <div className="relative w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(debt.progress_percentage, debt.is_lending)}`}
                style={{ width: `${debt.progress_percentage}%` }}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tổng số tiền</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{formatCurrency(debt.total_amount, settings.currency)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Còn lại</p>
              <p className={`font-bold text-sm ${debt.is_lending ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(debt.remaining_amount, settings.currency)}
              </p>
            </div>
          </div>

          {/* Interest rate */}
          {debt.interest_rate > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span>Lãi suất: <strong className="text-gray-900 dark:text-gray-100">{debt.interest_rate}%/năm</strong></span>
            </div>
          )}

          {/* Next payment date */}
          {debt.next_payment_date && !isPaid && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg font-medium ${
              isOverdue 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                : daysUntil <= 3 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}>
              <Calendar className="h-4 w-4" />
              <div className="flex-1">
                <span>
                  {isOverdue ? 'Quá hạn!' : 
                   daysUntil === 0 ? 'Hôm nay' :
                   daysUntil === 1 ? 'Ngày mai' :
                   `Còn ${daysUntil} ngày`}
                </span>
                {debt.next_payment_amount && (
                  <span className="block text-xs mt-0.5 opacity-90">
                    Số tiền: {formatCurrency(debt.next_payment_amount, settings.currency)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Paid badge */}
          {isPaid && (
            <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle className="h-4 w-4" />
              <span>Đã thanh toán đầy đủ</span>
            </div>
          )}

          {/* Action buttons */}
          {!isPaid && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onRecordPayment(debt)}
                className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${
                  debt.is_lending ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600'
                } text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center justify-center gap-1.5`}
              >
                <DollarSign className="h-4 w-4" />
                Ghi nhận
              </button>
              <button
                onClick={() => onViewHistory(debt)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center"
                title="Lịch sử"
              >
                <History className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Debts;

