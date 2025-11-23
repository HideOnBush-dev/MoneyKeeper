import { X, Calendar, Wallet, Tag, DollarSign, FileImage, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

const ExpenseDetailModal = ({ expense, wallet, categoryData, onClose, onEdit, onDelete }) => {
  const { settings } = useSettings();

  if (!expense) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chi tiết giao dịch
          </h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Chỉnh sửa"
              >
                <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
                    onDelete(expense.id);
                    onClose();
                  }
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Xóa"
              >
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount - Large and prominent */}
          <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
              {expense.is_expense ? 'Chi tiêu' : 'Thu nhập'}
            </p>
            <p className={`text-4xl font-bold ${
              expense.is_expense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {expense.is_expense ? '-' : '+'}
              {formatCurrency(expense.amount || 0, settings.currency, settings.numberFormat)}
            </p>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Mô tả
              </h3>
              <p className="text-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                {expense.description}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Danh mục
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryData?.gradient || 'from-gray-400 to-gray-500'}`}>
                  <span className="text-xl">{categoryData?.emoji || '📦'}</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {categoryData?.label || expense.category || 'Khác'}
                </p>
              </div>
            </div>

            {/* Wallet */}
            {wallet && (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Ví
                  </h3>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {wallet.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Số dư: {formatCurrency(wallet.balance || 0, wallet.currency, settings.numberFormat)}
                </p>
              </div>
            )}

            {/* Date */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Ngày
                </h3>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(expense.date).toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(expense.date).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Type */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Loại
                </h3>
              </div>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold ${
                expense.is_expense
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  expense.is_expense ? 'bg-red-500' : 'bg-green-500'
                }`}></span>
                {expense.is_expense ? 'Chi tiêu' : 'Thu nhập'}
              </span>
            </div>
          </div>

          {/* Image */}
          {(expense.image_path || expense.image_url) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Hình ảnh
              </h3>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                <img
                  src={expense.image_url || expense.image_path}
                  alt={expense.description || 'Giao dịch'}
                  className="w-full h-auto rounded-lg max-h-96 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Created/Updated info */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Tạo lúc: {expense.created_at ? new Date(expense.created_at).toLocaleString('vi-VN') : 'N/A'}
              </span>
              {expense.updated_at && expense.updated_at !== expense.created_at && (
                <span>
                  Cập nhật: {new Date(expense.updated_at).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;

