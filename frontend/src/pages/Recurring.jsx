import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Repeat,
  AlertTriangle,
  Edit,
  Sparkles,
  Play,
  SkipForward,
  Pause,
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import { recurringAPI, walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';

const Recurring = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchTransactions();
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getAll();
      setWallets(response.data.wallets || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await recurringAPI.getAll();
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast({ type: 'error', message: t('messages.errorOccurred') });
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id) => {
    if (!confirm(t('messages.confirmDelete'))) return;
    try {
      await recurringAPI.delete(id);
      toast({ type: 'success', message: t('messages.deleteSuccess') });
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast({ type: 'error', message: error.response?.data?.error || t('messages.errorOccurred') });
    }
  };

  const handleSkip = async (id) => {
    try {
      await recurringAPI.skip(id);
      toast({ type: 'success', message: t('recurring.skipSuccess') });
      fetchTransactions();
    } catch (error) {
      console.error('Error skipping recurring transaction:', error);
      toast({ type: 'error', message: error.response?.data?.error || t('messages.errorOccurred') });
    }
  };

  const handleExecute = async (id) => {
    try {
      await recurringAPI.execute(id);
      toast({ type: 'success', message: t('recurring.executeSuccess') });
      fetchTransactions();
    } catch (error) {
      console.error('Error executing recurring transaction:', error);
      toast({ type: 'error', message: error.response?.data?.error || t('messages.errorOccurred') });
    }
  };

  const handleEdit = (transaction) => {
    navigate(`/recurring/${transaction.id}/edit`);
  };

  const getFrequencyLabel = (frequency) => {
    return FREQUENCIES.find(f => f.value === frequency)?.label || frequency;
  };

  const getCategoryInfo = (categoryValue) => {
    return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[CATEGORIES.length - 1];
  };

  const getDaysUntil = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  const activeTransactions = transactions.filter(t => t.is_active);
  const inactiveTransactions = transactions.filter(t => !t.is_active);
  const dueTransactions = activeTransactions.filter(t => t.is_due);
  const upcomingTransactions = activeTransactions.filter(t => !t.is_due);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          icon={Repeat} 
          title={t('recurring.title')}
          subtitle={`${activeTransactions.length} ${t('recurring.activeTransactions')}`}
          iconColor="from-purple-500 to-indigo-600"
        />
        <button
          onClick={() => navigate('/recurring/new')}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>{t('recurring.addRecurring')}</span>
        </button>
      </div>

      {/* Alerts for due transactions */}
      {dueTransactions.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-bold text-yellow-900 dark:text-yellow-200">
              {t('recurring.dueTransactions', { count: dueTransactions.length })}
            </h3>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('recurring.dueTransactionsMessage', { count: dueTransactions.length })}
          </p>
        </div>
      )}

      {/* Active Transactions */}
      {activeTransactions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {t('recurring.activeTransactions')}
          </h2>
          <div className="space-y-4">
            {activeTransactions.map((transaction) => {
              const categoryInfo = getCategoryInfo(transaction.category);
              const daysUntil = getDaysUntil(transaction.next_due_date);
              const isDue = transaction.is_due;
              
              return (
                <div
                  key={transaction.id}
                  className={`group relative bg-white dark:bg-slate-800 rounded-xl border ${
                    isDue 
                      ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10' 
                      : 'border-gray-200 dark:border-slate-700'
                  } hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all overflow-hidden`}
                >
                  {/* Accent border on left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isDue 
                      ? 'bg-yellow-500' 
                      : transaction.is_expense 
                        ? 'bg-red-500' 
                        : 'bg-green-500'
                  }`}></div>

                  <div className="p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br ${
                        isDue
                          ? 'from-yellow-500 to-orange-500'
                          : 'from-purple-500 to-indigo-500'
                      } shadow-lg`}>
                        <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                              {transaction.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                                <span className="text-base">{categoryInfo.emoji}</span>
                                {categoryInfo.label}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                <Repeat className="h-3 w-3" />
                                {getFrequencyLabel(transaction.frequency)}
                              </span>
                              {isDue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t('recurring.due')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isDue && transaction.can_execute && (
                              <>
                                <button
                                  onClick={() => handleExecute(transaction.id)}
                                  className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                  title={t('recurring.executeNow')}
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSkip(transaction.id)}
                                  className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                  title={t('recurring.skip')}
                                >
                                  <SkipForward className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {transaction.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {/* Amount */}
                      <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Số tiền</p>
                        <p className={`text-lg sm:text-xl font-bold ${
                          transaction.is_expense 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {transaction.is_expense ? '-' : '+'}
                          {formatCurrency(transaction.amount, settings.currency, settings.numberFormat)}
                        </p>
                      </div>

                      {/* Due Date */}
                      <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Ngày đến hạn</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                          {transaction.next_due_date ? new Date(transaction.next_due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>

                      {/* Days Until */}
                      <div className={`p-3 rounded-xl border ${
                        daysUntil !== null && daysUntil < 0 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                          : daysUntil !== null && daysUntil <= 3
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 border-gray-200 dark:border-slate-600'
                      }`}>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Còn lại</p>
                        <p className={`text-base sm:text-lg font-bold ${
                          daysUntil !== null && daysUntil < 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : daysUntil !== null && daysUntil <= 3
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {daysUntil !== null 
                            ? daysUntil < 0 
                              ? t('recurring.overdueDays', { count: Math.abs(daysUntil) })
                              : daysUntil === 0
                              ? t('debt.today')
                              : t('recurring.daysUntil', { count: daysUntil })
                            : 'N/A'}
                        </p>
                      </div>

                      {/* Wallet */}
                      <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t('wallet.title')}</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                          {wallets.find(w => w.id === transaction.wallet_id)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Badge */}
                    {transaction.auto_create && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center gap-2">
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{t('recurring.autoCreate')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Transactions */}
      {inactiveTransactions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Pause className="h-5 w-5 text-gray-600" />
            {t('recurring.paused')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactiveTransactions.map((transaction) => {
              const categoryInfo = getCategoryInfo(transaction.category);
              return (
                <div
                  key={transaction.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 opacity-60"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg">
                      <Repeat className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{transaction.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {categoryInfo.emoji} {categoryInfo.label} • {getFrequencyLabel(transaction.frequency)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${
                      transaction.is_expense 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {transaction.is_expense ? '-' : '+'}
                      {formatCurrency(transaction.amount, settings.currency, settings.numberFormat)}
                    </span>
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('recurring.reactivate')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {transactions.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="inline-block mb-4">
            <div className="p-6 bg-gray-100 dark:bg-slate-700 rounded-2xl">
              <Repeat className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t('recurring.noRecurring')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('recurring.createFirstRecurring')}</p>
          <button
            onClick={() => navigate('/recurring/new')}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('recurring.addRecurring')}</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default Recurring;

