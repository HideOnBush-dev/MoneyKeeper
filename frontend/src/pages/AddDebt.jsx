import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, DollarSign, TrendingDown, TrendingUp, User, Calendar, Percent, Wallet as WalletIcon, CheckCircle } from 'lucide-react';
import { debtsAPI, walletAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountLive } from '../lib/numberFormat';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Không định kỳ', icon: '⏸️' },
  { value: 'daily', label: 'Hàng ngày', icon: '📅' },
  { value: 'weekly', label: 'Hàng tuần', icon: '📆' },
  { value: 'monthly', label: 'Hàng tháng', icon: '🗓️' },
  { value: 'yearly', label: 'Hàng năm', icon: '📅' },
];

const AddDebt = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    creditor_name: '',
    total_amount: 0,
    interest_rate: 0,
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_frequency: '',
    next_payment_date: '',
    next_payment_amount: 0,
    description: '',
    is_lending: false,
    wallet_id: null,
  });
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [nextPaymentAmountInput, setNextPaymentAmountInput] = useState('');

  useEffect(() => {
    fetchWallets();
    if (isEdit) {
      fetchDebt();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getAll();
      setWallets(response.data.wallets || []);
      if (response.data.wallets?.length > 0 && !formData.wallet_id) {
        setFormData(prev => ({ ...prev, wallet_id: response.data.wallets[0].id }));
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchDebt = async () => {
    try {
      setLoading(true);
      const response = await debtsAPI.getById(id);
      const debt = response.data;
      
      setFormData({
        name: debt.name || '',
        creditor_name: debt.creditor_name || '',
        total_amount: debt.total_amount || 0,
        interest_rate: debt.interest_rate || 0,
        start_date: debt.start_date || new Date().toISOString().split('T')[0],
        due_date: debt.due_date || '',
        payment_frequency: debt.payment_frequency || '',
        next_payment_date: debt.next_payment_date || '',
        next_payment_amount: debt.next_payment_amount || 0,
        description: debt.description || '',
        is_lending: debt.is_lending || false,
        wallet_id: debt.wallet_id || null,
      });
      
      setTotalAmountInput(formatAmountLive(debt.total_amount || 0, { numberFormat: settings.numberFormat }));
      if (debt.next_payment_amount) {
        setNextPaymentAmountInput(formatAmountLive(debt.next_payment_amount, { numberFormat: settings.numberFormat }));
      }
    } catch (error) {
      console.error('Error fetching debt:', error);
      toast({ type: 'error', message: 'Lỗi khi tải khoản nợ' });
      navigate('/debts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parsedTotal = parseAmountInput(totalAmountInput || String(formData.total_amount), { numberFormat: settings.numberFormat });
    
    if (!parsedTotal || parsedTotal <= 0) {
      toast({ type: 'error', message: 'Vui lòng nhập tổng số tiền hợp lệ' });
      return;
    }

    if (!formData.name.trim()) {
      toast({ type: 'error', message: 'Vui lòng nhập tên khoản nợ' });
      return;
    }

    const parsedNextPaymentAmount = formData.next_payment_amount 
      ? parseAmountInput(nextPaymentAmountInput || String(formData.next_payment_amount), { numberFormat: settings.numberFormat })
      : null;

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        creditor_name: formData.creditor_name || null,
        total_amount: parsedTotal,
        interest_rate: formData.interest_rate,
        start_date: formData.start_date,
        due_date: formData.due_date || null,
        payment_frequency: formData.payment_frequency || null,
        next_payment_date: formData.next_payment_date || null,
        next_payment_amount: parsedNextPaymentAmount,
        description: formData.description,
        is_lending: formData.is_lending,
        wallet_id: formData.wallet_id,
      };

      if (isEdit) {
        await debtsAPI.update(id, payload);
        toast({ type: 'success', message: 'Đã cập nhật khoản nợ thành công!' });
      } else {
        await debtsAPI.create(payload);
        toast({ type: 'success', message: 'Đã tạo khoản nợ thành công!' });
      }
      
      navigate('/debts');
    } catch (error) {
      console.error('Error saving debt:', error);
      toast({ 
        type: 'error', 
        message: error.response?.data?.error || 'Lỗi khi lưu khoản nợ' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (value, setter, formField) => {
    const formatted = formatAmountLive(value, { numberFormat: settings.numberFormat });
    setter(formatted);
    const parsed = parseAmountInput(formatted, { numberFormat: settings.numberFormat });
    setFormData(prev => ({ ...prev, [formField]: parsed || 0 }));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <button
          onClick={() => navigate('/debts')}
          className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4 md:mb-6"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Quay lại</span>
        </button>
        
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`p-3 md:p-4 bg-gradient-to-br ${formData.is_lending ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'} rounded-xl md:rounded-2xl shadow-lg`}>
            <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? 'Chỉnh sửa' : 'Tạo khoản nợ'}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-0.5 md:mt-1">
              {formData.is_lending ? 'Bạn cho vay' : 'Bạn đang nợ'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 pb-28 md:pb-4">
        {/* Debt Type */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">Loại khoản nợ</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_lending: false }))}
              className={`relative p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all ${
                !formData.is_lending
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 active:scale-95'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3">
                <div className={`p-2 rounded-lg ${
                  !formData.is_lending ? 'bg-red-500' : 'bg-gray-200 dark:bg-slate-700'
                }`}>
                  <TrendingDown className={`h-4 w-4 md:h-5 md:w-5 ${!formData.is_lending ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <div className="text-center md:text-left">
                  <p className={`font-semibold text-sm md:text-base ${!formData.is_lending ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    Đang nợ
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Trả lại</p>
                </div>
              </div>
              {!formData.is_lending && (
                <div className="absolute top-1 right-1 md:top-2 md:right-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, is_lending: true }))}
              className={`relative p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all ${
                formData.is_lending
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 active:scale-95'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3">
                <div className={`p-2 rounded-lg ${
                  formData.is_lending ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                }`}>
                  <TrendingUp className={`h-4 w-4 md:h-5 md:w-5 ${formData.is_lending ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <div className="text-center md:text-left">
                  <p className={`font-semibold text-sm md:text-base ${formData.is_lending ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    Cho vay
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Hoàn lại</p>
                </div>
              </div>
              {formData.is_lending && (
                <div className="absolute top-1 right-1 md:top-2 md:right-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Thông tin cơ bản</h2>
          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tên khoản nợ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={formData.is_lending ? 'VD: Cho Nguyễn Văn A vay' : 'VD: Vay ngân hàng mua nhà'}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formData.is_lending ? 'Người vay' : 'Người/Tổ chức cho vay'}
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={formData.creditor_name}
                  onChange={e => setFormData(prev => ({ ...prev, creditor_name: e.target.value }))}
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                  placeholder={formData.is_lending ? 'VD: Nguyễn Văn A' : 'VD: Ngân hàng Vietcombank'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tổng số tiền <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={totalAmountInput}
                    onChange={e => handleAmountChange(e.target.value, setTotalAmountInput, 'total_amount')}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Lãi suất (%/năm)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Percent className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={e => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Lịch thanh toán</h2>
          <div className="space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ngày bắt đầu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Hạn cuối
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tần suất trả nợ
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                {FREQUENCY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, payment_frequency: option.value }))}
                    className={`relative p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all active:scale-95 ${
                      formData.payment_frequency === option.value
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                        : 'border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl mb-1 md:mb-2">{option.icon}</div>
                      <div className={`text-[10px] md:text-xs font-semibold leading-tight ${
                        formData.payment_frequency === option.value
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {option.label.replace('Hàng ', '')}
                      </div>
                    </div>
                    {formData.payment_frequency === option.value && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {formData.payment_frequency && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ngày trả tiếp theo
                  </label>
                  <input
                    type="date"
                    value={formData.next_payment_date}
                    onChange={e => setFormData(prev => ({ ...prev, next_payment_date: e.target.value }))}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Số tiền trả
                  </label>
                  <input
                    type="text"
                    value={nextPaymentAmountInput}
                    onChange={e => handleAmountChange(e.target.value, setNextPaymentAmountInput, 'next_payment_amount')}
                    className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Thông tin bổ sung</h2>
          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ví liên kết
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <WalletIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <select
                  value={formData.wallet_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, wallet_id: e.target.value ? parseInt(e.target.value) : null }))}
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Không liên kết</option>
                  {wallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ghi chú
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="flex min-h-[100px] md:min-h-[120px] w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all resize-none"
                placeholder="Thông tin thêm về khoản nợ..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed md:static bottom-16 md:bottom-auto left-0 right-0 p-4 md:p-0 bg-white/95 dark:bg-slate-900/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-t-0 border-gray-200 dark:border-slate-700 z-40">
          <div className="flex gap-2 md:gap-3 justify-end max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => navigate('/debts')}
              className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 h-10 md:h-11 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 h-10 md:h-11 bg-gradient-to-r ${
                formData.is_lending ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600'
              } text-white rounded-lg font-semibold hover:shadow-lg active:scale-95 md:hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm md:text-base`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden md:inline">Đang lưu...</span>
                  <span className="md:hidden">Lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden md:inline">{isEdit ? 'Cập nhật khoản nợ' : 'Tạo khoản nợ'}</span>
                  <span className="md:hidden">{isEdit ? 'Cập nhật' : 'Tạo nợ'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddDebt;

