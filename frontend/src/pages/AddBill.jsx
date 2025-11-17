import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  DollarSign,
  Calendar,
  AlarmClock,
  Wallet as WalletIcon,
  Repeat,
  Palette,
  CheckCircle,
} from 'lucide-react';
import { billsAPI, walletAPI, recurringAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountLive } from '../lib/numberFormat';

const COLOR_OPTIONS = ['indigo', 'rose', 'blue', 'amber', 'emerald', 'violet', 'cyan'];

const AddBill = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { toast } = useToast();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [recurrings, setRecurrings] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    category: '',
    due_date: new Date().toISOString().split('T')[0],
    reminder_days: 3,
    wallet_id: '',
    description: '',
    recurring_id: '',
    color: 'indigo',
  });

  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchWallets(), fetchRecurrings()]);
        if (isEdit) {
          await fetchBill();
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const fetchWallets = async () => {
    try {
      const res = await walletAPI.getAll();
      setWallets(res.data.wallets || []);
      if (!isEdit && res.data.wallets?.length) {
        setFormData((prev) => ({ ...prev, wallet_id: res.data.wallets[0].id }));
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchRecurrings = async () => {
    try {
      const res = await recurringAPI.getAll();
      setRecurrings(res.data.recurring || res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
    }
  };

  const fetchBill = async () => {
    try {
      const res = await billsAPI.getById(id);
      const bill = res.data.bill;
      setFormData({
        name: bill.name,
        amount: bill.amount,
        category: bill.category || '',
        due_date: bill.due_date,
        reminder_days: bill.reminder_days ?? 3,
        wallet_id: bill.wallet_id || '',
        description: bill.description || '',
        recurring_id: bill.recurring_id || '',
        color: bill.color || 'indigo',
      });
      setAmountInput(formatAmountLive(bill.amount, { numberFormat: settings.numberFormat }));
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast({ type: 'error', message: 'Không thể tải hóa đơn' });
      navigate('/bills');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseAmountInput(amountInput || String(formData.amount), {
      numberFormat: settings.numberFormat,
    });
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ type: 'warning', message: 'Vui lòng nhập số tiền hợp lệ' });
      return;
    }
    if (!formData.name.trim()) {
      toast({ type: 'warning', message: 'Vui lòng nhập tên hóa đơn' });
      return;
    }

    const payload = {
      ...formData,
      amount: parsedAmount,
      wallet_id: formData.wallet_id || null,
      recurring_id: formData.recurring_id || null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await billsAPI.update(id, payload);
        toast({ type: 'success', message: 'Cập nhật hóa đơn thành công' });
      } else {
        await billsAPI.create(payload);
        toast({ type: 'success', message: 'Tạo hóa đơn thành công' });
      }
      navigate('/bills');
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi lưu hóa đơn' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="mb-6 md:mb-8">
        <button
          onClick={() => navigate('/bills')}
          className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Quay lại</span>
        </button>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl md:rounded-2xl shadow-lg">
            <Bell className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? 'Chỉnh sửa hóa đơn' : 'Thêm hóa đơn'}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Nhận nhắc nhở trước hạn để không bỏ lỡ khoản thanh toán
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 pb-28 md:pb-6">
        {/* Basic info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tên hóa đơn *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="VD: Tiền điện tháng 3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Số tiền *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => {
                    const formatted = formatAmountLive(e.target.value, { numberFormat: settings.numberFormat });
                    setAmountInput(formatted);
                    const parsed = parseAmountInput(formatted, { numberFormat: settings.numberFormat });
                    setFormData((prev) => ({ ...prev, amount: parsed || 0 }));
                  }}
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ngày đến hạn *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Reminder & links */}
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 md:p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <AlarmClock className="h-4 w-4" /> Nhắc trước (ngày)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={formData.reminder_days}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reminder_days: Math.max(0, Math.min(30, Number(e.target.value) || 0)) }))
                }
                className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <WalletIcon className="h-4 w-4" /> Ví thanh toán
              </label>
              <select
                value={formData.wallet_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, wallet_id: e.target.value }))}
                className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
              >
                <option value="">Không liên kết</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Liên kết giao dịch định kỳ
            </label>
            <select
              value={formData.recurring_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, recurring_id: e.target.value }))}
              className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
            >
              <option value="">Không liên kết</option>
              {recurrings.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} • {formatCurrency(r.amount, settings.currency)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Palette className="h-4 w-4" /> Màu nhãn
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900 dark:border-white scale-105' : 'border-transparent opacity-70'
                  } bg-gradient-to-br ${
                    color === 'indigo'
                      ? 'from-indigo-500 to-violet-500'
                      : color === 'rose'
                      ? 'from-rose-500 to-pink-500'
                      : color === 'blue'
                      ? 'from-blue-500 to-cyan-500'
                      : color === 'amber'
                      ? 'from-amber-500 to-orange-500'
                      : color === 'emerald'
                      ? 'from-emerald-500 to-teal-500'
                      : color === 'violet'
                      ? 'from-violet-500 to-purple-500'
                      : 'from-cyan-500 to-sky-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ghi chú</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="flex min-h-[100px] md:min-h-[120px] w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
              placeholder="Thông tin thêm (ví dụ: mã khách hàng, hướng dẫn thanh toán...)"
            />
          </div>
        </div>

        <div className="fixed md:static bottom-16 md:bottom-auto left-0 right-0 p-4 md:p-0 bg-white/95 dark:bg-slate-900/95 md:bg-transparent border-t md:border-t-0 border-gray-200 dark:border-slate-700 z-40 backdrop-blur-md md:backdrop-blur-none">
          <div className="flex gap-2 md:gap-3 justify-end max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => navigate('/bills')}
              className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 h-10 md:h-11 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold flex items-center justify-center hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 h-10 md:h-11 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isEdit ? 'Cập nhật hóa đơn' : 'Tạo hóa đơn'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBill;

