import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  DollarSign,
  Clock,
  Bell,
  CheckCircle,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { billsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';

const Bills = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  
  const BillStatusTabs = [
    { key: 'all', label: t('common.all') },
    { key: 'unpaid', label: t('bill.unpaid') },
    { key: 'paid', label: t('bill.paid') },
  ];

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const [markPaidData, setMarkPaidData] = useState({
    paid_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchBills(), fetchUpcoming()]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const fetchBills = async () => {
    try {
      const params = statusFilter !== 'all' ? statusFilter : undefined;
      const res = await billsAPI.getAll(params);
      setBills(res.data.bills || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({ type: 'error', message: t('messages.errorOccurred') });
    }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await billsAPI.getUpcoming(14);
      setUpcoming(res.data.bills || []);
    } catch (error) {
      console.error('Error fetching upcoming bills:', error);
    }
  };

  const handleCreateNavigate = () => navigate('/bills/new');
  const handleEditNavigate = (bill) => navigate(`/bills/${bill.id}/edit`);
  const handleDelete = async (bill) => {
    if (!confirm(t('messages.confirmDelete'))) return;
    try {
      await billsAPI.delete(bill.id);
      toast({ type: 'success', message: t('messages.deleteSuccess') });
      fetchBills();
      fetchUpcoming();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({ type: 'error', message: error.response?.data?.error || t('messages.errorOccurred') });
    }
  };

  const openMarkPaid = (bill) => {
    setSelectedBill(bill);
    setMarkPaidData({
      paid_date: new Date().toISOString().split('T')[0],
    });
    setShowMarkPaidModal(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      await billsAPI.markPaid(selectedBill.id, {
        paid_date: markPaidData.paid_date,
      });
      toast({ type: 'success', message: 'Đã đánh dấu hóa đơn đã thanh toán' });
      setShowMarkPaidModal(false);
      fetchBills();
      fetchUpcoming();
    } catch (error) {
      console.error('Error marking bill paid:', error);
      toast({ type: 'error', message: error.response?.data?.error || 'Lỗi khi cập nhật hóa đơn' });
    }
  };

  const getColorClass = (color) => {
    const map = {
      indigo: 'from-indigo-500 to-violet-500',
      rose: 'from-rose-500 to-pink-500',
      blue: 'from-blue-500 to-cyan-500',
      amber: 'from-amber-500 to-orange-500',
      emerald: 'from-emerald-500 to-teal-500',
      violet: 'from-violet-500 to-purple-500',
      cyan: 'from-cyan-500 to-sky-500',
    };
    return map[color] || map.indigo;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const overdueCount = bills.filter((b) => !b.is_paid && new Date(b.due_date) < new Date()).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Bell}
        title={t('bill.title')}
        subtitle={`${bills.length} ${t('bill.bills')}`}
        iconColor="from-indigo-500 to-violet-500"
        actions={
          <button
            onClick={handleCreateNavigate}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t('bill.addBill')}
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{t('bill.totalBills')}</p>
              <p className="text-2xl font-bold mt-1">{bills.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-white/80" />
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{t('bill.unpaid')}</p>
              <p className="text-2xl font-bold mt-1">
                {bills.filter((b) => !b.is_paid).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-white/80" />
          </div>
          {overdueCount > 0 && (
            <p className="text-xs mt-3 text-white/90">{overdueCount} {t('bill.overdue')}</p>
          )}
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{t('bill.paid')}</p>
              <p className="text-2xl font-bold mt-1">
                {bills.filter((b) => b.is_paid).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-white/80" />
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              {t('bill.upcomingBills')}
            </h2>
            <span className="text-xs text-gray-500">{upcoming.length} {t('bill.bills')}</span>
          </div>
          <div className="space-y-3">
            {upcoming.slice(0, 4).map((bill) => {
              const days = bill.days_until_due;
              const isOverdue = days < 0;
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${getColorClass(bill.color)}`}>
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{bill.name}</p>
                      <p className="text-xs text-gray-500">
                        {bill.due_date} • {formatCurrency(bill.amount, settings.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {isOverdue ? (
                      <span className="text-red-500">Quá hạn {Math.abs(days)} ngày</span>
                    ) : (
                      <span className="text-gray-600">{days === 0 ? 'Hôm nay' : `Còn ${days} ngày`}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {BillStatusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              statusFilter === tab.key
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills list */}
      {bills.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Chưa có hóa đơn</p>
          <p className="text-gray-500 mb-4 text-sm">
            Thêm hóa đơn để nhận nhắc nhở trước khi đến hạn
          </p>
          <button
            onClick={handleCreateNavigate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition"
          >
            Thêm hóa đơn đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((bill) => {
            const days = bill.days_until_due;
            const isOverdue = !bill.is_paid && days < 0;
            return (
              <div
                key={bill.id}
                className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hóa đơn</p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{bill.name}</h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 hover:bg-gray-200"
                      onClick={() => handleEditNavigate(bill)}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-red-600 hover:bg-gray-200"
                      onClick={() => handleDelete(bill)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 dark:bg-slate-700/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-500">Số tiền</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(bill.amount, settings.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/40 p-3 rounded-xl">
                    <p className="text-xs text-gray-500">Ngày đến hạn</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {bill.due_date}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  {!bill.is_paid ? (
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        isOverdue
                          ? 'bg-red-100 text-red-600'
                          : days <= 3
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {isOverdue
                        ? `Quá hạn ${Math.abs(days)} ngày`
                        : days === 0
                        ? 'Hôm nay'
                        : `Còn ${days} ngày`}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-600 text-xs font-semibold">
                      <CheckCircle className="h-4 w-4" />
                      Đã thanh toán
                    </div>
                  )}

                  {!bill.is_paid ? (
                    <button
                      onClick={() => openMarkPaid(bill)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-semibold hover:shadow-md"
                    >
                      Mark paid
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Ngày thanh toán: {bill.paid_date}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mark paid modal */}
      {showMarkPaidModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowMarkPaidModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full md:max-w-md md:rounded-2xl rounded-t-3xl md:rounded-b-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đánh dấu đã thanh toán</h3>
              <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setShowMarkPaidModal(false)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
              <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-xl border border-gray-200 dark:border-slate-600">
                <p className="text-xs text-gray-500">Hóa đơn</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedBill.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Số tiền: {formatCurrency(selectedBill.amount, settings.currency)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ngày thanh toán
                </label>
                <input
                  type="date"
                  value={markPaidData.paid_date}
                  onChange={(e) => setMarkPaidData({ paid_date: e.target.value })}
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
                />
              </div>

              <div className="fixed md:static bottom-16 md:bottom-auto left-0 right-0 flex gap-2 md:gap-3 p-4 md:p-0 md:pt-5 bg-white/95 dark:bg-slate-800/95 md:bg-white md:dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="flex-1 md:flex-none px-4 md:px-5 py-2.5 h-10 md:h-auto bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 md:flex-none px-4 md:px-6 py-2.5 h-10 md:h-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;

