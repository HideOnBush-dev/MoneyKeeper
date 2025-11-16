import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Edit,
  Wallet,
  Sparkles
} from 'lucide-react';
import { goalsAPI, walletAPI } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';
import PageHeader from '../components/PageHeader';

const GOAL_ICONS = ['🎯', '💰', '🏠', '🚗', '✈️', '💍', '📱', '💻', '🎓', '🏥', '🎁', '💎'];
const GOAL_COLORS = ['blue', 'green', 'purple', 'pink', 'orange', 'red', 'indigo', 'cyan', 'teal', 'yellow', 'rose', 'violet'];

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: 0,
    current_amount: 0,
    deadline: '',
    description: '',
    icon: '🎯',
    color: 'blue',
    wallet_id: null,
  });
  const [addAmount, setAddAmount] = useState(0);
  const [amountInput, setAmountInput] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const { toast } = useToast();
  const { settings } = useSettings();
  const amountInputRef = useRef(null);
  const targetAmountInputRef = useRef(null);

  useEffect(() => {
    fetchGoals();
    fetchWallets();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await goalsAPI.getAll();
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({ type: 'error', message: 'Lỗi khi tải mục tiêu' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parsedTarget = parseAmountInput(targetAmountInput || String(formData.target_amount), { numberFormat: settings.numberFormat });
    if (!parsedTarget || parsedTarget <= 0 || isNaN(parsedTarget)) {
      toast({ type: 'warning', message: 'Vui lòng nhập số tiền mục tiêu lớn hơn 0' });
      return;
    }
    
    if (!formData.name.trim()) {
      toast({ type: 'warning', message: 'Vui lòng nhập tên mục tiêu' });
      return;
    }

    try {
      const payload = {
        ...formData,
        target_amount: parsedTarget,
        current_amount: 0,
        deadline: formData.deadline || null,
        wallet_id: formData.wallet_id || null,
      };
      
      if (selectedGoal) {
        await goalsAPI.update(selectedGoal.id, payload);
        toast({ type: 'success', message: 'Cập nhật mục tiêu thành công!' });
      } else {
        await goalsAPI.create(payload);
        toast({ type: 'success', message: 'Tạo mục tiêu thành công!' });
      }
      
      setShowModal(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi lưu mục tiêu' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa mục tiêu này?')) return;
    try {
      await goalsAPI.delete(id);
      toast({ type: 'success', message: 'Xóa mục tiêu thành công!' });
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi xóa mục tiêu' });
    }
  };

  const handleAddAmount = async () => {
    const parsedAmount = parseAmountInput(amountInput || String(addAmount), { numberFormat: settings.numberFormat });
    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      toast({ type: 'warning', message: 'Vui lòng nhập số tiền lớn hơn 0' });
      return;
    }

    try {
      await goalsAPI.addAmount(selectedGoal.id, parsedAmount);
      toast({ type: 'success', message: 'Thêm tiền vào mục tiêu thành công!' });
      setShowAddAmountModal(false);
      setAddAmount(0);
      setAmountInput('');
      fetchGoals();
    } catch (error) {
      console.error('Error adding amount:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi thêm tiền' });
    }
  };

  const handleEdit = (goal) => {
    setSelectedGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
      description: goal.description || '',
      icon: goal.icon || '🎯',
      color: goal.color || 'blue',
      wallet_id: goal.wallet_id || null,
    });
    setTargetAmountInput(formatAmountInput(goal.target_amount, { numberFormat: settings.numberFormat }));
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setFormData({
      name: '',
      target_amount: 0,
      current_amount: 0,
      deadline: '',
      description: '',
      icon: '🎯',
      color: 'blue',
      wallet_id: wallets[0]?.id || null,
    });
    setTargetAmountInput('');
    setAmountInput('');
  };

  const openAddAmountModal = (goal) => {
    setSelectedGoal(goal);
    setAddAmount(0);
    setAmountInput('');
    setShowAddAmountModal(true);
  };

  const getColorGradient = (color) => {
    const gradients = {
      blue: 'from-blue-500 to-indigo-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-indigo-500',
      pink: 'from-pink-500 to-rose-500',
      orange: 'from-orange-500 to-red-500',
      red: 'from-red-500 to-pink-500',
      indigo: 'from-indigo-500 to-blue-500',
      cyan: 'from-cyan-500 to-blue-500',
      teal: 'from-teal-500 to-cyan-500',
      yellow: 'from-yellow-500 to-amber-500',
      rose: 'from-rose-500 to-pink-500',
      violet: 'from-violet-500 to-purple-500',
    };
    return gradients[color] || gradients.blue;
  };

  const getColorBg = (color) => {
    const bgs = {
      blue: 'from-blue-50 to-indigo-50',
      green: 'from-green-50 to-emerald-50',
      purple: 'from-purple-50 to-indigo-50',
      pink: 'from-pink-50 to-rose-50',
      orange: 'from-orange-50 to-red-50',
      red: 'from-red-50 to-pink-50',
      indigo: 'from-indigo-50 to-blue-50',
      cyan: 'from-cyan-50 to-blue-50',
      teal: 'from-teal-50 to-cyan-50',
      yellow: 'from-yellow-50 to-amber-50',
      rose: 'from-rose-50 to-pink-50',
      violet: 'from-violet-50 to-purple-50',
    };
    return bgs[color] || bgs.blue;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải...</p>
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.is_achieved);
  const achievedGoals = goals.filter(g => g.is_achieved);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          icon={Target} 
          title="Mục tiêu tiết kiệm"
          subtitle={`${activeGoals.length} mục tiêu đang hoạt động`}
          iconColor="from-blue-500 to-indigo-600"
        />
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo mục tiêu</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Tổng mục tiêu',
            value: totalTarget,
            icon: Target,
            gradient: 'from-blue-500 to-indigo-500',
          },
          {
            title: 'Đã tiết kiệm',
            value: totalCurrent,
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-500',
            percentage: totalProgress,
          },
          {
            title: 'Còn lại',
            value: totalTarget - totalCurrent,
            icon: Wallet,
            gradient: 'from-purple-500 to-indigo-500',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-gray-100 dark:border-slate-700"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-white dark:from-slate-700 to-transparent"></div>
            </div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                {stat.percentage !== undefined && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300">
                    {stat.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">{stat.title}</p>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                {formatCurrency(stat.value, settings.currency, settings.numberFormat)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Mục tiêu đang thực hiện
          </h2>
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const progress = goal.progress_percentage || 0;
              const isOverdue = goal.is_overdue;
              const daysRemaining = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 group overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${getColorGradient(goal.color)} shadow-lg flex-shrink-0`}>
                        <span className="text-3xl">{goal.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{goal.name}</h3>
                          {isOverdue && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Quá hạn
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{goal.description}</p>
                        )}
                        {goal.deadline && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {daysRemaining !== null && daysRemaining > 0 ? (
                              <span>Còn {daysRemaining} ngày</span>
                            ) : daysRemaining === 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold">Hết hạn hôm nay</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">Đã quá hạn</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openAddAmountModal(goal)}
                        className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Thêm tiền</span>
                      </button>
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(goal.current_amount, settings.currency, settings.numberFormat)} / {formatCurrency(goal.target_amount, settings.currency, settings.numberFormat)}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getColorGradient(goal.color)} transition-all duration-500`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Còn lại</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(goal.remaining_amount, settings.currency, settings.numberFormat)}
                      </p>
                    </div>
                    {goal.wallet_id && (
                      <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Liên kết ví</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {wallets.find(w => w.id === goal.wallet_id)?.name || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mục tiêu đã đạt được
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievedGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${getColorGradient(goal.color)} shadow-lg`}>
                    <span className="text-2xl">{goal.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{goal.name}</h3>
                    {goal.achieved_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Đạt được: {new Date(goal.achieved_at).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(goal.target_amount, settings.currency, settings.numberFormat)}
                  </span>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="inline-block mb-4">
            <div className="p-6 bg-gray-100 dark:bg-slate-700 rounded-2xl">
              <Target className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Chưa có mục tiêu</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tạo mục tiêu tiết kiệm đầu tiên của bạn</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo mục tiêu</span>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {selectedGoal ? 'Chỉnh sửa mục tiêu' : 'Tạo mục tiêu mới'}
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
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tên mục tiêu *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all font-semibold"
                  placeholder="Ví dụ: Quỹ du lịch"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Số tiền mục tiêu *</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={targetAmountInput}
                    onChange={(e) => {
                      const caret = e.target.selectionStart || 0;
                      const { text, caret: nextCaret } = formatAmountLive(e.target.value, caret, { numberFormat: settings.numberFormat });
                      setTargetAmountInput(text);
                      const parsed = parseAmountInput(text, { numberFormat: settings.numberFormat });
                      setFormData({ ...formData, target_amount: parsed });
                      requestAnimationFrame(() => {
                        if (targetAmountInputRef.current) {
                          targetAmountInputRef.current.setSelectionRange(nextCaret, nextCaret);
                        }
                      });
                    }}
                    onBlur={() => {
                      setTargetAmountInput(formatAmountInput(targetAmountInput || formData.target_amount, { numberFormat: settings.numberFormat }));
                    }}
                    ref={targetAmountInputRef}
                    className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all text-lg font-semibold"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Hạn chót (tùy chọn)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mô tả (tùy chọn)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all font-semibold"
                  rows="3"
                  placeholder="Thêm mô tả cho mục tiêu..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {GOAL_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-3 rounded-xl text-2xl hover:scale-110 transition-all ${
                        formData.icon === icon
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                          : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Màu sắc</label>
                <div className="grid grid-cols-6 gap-2">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`p-3 rounded-xl bg-gradient-to-br ${getColorGradient(color)} hover:scale-110 transition-all ${
                        formData.color === color ? 'ring-2 ring-gray-900 dark:ring-white' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Liên kết với ví (tùy chọn)</label>
                <select
                  value={formData.wallet_id || ''}
                  onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all font-semibold appearance-none"
                >
                  <option value="">Không liên kết</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{selectedGoal ? 'Cập nhật' : 'Tạo mục tiêu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Amount Modal */}
      {showAddAmountModal && selectedGoal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddAmountModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Thêm tiền vào "{selectedGoal.name}"
              </h2>
              <button
                onClick={() => setShowAddAmountModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tiến độ hiện tại</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedGoal.current_amount, settings.currency, settings.numberFormat)} / {formatCurrency(selectedGoal.target_amount, settings.currency, settings.numberFormat)}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {selectedGoal.progress_percentage?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getColorGradient(selectedGoal.color)} transition-all`}
                    style={{ width: `${Math.min(selectedGoal.progress_percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Số tiền thêm vào *</label>
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
                    setAddAmount(parsed);
                    requestAnimationFrame(() => {
                      if (amountInputRef.current) {
                        amountInputRef.current.setSelectionRange(nextCaret, nextCaret);
                      }
                    });
                  }}
                  onBlur={() => {
                    setAmountInput(formatAmountInput(amountInput || addAmount, { numberFormat: settings.numberFormat }));
                  }}
                  ref={amountInputRef}
                  className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 transition-all text-lg font-semibold"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddAmountModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddAmount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;

