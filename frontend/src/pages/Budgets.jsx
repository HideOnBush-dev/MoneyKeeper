import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Trash2,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  PieChart
} from 'lucide-react';
import { budgetAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';

const CATEGORIES = [
  { value: 'food', label: 'Ăn uống', emoji: '🍔', gradient: 'from-orange-400 to-red-500', bgLight: 'from-orange-50 to-red-50' },
  { value: 'transport', label: 'Di chuyển', emoji: '🚗', gradient: 'from-blue-400 to-cyan-500', bgLight: 'from-blue-50 to-cyan-50' },
  { value: 'shopping', label: 'Mua sắm', emoji: '🛍️', gradient: 'from-pink-400 to-rose-500', bgLight: 'from-pink-50 to-rose-50' },
  { value: 'entertainment', label: 'Giải trí', emoji: '🎮', gradient: 'from-purple-400 to-indigo-500', bgLight: 'from-purple-50 to-indigo-50' },
  { value: 'health', label: 'Sức khỏe', emoji: '💊', gradient: 'from-green-400 to-emerald-500', bgLight: 'from-green-50 to-emerald-50' },
  { value: 'education', label: 'Giáo dục', emoji: '📚', gradient: 'from-yellow-400 to-amber-500', bgLight: 'from-yellow-50 to-amber-50' },
  { value: 'utilities', label: 'Tiện ích', emoji: '💡', gradient: 'from-teal-400 to-cyan-500', bgLight: 'from-teal-50 to-cyan-50' },
  { value: 'other', label: 'Khác', emoji: '📦', gradient: 'from-gray-400 to-slate-500', bgLight: 'from-gray-50 to-slate-50' },
];

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    category: '',
    amount: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [amountInput, setAmountInput] = useState('');
  const { toast } = useToast();
  const { settings } = useSettings();
  const amountInputRef = useRef(null);

  useEffect(() => {
    fetchBudgets();
    fetchAlerts();
  }, [selectedMonth, selectedYear]);

  const fetchBudgets = async () => {
    try {
      const response = await budgetAPI.getCurrent({ month: selectedMonth, year: selectedYear });
      setBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await budgetAPI.getAlerts({ threshold: 80 });
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, amount: parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat }) };
      await budgetAPI.create(payload);
      toast({ type: 'success', message: 'Lưu ngân sách thành công!' });
      setShowModal(false);
      setFormData({ category: '', amount: 0, month: selectedMonth, year: selectedYear });
      setAmountInput('');
      fetchBudgets();
      fetchAlerts();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi lưu ngân sách' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa ngân sách này?')) return;
    try {
      await budgetAPI.delete(id);
      toast({ type: 'success', message: 'Xóa ngân sách thành công!' });
      fetchBudgets();
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi xóa ngân sách' });
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[CATEGORIES.length - 1];
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full"
        />
        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
      </div>
    );
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : 0;

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
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="p-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-xl"
              >
                <Target className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Ngân sách
                </h1>
                <p className="text-gray-600 mt-1 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Tháng {selectedMonth}/{selectedYear}</span>
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setFormData({ category: '', amount: 0, month: selectedMonth, year: selectedYear });
              setAmountInput('');
                setShowModal(true);
              }}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm ngân sách</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Animated Alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="glass backdrop-blur-xl bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-5 shadow-lg border-l-4 border-yellow-500"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-yellow-500 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900">{alert.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Month Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-2xl border border-white/20"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Tháng</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-semibold appearance-none"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Năm</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-semibold appearance-none"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Tổng ngân sách',
            value: totalBudget,
            icon: Target,
            gradient: 'from-blue-500 to-indigo-500',
            bg: 'from-blue-50 to-indigo-50',
          },
          {
            title: 'Đã chi tiêu',
            value: totalSpent,
            icon: TrendingDown,
            gradient: 'from-red-500 to-pink-500',
            bg: 'from-red-50 to-pink-50',
            percentage: totalPercentage,
          },
          {
            title: 'Còn lại',
            value: totalRemaining,
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-500',
            bg: 'from-green-50 to-emerald-50',
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${stat.bg} p-6 shadow-xl border border-white/50`}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-white to-transparent"></div>
            </div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                {stat.percentage && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/50 text-gray-700">
                    {stat.percentage}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">{stat.title}</p>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                {formatCurrency(stat.value, settings.currency, settings.numberFormat)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-16 text-center shadow-2xl border border-white/20"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-6"
          >
            <div className="p-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl">
              <Target className="h-20 w-20 text-purple-500" />
            </div>
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Chưa có ngân sách</h3>
          <p className="text-gray-600 mb-6">Tạo ngân sách đầu tiên cho tháng này</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Tạo ngân sách đầu tiên</span>
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget, index) => {
            const categoryInfo = getCategoryInfo(budget.category);
            const percentage = Math.min(budget.percentage, 100);
            const circumference = 2 * Math.PI * 40;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;
            
            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`glass backdrop-blur-xl bg-gradient-to-br ${categoryInfo.bgLight} rounded-3xl p-6 shadow-xl border border-white/50 group`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${categoryInfo.gradient} shadow-lg`}>
                      <span className="text-2xl">{categoryInfo.emoji}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{categoryInfo.label}</h3>
                      <p className="text-sm text-gray-600">Tháng {budget.month}/{budget.year}</p>
                    </div>
                  </div>
                  
                  {/* Circular Progress */}
                  <div className="relative">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-gray-200"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        className={percentage >= 100 ? 'text-red-500' : percentage >= 80 ? 'text-yellow-500' : 'text-green-500'}
                        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white/50 rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Ngân sách</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(budget.amount, settings.currency, settings.numberFormat)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Đã chi</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(budget.spent, settings.currency, settings.numberFormat)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/50 rounded-2xl">
                    <p className="text-xs text-gray-600 mb-1">Còn lại</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(budget.remaining, settings.currency, settings.numberFormat)}</p>
                  </div>
                </div>

                {/* Delete Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(budget.id)}
                  className="w-full px-4 py-3 bg-red-100 text-red-600 rounded-2xl font-semibold hover:bg-red-200 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa ngân sách</span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
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
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Thêm ngân sách
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục *</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-semibold appearance-none"
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền ngân sách *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-lg font-semibold"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tháng</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                      <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-semibold appearance-none"
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Năm</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-semibold appearance-none"
                      >
                        {[2024, 2025, 2026].map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Lưu</span>
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

export default Budgets;
