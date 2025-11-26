import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, CheckCircle, Repeat } from 'lucide-react';
import { recurringAPI, walletAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';

const AddRecurring = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const { settings } = useSettings();

  const CATEGORIES = [
    { value: 'food', label: t('categories.food'), emoji: '🍔' },
    { value: 'transport', label: t('categories.transport'), emoji: '🚗' },
    { value: 'shopping', label: t('categories.shopping'), emoji: '🛍️' },
    { value: 'entertainment', label: t('categories.entertainment'), emoji: '🎮' },
    { value: 'health', label: t('categories.health'), emoji: '💊' },
    { value: 'education', label: t('categories.education'), emoji: '📚' },
    { value: 'utilities', label: t('categories.utilities'), emoji: '💡' },
    { value: 'other', label: t('categories.other'), emoji: '📦' },
  ];

  const FREQUENCIES = [
    { value: 'daily', label: t('debt.daily'), icon: '📅' },
    { value: 'weekly', label: t('debt.weekly'), icon: '📆' },
    { value: 'monthly', label: t('debt.monthly'), icon: '🗓️' },
    { value: 'yearly', label: t('debt.yearly'), icon: '📅' },
  ];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    category: 'other',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    wallet_id: null,
    description: '',
    is_active: true,
    auto_create: true,
    is_expense: true,
  });
  const [amountInput, setAmountInput] = useState('');
  const amountInputRef = useRef(null);

  useEffect(() => {
    fetchWallets();
    if (isEdit) {
      fetchTransaction();
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

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await recurringAPI.getById(id);
      const transaction = response.data.transaction;
      
      setFormData({
        name: transaction.name || '',
        amount: transaction.amount || 0,
        category: transaction.category || 'other',
        frequency: transaction.frequency || 'monthly',
        start_date: transaction.start_date || new Date().toISOString().split('T')[0],
        end_date: transaction.end_date || '',
        wallet_id: transaction.wallet_id || null,
        description: transaction.description || '',
        is_active: transaction.is_active !== undefined ? transaction.is_active : true,
        auto_create: transaction.auto_create !== undefined ? transaction.auto_create : true,
        is_expense: transaction.is_expense !== undefined ? transaction.is_expense : true,
      });
      
      setAmountInput(formatAmountInput(transaction.amount || 0, { numberFormat: settings.numberFormat }));
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast({ type: 'error', message: t('messages.errorOccurred') });
      navigate('/recurring');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parsedAmount = parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat });
    
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ type: 'error', message: t('transactionForm.amountMustBePositive') });
      return;
    }

    if (!formData.wallet_id) {
      toast({ type: 'error', message: t('transactionForm.selectWalletWarning') });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        amount: parsedAmount,
        category: formData.category,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        wallet_id: formData.wallet_id,
        description: formData.description,
        is_active: formData.is_active,
        auto_create: formData.auto_create,
        is_expense: formData.is_expense,
      };

      if (isEdit) {
        await recurringAPI.update(id, payload);
        toast({ type: 'success', message: t('messages.updateSuccess') });
      } else {
        await recurringAPI.create(payload);
        toast({ type: 'success', message: t('recurring.createSuccess') });
      }
      
      navigate('/recurring');
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({ 
        type: 'error', 
        message: error.response?.data?.message || t('messages.errorOccurred')
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
      {/* Back button */}
      <button
        onClick={() => navigate('/recurring')}
        className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('common.back')}</span>
      </button>
      
      <PageHeader 
        icon={Repeat} 
        title={isEdit ? t('recurring.editRecurring') : t('recurring.addRecurring')} 
        iconColor="from-purple-600 to-indigo-600" 
      />

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('recurring.transactionName')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold"
              placeholder={t('recurring.transactionNamePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('transactionForm.amount')} *</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={amountInput}
                onChange={(e) => {
                  const caret = e.target.selectionStart || 0;
                  const { text, caret: nextCaret } = formatAmountLive(e.target.value, caret, { numberFormat: settings.numberFormat });
                  setAmountInput(text);
                  const parsed = parseAmountInput(text, { numberFormat: settings.numberFormat });
                  setFormData({ ...formData, amount: parsed });
                  requestAnimationFrame(() => {
                    if (amountInputRef.current) {
                      amountInputRef.current.setSelectionRange(nextCaret, nextCaret);
                    }
                  });
                }}
                onBlur={() => {
                  setAmountInput(formatAmountInput(amountInput || formData.amount, { numberFormat: settings.numberFormat }));
                }}
                ref={amountInputRef}
                className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all text-lg font-semibold"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('transactionForm.category')} *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 pr-10 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold appearance-none"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('recurring.frequency')} *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 pr-10 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold appearance-none"
                required
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>{freq.icon} {freq.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('recurring.startDate')} *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10 pointer-events-none" />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold"
                  required
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('recurring.endDate')}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10 pointer-events-none" />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('transactionForm.wallet')} *</label>
            <select
              value={formData.wallet_id || ''}
              onChange={(e) => setFormData({ ...formData, wallet_id: parseInt(e.target.value) })}
              className="w-full px-4 pr-10 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold appearance-none"
              required
            >
              <option value="">{t('transactionForm.selectWallet')}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('expense.description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 transition-all font-semibold"
              rows="3"
              placeholder={t('transactionForm.enterDescription')}
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.is_expense}
                onChange={(e) => setFormData({ ...formData, is_expense: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">
                {t('recurring.isExpense')}
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.auto_create}
                onChange={(e) => setFormData({ ...formData, auto_create: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">
                {t('recurring.autoCreate')}
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">
                {t('recurring.activateNow')}
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-6">
            <button
              type="button"
              onClick={() => navigate('/recurring')}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{isEdit ? t('common.update') : t('recurring.addRecurring')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecurring;

