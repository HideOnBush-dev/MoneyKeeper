import { useEffect, useMemo, useRef, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Tag, Wallet as WalletIcon, Calendar as CalendarIcon, Users, Check, Camera, X } from 'lucide-react';
import { expenseAPI, walletAPI, splitsAPI } from '../services/api';
import { useToast } from './Toast';
import { useSettings } from '../contexts/SettingsContext';
import { parseAmountInput, formatAmountInput, formatAmountLive } from '../lib/numberFormat';
import { formatCurrency } from '../lib/utils';
import Select from './Select';
import CategoryGrid from './CategoryGrid';
import { useTranslation } from 'react-i18next';

const todayStr = () => new Date().toISOString().slice(0, 10);

const QuickTransactionForm = ({
  onSuccess,
  variant = 'modal', // 'modal' | 'inline' | 'page'
  initialType = 'expense', // 'expense' | 'income'
  wallets: walletsProp,
  onCancel,
  initialData = null, // OCR data or expense data: { amount, date, category, description, wallet_id, is_expense, image_path }
  expenseId = null, // ID of expense to edit
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings } = useSettings();
  
  // Expense categories
  const EXPENSE_CATEGORIES = [
    { value: 'food', label: t('categories.food'), emoji: '🍔' },
    { value: 'transport', label: t('categories.transport'), emoji: '🚗' },
    { value: 'shopping', label: t('categories.shopping'), emoji: '🛍️' },
    { value: 'entertainment', label: t('categories.entertainment'), emoji: '🎮' },
    { value: 'health', label: t('categories.health'), emoji: '💊' },
    { value: 'education', label: t('categories.education'), emoji: '📚' },
    { value: 'utilities', label: t('categories.utilities'), emoji: '💡' },
    { value: 'other', label: t('categories.other'), emoji: '📦' },
  ];

  // Income categories
  const INCOME_CATEGORIES = [
    { value: 'salary', label: t('categories.salary'), emoji: '💰' },
    { value: 'bonus', label: t('categories.bonus'), emoji: '🎁' },
    { value: 'investment', label: t('categories.investment'), emoji: '📈' },
    { value: 'freelance', label: t('categories.freelance'), emoji: '💼' },
    { value: 'gift', label: t('categories.gift'), emoji: '🎁' },
    { value: 'refund', label: t('categories.refund'), emoji: '↩️' },
    { value: 'other', label: t('categories.other'), emoji: '📦' },
  ];
  const [wallets, setWallets] = useState(walletsProp || []);
  const [saving, setSaving] = useState(false);

  // Split state
  const [isSplit, setIsSplit] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [splitMembers, setSplitMembers] = useState([]); // { memberId, amount, isChecked }

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Safely handle initialData amount
  const initialAmount = initialData?.amount && !isNaN(initialData.amount) ? initialData.amount : 0;
  const initialDate = initialData?.date || todayStr();

  const [amountInput, setAmountInput] = useState(
    initialAmount > 0 ? formatAmountInput(initialAmount, { numberFormat: settings.numberFormat }) : ''
  );
  const amountRef = useRef(null);

  // Get default category for current type
  const getDefaultCategory = (isExpense) => {
    return isExpense ? 'food' : 'salary';
  };

  const [formData, setFormData] = useState({
    amount: initialAmount,
    category: initialData?.category || getDefaultCategory(initialType === 'expense'),
    description: initialData?.description || '',
    wallet_id: initialData?.wallet_id || '',
    is_expense: initialData?.is_expense !== undefined ? initialData.is_expense : (initialType === 'expense'),
    date: initialDate,
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && expenseId) {
      const dataAmount = initialData.amount && !isNaN(initialData.amount) ? initialData.amount : 0;
      const formattedAmount = dataAmount > 0 ? formatAmountInput(dataAmount, { numberFormat: settings.numberFormat }) : '';
      
      setAmountInput(formattedAmount);
      setFormData(prev => ({
        ...prev,
        amount: dataAmount,
        category: initialData.category || getDefaultCategory(initialData.is_expense !== undefined ? initialData.is_expense : true),
        description: initialData.description || '',
        wallet_id: initialData.wallet_id || prev.wallet_id || '',
        is_expense: initialData.is_expense !== undefined ? initialData.is_expense : (initialType === 'expense'),
        date: initialData.date || todayStr(),
      }));
      
      // Set image preview if has image (support both image_path and image_url)
      if (initialData.image_path || initialData.image_url) {
        setImagePreview(initialData.image_path || initialData.image_url);
      }
    }
  }, [initialData, expenseId, settings.numberFormat, initialType]);

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
      setFormData((prev) => ({ ...prev, category: defaultCat }));
    }
  }, [formData.is_expense, formData.category, currentCategories]);

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

      // Fetch groups for splitting
      try {
        const res = await splitsAPI.getGroups();
        setGroups(res.data.groups || []);
      } catch {
        // ignore
      }
    };
    fetchIfNeeded();
  }, [walletsProp]);

  // Update split members when group changes
  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find(g => g.id === parseInt(selectedGroupId));
      if (group) {
        // Let's just list all members.
        setSplitMembers(group.members.map(m => ({
          ...m,
          isChecked: true, // Default to include everyone
          amount: 0 // Will calculate later
        })));
      }
    } else {
      setSplitMembers([]);
    }
  }, [selectedGroupId, groups]);

  // Recalculate split amounts when amount or members change
  useEffect(() => {
    if (isSplit && splitMembers.length > 0 && formData.amount > 0) {
      const checkedMembers = splitMembers.filter(m => m.isChecked);
      if (checkedMembers.length > 0) {
        // Split equally
        const splitAmount = formData.amount / checkedMembers.length;
        setSplitMembers(prev => prev.map(m => ({
          ...m,
          amount: m.isChecked ? splitAmount : 0
        })));
      }
    }
  }, [isSplit, formData.amount, splitMembers.map(m => m.isChecked).join(',')]);

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

  const toggleMember = (memberId) => {
    setSplitMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, isChecked: !m.isChecked } : m
    ));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ type: 'error', message: t('transactionForm.selectImageFile') });
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ type: 'error', message: t('transactionForm.imageSizeLimit') });
        return;
      }
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submit = async (e) => {
    e && e.preventDefault();
    if (!formData.wallet_id) {
      toast({ type: 'warning', message: t('transactionForm.selectWalletWarning') });
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast({ type: 'warning', message: t('transactionForm.amountMustBePositive') });
      return;
    }

    try {
      setSaving(true);
      const parsedAmount = parseAmountInput(amountInput || String(formData.amount), { numberFormat: settings.numberFormat });

      // If image is selected, create FormData
      let payload;
      if (selectedImage) {
        const formDataObj = new FormData();
        formDataObj.append('amount', parsedAmount);
        formDataObj.append('category', formData.category);
        formDataObj.append('description', formData.description);
        formDataObj.append('wallet_id', formData.wallet_id);
        formDataObj.append('is_expense', formData.is_expense);
        formDataObj.append('date', formData.date);
        formDataObj.append('image', selectedImage);
        payload = formDataObj;
      } else {
        payload = { ...formData, amount: parsedAmount };
      }

      // Create or update expense
      let res;
      let expenseIdResult;
      if (expenseId) {
        // Update existing expense
        res = await expenseAPI.update(expenseId, payload);
        expenseIdResult = expenseId;
      } else {
        // Create new expense
        res = await expenseAPI.create(payload);
        expenseIdResult = res.data.expense.id;
      }
      const walletInfo = res.data.wallet;

      // If split is enabled, create splits (only for new expenses)
      if (!expenseId && isSplit && selectedGroupId && splitMembers.some(m => m.isChecked)) {
        const splits = splitMembers
          .filter(m => m.isChecked && m.amount > 0)
          .map(m => ({
            member_id: m.id,
            amount: m.amount
          }));

        await splitsAPI.splitExpense(expenseIdResult, { splits });
      }

      // Show success toast with balance change notification
      const selectedWallet = wallets.find(w => w.id === formData.wallet_id);
      const walletCurrency = selectedWallet?.currency || settings.currency;
      
      if (walletInfo) {
        const changeAmount = walletInfo.balance_change;
        const isPositive = changeAmount > 0;
        const changeText = isPositive ? '+' : '';
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
          message: expenseId 
            ? `${t('messages.updateSuccess')} ${changeText}${changeFormatted} → ${t('wallet.balance')}: ${newBalanceFormatted}`
            : `${t('expense.addSuccess')} ${changeText}${changeFormatted} → ${t('wallet.balance')}: ${newBalanceFormatted}`,
          duration: 4000
        });
      } else {
        toast({ 
          type: 'success', 
          message: expenseId ? t('messages.updateSuccess') : t('expense.addSuccess')
        });
      }
      // Only reset form if creating new expense, not editing
      if (!expenseId) {
        setFormData({
          amount: 0,
          category: getDefaultCategory(initialType === 'expense'),
          description: '',
          wallet_id: wallets[0]?.id || '',
          is_expense: initialType === 'expense',
          date: todayStr(),
        });
        setAmountInput('');
        setIsSplit(false);
        setSelectedGroupId('');
        removeImage(); // Clear image
      }
      onSuccess && onSuccess();
    } catch (error) {
      console.error(error);
      toast({ type: 'error', message: error?.response?.data?.error || t('expense.addError') });
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
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.type')}</label>
        <div className="relative w-full bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex gap-1">
          <button
            type="button"
            onClick={() => {
              const defaultCat = getDefaultCategory(true);
              setFormData((prev) => ({ ...prev, is_expense: true, category: defaultCat }));
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${formData.is_expense
              ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <TrendingDown className="h-4 w-4" />
            {t('transactionForm.expense')}
          </button>
          <button
            type="button"
            onClick={() => {
              const defaultCat = getDefaultCategory(false);
              setFormData((prev) => ({ ...prev, is_expense: false, category: defaultCat }));
              setIsSplit(false); // Disable split for income
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${!formData.is_expense
              ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            {t('transactionForm.income')}
          </button>
        </div>
      </div>

      {/* Amount Field */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.amount')}</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400 dark:text-gray-500">
            {currencySymbol}
          </span>
          <input
            type="text"
            name="amount"
            value={amountInput}
            onChange={handleChange}
            onBlur={() => setAmountInput(formatAmountInput(amountInput || formData.amount, { numberFormat: settings.numberFormat }))}
            ref={amountRef}
            className={`w-full py-3 pl-10 pr-4 border-2 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all text-lg font-semibold ${formData.is_expense
              ? 'border-red-200 dark:border-red-800 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-200 dark:focus:ring-red-900/30'
              : 'border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-200 dark:focus:ring-green-900/30'
              }`}
            placeholder="0"
            required
          />
        </div>
      </div>

      {/* Category - Grid for page, Select for modal */}
      {!isInline && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('transactionForm.category')}</label>
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
              placeholder={t('transactionForm.selectCategory')}
            />
          )}
        </div>
      )}

      {/* Wallet + Date */}
      <div className={isInline ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.wallet')}</label>
          <Select
            value={formData.wallet_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, wallet_id: value }))}
            options={wallets.map(w => ({
              value: w.id,
              label: w.name
            }))}
            icon={WalletIcon}
            placeholder={t('transactionForm.selectWallet')}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.date')}</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full py-3 pl-9 pr-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
              required
            />
          </div>
        </div>
      </div>

      {/* Description (modal only) */}
      {!isInline && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.description')}</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder={t('transactionForm.enterDescription')}
          />
        </div>
      )}

      {/* Image Upload */}
      {!isInline && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Ảnh hóa đơn</label>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="invoice-image"
            />

            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Invoice preview"
                  className="w-full h-48 object-cover rounded-xl border-2 border-gray-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="invoice-image"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
              >
                <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('transactionForm.uploadImage')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, JPG, WEBP ({t('transactionForm.imageSizeLimit')})</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Split Expense Option */}
      {!isInline && formData.is_expense && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsSplit(!isSplit)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <Users className="h-4 w-4" />
            {isSplit ? t('split.settleUp') : t('transactionForm.splitExpense')}
          </button>

          {isSplit && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('transactionForm.selectGroup')}</label>
                <Select
                  value={selectedGroupId}
                  onChange={(value) => setSelectedGroupId(value)}
                  options={groups.map(g => ({
                    value: g.id,
                    label: g.name
                  }))}
                  placeholder={t('transactionForm.selectGroup')}
                />
              </div>

              {selectedGroupId && splitMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('group.members')}</label>
                  <div className="space-y-2">
                    {splitMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.isChecked}
                            onChange={() => toggleMember(member.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{member.name}</span>
                        </label>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {member.isChecked ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(member.amount) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={isInline ? 'flex items-center gap-2 pt-1' : 'grid grid-cols-2 gap-3 pt-2'}>
        {(isPage || (!isInline && onCancel)) && (
          <button
            type="button"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-colors whitespace-nowrap"
            onClick={onCancel}
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          onClick={submit}
          className={`w-full px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap ${formData.is_expense ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'} disabled:opacity-50`}
          disabled={saving}
        >
          {saving ? t('common.loading') : (expenseId ? t('common.update') : t('expense.addExpense'))}
        </button>
      </div>
    </div>
  );
};

export default QuickTransactionForm;


