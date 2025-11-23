import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  AlertTriangle,
  Repeat,
  CreditCard,
  Bell,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import axios from 'axios';
import QuickTransactionForm from '../components/QuickTransactionForm';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';
import { goalsAPI, recurringAPI, debtsAPI, billsAPI } from '../services/api';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);
  const [upcomingRecurring, setUpcomingRecurring] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [upcomingDebts, setUpcomingDebts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chartTab, setChartTab] = useState('trends'); // trends | categories

  const [formData, setFormData] = useState({
    amount: 0,
    category: 'food',
    description: '',
    wallet_id: '',
    is_expense: true,
    date: new Date().toISOString().slice(0, 10),
  });
  const { toast } = useToast();
  const { settings } = useSettings();
  const [amountInput, setAmountInput] = useState('');
  const amountInputRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    fetchWallets();
    fetchActiveGoals();
    fetchUpcomingRecurring();
    fetchUpcomingBills();
    fetchUpcomingDebts();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); // last 7 days

      const start_date = start.toISOString().slice(0, 10);
      const end_date = end.toISOString().slice(0, 10);

      const [dashboardRes, expensesRes, trendsRes, statsRes] = await Promise.all([
        axios.get('/api/dashboard'),
        axios.get('/api/expenses', { params: { page: 1, per_page: 5 } }),
        axios.get('/api/expenses/trends', { params: { group_by: 'daily', start_date, end_date } }),
        axios.get('/api/expenses/statistics', { params: { start_date, end_date } }),
      ]);

      setStats(dashboardRes.data);
      setRecentExpenses(expensesRes.data.expenses || []);

      // Map trends data -> { name, income, expense }
      const trends = (trendsRes?.data?.trends || []).map(item => {
        let name = '';
        if (item.date) {
          name = new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        } else if (item.month && item.year) {
          name = `T${item.month}`;
        } else if (item.week && item.year) {
          name = `W${item.week}`;
        } else {
          name = '';
        }
        return {
          name,
          income: Number(item.income || 0),
          expense: Number(item.expenses || 0),
        };
      });
      setTrendData(trends);

      // Map category statistics -> { name, value }
      const categoryLabelMap = {
        food: 'Ăn uống',
        transport: 'Di chuyển',
        shopping: 'Mua sắm',
        entertainment: 'Giải trí',
        health: 'Sức khỏe',
        education: 'Giáo dục',
        utilities: 'Tiện ích',
        other: 'Khác',
      };
      const byCategory = statsRes?.data?.by_category || [];
      const categories = byCategory.map(c => ({
        name: categoryLabelMap[c.category] || c.category,
        value: Number(c.total || 0),
      }));
      setCategoryData(categories);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await axios.get('/api/wallets');
      const ws = res?.data?.wallets || [];
      setWallets(ws);
      if (ws.length > 0) {
        setFormData(prev => ({ ...prev, wallet_id: ws[0].id }));
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchActiveGoals = async () => {
    try {
      const response = await goalsAPI.getActive();
      setActiveGoals(response.data.goals || []);
    } catch (error) {
      console.error('Error fetching active goals:', error);
    }
  };

  const fetchUpcomingRecurring = async () => {
    try {
      const response = await recurringAPI.getUpcoming();
      setUpcomingRecurring(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching upcoming recurring:', error);
    }
  };

  const fetchUpcomingBills = async () => {
    try {
      const response = await billsAPI.getUpcoming(14);
      setUpcomingBills(response.data.bills || []);
    } catch (error) {
      console.error('Error fetching upcoming bills:', error);
    }
  };

  const fetchUpcomingDebts = async () => {
    try {
      const response = await debtsAPI.getUpcoming(7);
      setUpcomingDebts(response.data.debts || []);
    } catch (error) {
      console.error('Error fetching upcoming debts:', error);
    }
  };

  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'amount') {
      const caret = e.target.selectionStart || 0;
      const { text, caret: nextCaret } = formatAmountLive(value, caret, { numberFormat: settings.numberFormat });
      setAmountInput(text);
      const parsed = parseAmountInput(text, { numberFormat: settings.numberFormat });
      setFormData(prev => ({ ...prev, amount: parsed }));
      requestAnimationFrame(() => {
        if (amountInputRef.current) {
          amountInputRef.current.setSelectionRange(nextCaret, nextCaret);
        }
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.wallet_id) {
      toast({ type: 'warning', message: 'Vui lòng chọn ví' });
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast({ type: 'warning', message: 'Số tiền phải lớn hơn 0' });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...formData, amount: parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat }) };
      const res = await axios.post('/api/expenses', payload);
      const walletInfo = res.data.wallet;
      
      // Show success toast with balance change notification
      if (walletInfo) {
        const changeAmount = walletInfo.balance_change;
        const isPositive = changeAmount > 0;
        const changeText = isPositive ? '+' : '';
        const selectedWallet = wallets.find(w => w.id === formData.wallet_id);
        const walletCurrency = selectedWallet?.currency || settings.currency;
        const changeFormatted = formatCurrency(
          Math.abs(changeAmount), 
          walletCurrency, 
          settings.numberFormat
        );
        const newBalanceFormatted = formatCurrency(
          walletInfo.new_balance, 
          walletCurrency, 
          settings.numberFormat
        );
        
        toast({ 
          type: 'success', 
          message: `Thêm giao dịch thành công! ${changeText}${changeFormatted} → Số dư: ${newBalanceFormatted}`,
          duration: 4000
        });
      } else {
        toast({ type: 'success', message: 'Thêm giao dịch thành công!' });
      }
      
      setShowAddModal(false);
      setFormData({
        amount: 0,
        category: 'food',
        description: '',
        wallet_id: wallets[0]?.id || '',
        is_expense: true,
        date: new Date().toISOString().slice(0, 10),
      });
      setAmountInput('');
      setLoading(true);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({ type: 'error', message: error?.response?.data?.error || 'Lỗi khi thêm giao dịch' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">
            Tổng quan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Chào mừng trở lại, {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/expenses/new')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus className="h-5 w-5" />
          <span>Thêm giao dịch</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Thu nhập</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats?.totalIncome || 0, settings.currency, settings.numberFormat)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Chi tiêu</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats?.totalExpenses || 0, settings.currency, settings.numberFormat)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Số dư</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats?.balance || 0, settings.currency, settings.numberFormat)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8 min-w-0">

          {/* Charts Section */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Phân tích</h3>
              <div className="flex p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
                <button
                  onClick={() => setChartTab('trends')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    chartTab === 'trends'
                      ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  )}
                >
                  Xu hướng
                </button>
                <button
                  onClick={() => setChartTab('categories')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    chartTab === 'categories'
                      ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  )}
                >
                  Danh mục
                </button>
              </div>
            </div>

            <div
              className="w-full"
              style={{
                height: '300px',
                minHeight: '300px',
                minWidth: '300px',
                position: 'relative',
                display: 'block'
              }}
            >
              {chartTab === 'trends' ? (
                trendData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                    minWidth={300}
                    minHeight={300}
                  >
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value / 1000000}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu xu hướng</p>
                  </div>
                )
              ) : (
                categoryData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                    minWidth={300}
                    minHeight={300}
                  >
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu danh mục</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Giao dịch gần đây</h3>
              <button
                onClick={() => navigate('/expenses')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Xem tất cả
              </button>
            </div>
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  onClick={() => navigate(`/expenses?view=${expense.id}`)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      expense.is_expense
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    )}>
                      {expense.is_expense ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{expense.category}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{expense.description || 'Không có ghi chú'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      expense.is_expense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )}>
                      {expense.is_expense ? '-' : '+'}{formatCurrency(expense.amount, settings.currency, settings.numberFormat)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(expense.date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) (1/3) */}
        <div className="space-y-8">

          {/* Wallets Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ví của tôi</h3>
              <button onClick={() => navigate('/wallets')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {wallets.slice(0, 3).map(wallet => (
                <div key={wallet.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{wallet.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{wallet.type}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(wallet.balance, settings.currency, settings.numberFormat)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Sắp đến hạn</h3>
            <div className="space-y-4">
              {upcomingBills.slice(0, 2).map(bill => (
                <div key={bill.id} className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{bill.name}</p>
                    <p className="text-xs text-gray-500">Hóa đơn • {bill.due_date}</p>
                  </div>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(bill.amount, settings.currency)}
                  </p>
                </div>
              ))}
              {upcomingRecurring.slice(0, 2).map(rec => (
                <div key={rec.id} className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.name}</p>
                    <p className="text-xs text-gray-500">Định kỳ • {rec.next_due_date}</p>
                  </div>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(rec.amount, settings.currency)}
                  </p>
                </div>
              ))}
              {upcomingBills.length === 0 && upcomingRecurring.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Không có thông báo nào</p>
              )}
            </div>
          </div>

          {/* Goals */}
          {activeGoals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mục tiêu</h3>
                <button onClick={() => navigate('/goals')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                {activeGoals.slice(0, 3).map(goal => (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{goal.name}</span>
                      <span className="text-gray-500">{goal.progress_percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${goal.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Thêm giao dịch nhanh</h2>
            <QuickTransactionForm
              formData={formData}
              onChange={handleAddChange}
              onSubmit={handleAddSubmit}
              loading={saving}
              amountInput={amountInput}
              amountInputRef={amountInputRef}
            />
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
