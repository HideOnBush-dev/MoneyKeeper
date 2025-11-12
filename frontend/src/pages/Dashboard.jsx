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
  Target
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'amount') {
      // Live format with caret preservation
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
      // Ensure latest parse from input string
      const payload = { ...formData, amount: parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat }) };
      await axios.post('/api/expenses', payload);
      toast({ type: 'success', message: 'Thêm giao dịch thành công!' });
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
      // Refresh data
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold font-display text-gradient">
                  Dashboard
                </h1>
                <p className="text-gray-600 mt-1 flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Chào mừng trở lại! Hôm nay bạn thế nào?</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-4 py-3 border border-blue-200">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  {new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => navigate('/expenses/new')}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm giao dịch</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards với 3D Effect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Tổng thu nhập',
            value: formatCurrency(stats?.totalIncome || 0, settings.currency, settings.numberFormat),
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-500',
            bg: 'from-green-50 to-emerald-50',
            trend: '+12.5%',
            trendUp: true,
          },
          {
            title: 'Tổng chi tiêu',
            value: formatCurrency(stats?.totalExpenses || 0, settings.currency, settings.numberFormat),
            icon: TrendingDown,
            gradient: 'from-red-500 to-pink-500',
            bg: 'from-red-50 to-pink-50',
            trend: '-8.2%',
            trendUp: false,
          },
          {
            title: 'Số dư',
            value: formatCurrency(stats?.balance || 0, settings.currency, settings.numberFormat),
            icon: Wallet,
            gradient: 'from-blue-500 to-indigo-500',
            bg: 'from-blue-50 to-indigo-50',
            trend: '↑ Tăng',
            trendUp: true,
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-gray-100`}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-white to-transparent"></div>
              <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-gradient-to-br from-white to-transparent"></div>
            </div>

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${
                  stat.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stat.trend}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">{stat.title}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart với Modern Design */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Xu hướng thu chi</h3>
              <p className="text-sm text-gray-600 mt-1">7 ngày gần nhất</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Phân bổ chi tiêu</h3>
              <p className="text-sm text-gray-600 mt-1">Theo danh mục</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Recent Transactions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Giao dịch gần đây</h3>
              <p className="text-sm text-gray-600">5 giao dịch mới nhất</p>
            </div>
          </div>
          <a
            href="/expenses"
            className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="p-4 bg-gray-100 rounded-2xl">
                <DollarSign className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">Chưa có giao dịch nào</p>
            <p className="text-xs text-gray-400 mt-1">Thêm giao dịch đầu tiên của bạn</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense, index) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200 cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-2xl shadow-lg ${
                    expense.is_expense 
                      ? 'bg-gradient-to-br from-red-500 to-pink-500' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {expense.is_expense ? (
                      <ArrowDownRight className="h-5 w-5 text-white" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {expense.description || 'Không có mô tả'}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(expense.date).toLocaleDateString('vi-VN')}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    expense.is_expense ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {expense.is_expense ? '-' : '+'}{formatCurrency(expense.amount || 0, settings.currency, settings.numberFormat)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => !saving && setShowAddModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Thêm giao dịch</h3>
            <QuickTransactionForm
              wallets={wallets}
              onSuccess={async () => {
                setShowAddModal(false);
                setLoading(true);
                await fetchDashboardData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
