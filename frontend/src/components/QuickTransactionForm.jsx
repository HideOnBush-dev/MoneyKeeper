import { useEffect, useMemo, useRef, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Tag, Wallet as WalletIcon, Calendar as CalendarIcon } from 'lucide-react';
import { expenseAPI, walletAPI } from '../services/api';
import { useToast } from './Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';
import Select from './Select';
import CategoryGrid from './CategoryGrid';
  
// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Ăn uống', emoji: '🍔' },
  { value: 'transport', label: 'Di chuyển', emoji: '🚗' },
  { value: 'shopping', label: 'Mua sắm', emoji: '🛍️' },
  { value: 'entertainment', label: 'Giải trí', emoji: '🎮' },
  { value: 'health', label: 'Sức khỏe', emoji: '💊' },
  { value: 'education', label: 'Giáo dục', emoji: '📚' },
  { value: 'utilities', label: 'Tiện ích', emoji: '💡' },
  { value: 'other', label: 'Khác', emoji: '📦' },
];

// Income categories
const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Lương', emoji: '💰' },
  { value: 'bonus', label: 'Thưởng', emoji: '🎁' },
  { value: 'investment', label: 'Đầu tư', emoji: '📈' },
  { value: 'freelance', label: 'Freelance', emoji: '💼' },
  { value: 'gift', label: 'Quà tặng', emoji: '🎁' },
  { value: 'refund', label: 'Hoàn tiền', emoji: '↩️' },
  { value: 'other', label: 'Khác', emoji: '📦' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const QuickTransactionForm = ({
  onSuccess,
  variant = 'modal', // 'modal' | 'inline' | 'page'
  initialType = 'expense', // 'expense' | 'income'
  wallets: walletsProp,
  onCancel,
  initialData = null, // OCR/AI data: { amount, date, fee, note, merchant, invoice_number, suggested_category }
}) => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [wallets, setWallets] = useState(walletsProp || []);
  const [saving, setSaving] = useState(false);
  
  // Safely handle initialData amount
  const initialAmount = initialData?.amount && !isNaN(initialData.amount) ? initialData.amount : 0;
  const initialDate = initialData?.date || todayStr();
  const initialFee = initialData?.fee && !isNaN(initialData.fee) ? initialData.fee : null;
  const initialNote = initialData?.note || '';
  const suggestedCategory = initialData?.suggested_category;
  
  const [amountInput, setAmountInput] = useState(
    initialAmount > 0 ? formatAmountInput(initialAmount, { numberFormat: settings.numberFormat }) : ''
  );
  const amountRef = useRef(null);

  // Get default category for current type
  const getDefaultCategory = (isExpense) => {
    return isExpense ? 'food' : 'salary';
  };
  
  // Determine initial category: use suggested if available and valid, otherwise default
  const getInitialCategory = (isExpense) => {
    if (suggestedCategory) {
      // Validate that suggested category exists in current category list
      const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const isValid = categories.some(c => c.value === suggestedCategory);
      if (isValid) {
        return suggestedCategory;
      }
    }
    return getDefaultCategory(isExpense);
  };

  const [formData, setFormData] = useState({
    amount: initialAmount,
    category: getInitialCategory(initialType === 'expense'),
    description: initialNote, // Use OCR note as initial description
    wallet_id: '',
    is_expense: initialType === 'expense',
    date: initialDate,
  });
  
  // Update form when initialData changes (from OCR)
  useEffect(() => {
    if (initialData) {
      if (initialData.amount && !isNaN(initialData.amount)) {
        const isExpense = formData.is_expense;
        const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        
        // Determine category to use
        let categoryToUse = formData.category;
        if (initialData.suggested_category) {
          const isValid = categories.some(c => c.value === initialData.suggested_category);
          if (isValid) {
            categoryToUse = initialData.suggested_category;
          }
        }
        
        setFormData(prev => ({
          ...prev,
          amount: initialData.amount,
          category: categoryToUse,
          description: initialData.note || prev.description,
          date: initialData.date || prev.date,
        }));
        setAmountInput(formatAmountInput(initialData.amount, { numberFormat: settings.numberFormat }));
      }
    }
  }, [initialData, settings.numberFormat, formData.is_expense]);

  // Get current categories based on transaction type
  const currentCategories = useMemo(() => {
    return formData.is_expense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [formData.is_expense]);

  // Reset category when transaction type changes
  useEffect(() => {
    const defaultCat = getDefaultCategory(formData.is_expense);
    // Only reset if current category is not in the new category list
    const isValid = currentCategories.some(c => c.value === formData.category);
    if (!isValid) {
      // If we have a suggested category and it's valid, use it; otherwise use default
      let categoryToUse = defaultCat;
      if (suggestedCategory) {
        const isSuggestedValid = currentCategories.some(c => c.value === suggestedCategory);
        if (isSuggestedValid) {
          categoryToUse = suggestedCategory;
        }
      }
      setFormData((prev) => {
        // Only update if category actually needs to change
        if (prev.category !== categoryToUse) {
          return { ...prev, category: categoryToUse };
        }
        return prev;
      });
    }
  }, [formData.is_expense, formData.category, currentCategories, suggestedCategory]);

  useEffect(() => {
    const fetchIfNeeded = async () => {
      if (!walletsProp || walletsProp.length === 0) {
        try {
          const res = await walletAPI.getAll();
          const ws = res?.data?.wallets || [];
          setWallets(ws);
          if (ws.length > 0) {
            setFormData((prev) => ({ ...prev, wallet_id: ws[0].id }));
          }
        } catch {
          // ignore
        }
      }
    };
    fetchIfNeeded();
  }, [walletsProp]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const caret = e.target.selectionStart || 0;
      const { text, caret: nextCaret } = formatAmountLive(value, caret, { numberFormat: settings.numberFormat });
      setAmountInput(text);
      const parsed = parseAmountInput(text, { numberFormat: settings.numberFormat });
      setFormData((prev) => ({ ...prev, amount: parsed }));
      requestAnimationFrame(() => {
        if (amountRef.current) {
          amountRef.current.setSelectionRange(nextCaret, nextCaret);
        }
      });
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e && e.preventDefault();
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
      await expenseAPI.create(payload);
      toast({ type: 'success', message: 'Thêm giao dịch thành công!' });
      setFormData({
        amount: 0,
        category: getDefaultCategory(initialType === 'expense'),
        description: '',
        wallet_id: wallets[0]?.id || '',
        is_expense: initialType === 'expense',
        date: todayStr(),
      });
      setAmountInput('');
      onSuccess && onSuccess();
    } catch (error) {
      toast({ type: 'error', message: error?.response?.data?.error || 'Lỗi khi thêm giao dịch' });
    } finally {
      setSaving(false);
    }
  };

  const isInline = variant === 'inline';
  const isPage = variant === 'page';
  const currencySymbol = useMemo(() => {
    const code = settings.currency || 'VND';
    try {
      // Try to infer symbol using Intl
      const parts = new Intl.NumberFormat(settings.numberFormat || 'vi-VN', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0 }).formatToParts(0);
      const sym = parts.find(p => p.type === 'currency')?.value;
      return sym || (code === 'VND' ? '₫' : '$');
    } catch {
      return code === 'VND' ? '₫' : '$';
    }
  }, [settings.currency, settings.numberFormat]);

  return (
    <div className={isInline ? 'w-full' : 'w-full space-y-4'}>
      {/* Type Selector - Segmented control */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Loại giao dịch</label>
        <div className="relative w-full bg-gray-100 rounded-xl p-1 flex gap-1">
          <button
            type="button"
            onClick={() => {
              const defaultCat = getDefaultCategory(true);
              setFormData((prev) => ({ ...prev, is_expense: true, category: defaultCat }));
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              formData.is_expense 
                ? 'bg-white text-red-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => {
              const defaultCat = getDefaultCategory(false);
              setFormData((prev) => ({ ...prev, is_expense: false, category: defaultCat }));
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              !formData.is_expense 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Thu nhập
          </button>
        </div>
      </div>

      {/* Amount Field */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Số tiền</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
            {currencySymbol}
          </span>
          <input
            type="text"
            name="amount"
            value={amountInput}
            onChange={handleChange}
            onBlur={() => {
              // Parse the current input to get the actual number, then format it
              const parsed = parseAmountInput(amountInput || String(formData.amount || ''), { numberFormat: settings.numberFormat });
              if (parsed > 0 || amountInput) {
                setAmountInput(formatAmountInput(parsed, { numberFormat: settings.numberFormat }));
                setFormData((prev) => ({ ...prev, amount: parsed }));
              }
            }}
            ref={amountRef}
            className={`w-full py-3 pl-10 pr-4 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all text-lg font-semibold ${
              formData.is_expense 
                ? 'border-red-200 focus:border-red-500 focus:ring-red-200' 
                : 'border-green-200 focus:border-green-500 focus:ring-green-200'
            }`}
            placeholder="0"
            required
          />
        </div>
        {initialFee && initialFee > 0 && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Phí/VAT đã phát hiện:</span>{' '}
              {formatAmountInput(initialFee, { numberFormat: settings.numberFormat })} đ
            </p>
          </div>
        )}
      </div>

      {/* Category - Grid for page, Select for modal */}
      {!isInline && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-600">Danh mục</label>
            {suggestedCategory && formData.category === suggestedCategory && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <span>🤖</span>
                <span>Tự động chọn</span>
              </span>
            )}
          </div>
          {isPage ? (
            <CategoryGrid
              categories={currentCategories}
              value={formData.category}
              onChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              columns={4}
            />
          ) : (
            <Select
              value={formData.category}
              onChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              options={currentCategories.map(c => ({
                value: c.value,
                label: c.label,
                icon: c.emoji
              }))}
              icon={Tag}
              placeholder="Chọn danh mục"
            />
          )}
        </div>
      )}

      {/* Wallet + Date */}
      <div className={isInline ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ví</label>
          <Select
            value={formData.wallet_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, wallet_id: value }))}
            options={wallets.map(w => ({
              value: w.id,
              label: w.name
            }))}
            icon={WalletIcon}
            placeholder="Chọn ví"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full py-3 pl-9 pr-3 border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
              required
            />
          </div>
        </div>
      </div>

      {/* Description (modal only) */}
      {!isInline && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mô tả</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Ghi chú (tuỳ chọn)"
          />
        </div>
      )}

      {/* Actions */}
      <div className={isInline ? 'flex items-center gap-2 pt-1' : 'grid grid-cols-2 gap-3 pt-2'}>
        {(isPage || (!isInline && onCancel)) && (
          <button
            type="button"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors whitespace-nowrap"
            onClick={onCancel}
            disabled={saving}
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          onClick={submit}
          className={`w-full px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap ${formData.is_expense ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'} disabled:opacity-50`}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Thêm giao dịch'}
        </button>
      </div>
    </div>
  );
};

export default QuickTransactionForm;


