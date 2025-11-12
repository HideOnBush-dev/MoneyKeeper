import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  Wallet as WalletIcon,
  Tag,
  Clock,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { expenseAPI, walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';

const CATEGORIES = [
  { value: '', label: 'Tất cả', emoji: '📋', gradient: 'from-gray-400 to-gray-500' },
  { value: 'food', label: 'Ăn uống', emoji: '🍔', gradient: 'from-orange-400 to-red-500' },
  { value: 'transport', label: 'Di chuyển', emoji: '🚗', gradient: 'from-blue-400 to-cyan-500' },
  { value: 'shopping', label: 'Mua sắm', emoji: '🛍️', gradient: 'from-pink-400 to-rose-500' },
  { value: 'entertainment', label: 'Giải trí', emoji: '🎮', gradient: 'from-purple-400 to-indigo-500' },
  { value: 'health', label: 'Sức khỏe', emoji: '💊', gradient: 'from-green-400 to-emerald-500' },
  { value: 'education', label: 'Giáo dục', emoji: '📚', gradient: 'from-yellow-400 to-amber-500' },
  { value: 'utilities', label: 'Tiện ích', emoji: '💡', gradient: 'from-teal-400 to-cyan-500' },
  { value: 'other', label: 'Khác', emoji: '📦', gradient: 'from-gray-400 to-slate-500' },
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    wallet_id: '',
    is_expense: '',
    start_date: '',
    end_date: '',
    sort_by: 'date',
    sort_order: 'desc',
  });
  const [formData, setFormData] = useState({
    amount: 0,
    category: 'food',
    description: '',
    wallet_id: '',
    is_expense: true,
    date: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();
  const { settings } = useSettings();
  const [amountInput, setAmountInput] = useState('');
  const amountInputRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    fetchWallets();
    fetchExpenses();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getAll();
      setWallets(response.data.wallets || []);
      if (response.data.wallets?.length > 0) {
        setFormData(prev => ({ ...prev, wallet_id: response.data.wallets[0].id }));
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Remove empty filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await expenseAPI.search(cleanFilters);
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await expenseAPI.exportCSV(cleanFilters);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ type: 'success', message: 'Xuất CSV thành công' });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({ type: 'error', message: 'Xuất CSV thất bại' });
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await expenseAPI.importCSV(form);
      const created = res?.data?.created ?? 0;
      const errs = res?.data?.errors ?? [];
      toast({ type: 'success', message: `Nhập ${created} giao dịch. Lỗi: ${errs.length}` });
      fetchExpenses();
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({ type: 'error', message: error?.response?.data?.message || 'Nhập CSV thất bại' });
    } finally {
      // reset input so selecting the same file again triggers change
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure latest parse from input string
      const payload = { ...formData, amount: parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat }) };
      if (editingExpense) {
        await expenseAPI.update(editingExpense.id, payload);
        toast({ type: 'success', message: 'Cập nhật giao dịch thành công!' });
      } else {
        await expenseAPI.create(payload);
        toast({ type: 'success', message: 'Thêm giao dịch thành công!' });
      }
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        amount: 0,
        category: 'food',
        description: '',
        wallet_id: wallets[0]?.id || '',
        is_expense: true,
        date: new Date().toISOString().split('T')[0],
      });
      setAmountInput('');
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi lưu giao dịch' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
    try {
      await expenseAPI.delete(id);
      toast({ type: 'success', message: 'Xóa giao dịch thành công!' });
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi xóa giao dịch' });
    }
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount,
      category: expense.category,
      description: expense.description || '',
      wallet_id: expense.wallet_id,
      is_expense: expense.is_expense,
      date: expense.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setAmountInput(formatAmountInput(expense.amount, { numberFormat: settings.numberFormat }));
    setShowModal(true);
  };

  const getCategoryData = (value) => {
    return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCategoryData(expense.category).label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const applyFilters = () => {
    fetchExpenses();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      wallet_id: '',
      is_expense: '',
      start_date: '',
      end_date: '',
      sort_by: 'date',
      sort_order: 'desc',
    });
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full"
        />
        <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
      </div>
    );
  }

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
          <div className="absolute top-0 left-0 w-64 h-64 bg-pink-300/30 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="p-4 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-xl"
              >
                <DollarSign className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 bg-clip-text text-transparent">
                  Chi tiêu
                </h1>
                <p className="text-gray-600 mt-1 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Quản lý giao dịch của bạn</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 flex-wrap gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                />
              </div>

              {/* Filter Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-2xl transition-all ${
                  showFilters 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' 
                    : 'bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200'
                }`}
              >
                <Filter className="h-6 w-6" />
              </motion.button>

              {/* Export CSV Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportCSV}
                className="px-4 py-3 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200 rounded-2xl font-semibold transition-all"
              >
                Xuất CSV
              </motion.button>

              {/* Import CSV Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick}
                className="px-4 py-3 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200 rounded-2xl font-semibold transition-all"
              >
                Nhập CSV
              </motion.button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportChange}
              />

              {/* Add Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setEditingExpense(null);
                  setFormData({
                    amount: 0,
                    category: 'food',
                    description: '',
                    wallet_id: wallets[0]?.id || '',
                    is_expense: true,
                    date: new Date().toISOString().split('T')[0],
                  });
                  setShowModal(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden md:inline">Thêm</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                  <Filter className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Bộ lọc</h3>
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>Danh mục</span>
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <WalletIcon className="h-4 w-4" />
                  <span>Ví</span>
                </label>
                <select
                  value={filters.wallet_id}
                  onChange={(e) => setFilters({ ...filters, wallet_id: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Tất cả</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4" />
                  <span>Loại</span>
                </label>
                <select
                  value={filters.is_expense}
                  onChange={(e) => setFilters({ ...filters, is_expense: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Chi tiêu</option>
                  <option value="false">Thu nhập</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Từ ngày</span>
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Đến ngày</span>
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>Sắp xếp</span>
                </label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="date">Ngày</option>
                  <option value="amount">Số tiền</option>
                  <option value="category">Danh mục</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetFilters}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
              >
                Đặt lại
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={applyFilters}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Áp dụng
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expenses List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
      >
        {filteredExpenses.length === 0 ? (
          <div className="p-16 text-center">
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="p-8 bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl">
                <DollarSign className="h-20 w-20 text-pink-500" />
              </div>
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Chưa có giao dịch nào</h3>
            <p className="text-gray-600 mb-6">Hãy thêm giao dịch đầu tiên của bạn</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm giao dịch đầu tiên</span>
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredExpenses.map((expense, index) => {
              const categoryData = getCategoryData(expense.category);
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                  className="p-5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Category Icon */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${categoryData.gradient} shadow-lg`}
                      >
                        <span className="text-2xl">{categoryData.emoji}</span>
                      </motion.div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <p className="font-bold text-gray-900 text-lg group-hover:text-pink-600 transition-colors">
                            {expense.description || 'Không có mô tả'}
                          </p>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            expense.is_expense 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {expense.is_expense ? 'Chi' : 'Thu'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Tag className="h-3 w-3" />
                            <span>{categoryData.label}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(expense.date).toLocaleDateString('vi-VN')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount and Actions */}
                    <div className="flex items-center space-x-4">
                      <p className={`text-2xl font-bold ${
                        expense.is_expense ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {expense.is_expense ? '-' : '+'}{formatCurrency(expense.amount || 0, settings.currency, settings.numberFormat)}
                      </p>

                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEditModal(expense)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

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
                <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {editingExpense ? 'Sửa giao dịch' : 'Thêm giao dịch'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Loại giao dịch</label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, is_expense: true })}
                      className={`p-4 rounded-2xl font-semibold transition-all ${
                        formData.is_expense
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <TrendingDown className="h-5 w-5 mx-auto mb-1" />
                      Chi tiêu
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, is_expense: false })}
                      className={`p-4 rounded-2xl font-semibold transition-all ${
                        !formData.is_expense
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                      Thu nhập
                    </motion.button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền *</label>
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
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-lg font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục *</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-semibold appearance-none"
                      required
                    >
                      {CATEGORIES.filter(c => c.value !== '').map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Wallet */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ví *</label>
                  <div className="relative">
                    <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={formData.wallet_id}
                      onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-semibold appearance-none"
                      required
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ngày *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-4 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none"
                    rows="3"
                    placeholder="Nhập mô tả..."
                  />
                </div>

                {/* Buttons */}
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
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>{editingExpense ? 'Cập nhật' : 'Thêm'}</span>
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

export default Expenses;
