import { useTranslation } from 'react-i18next';
import { Home, Wallet, TrendingUp, DollarSign } from 'lucide-react';

/**
 * Example Component - Minh họa cách sử dụng i18n
 * 
 * Component này minh họa các cách sử dụng phổ biến của react-i18next:
 * - Dịch text đơn giản
 * - Dịch với tham số
 * - Lấy ngôn ngữ hiện tại
 * - Thay đổi ngôn ngữ
 */

const I18nExample = () => {
    const { t, i18n } = useTranslation();

    // Ví dụ 1: Translation đơn giản
    const title = t('dashboard.title');

    // Ví dụ 2: Translation với tham số
    const minLengthMessage = t('validation.minLength', { count: 8 });

    // Ví dụ 3: Lấy ngôn ngữ hiện tại
    const currentLanguage = i18n.language; // 'vi' hoặc 'en'

    // Ví dụ 4: Hàm thay đổi ngôn ngữ
    const toggleLanguage = () => {
        const newLang = i18n.language === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-2">{t('app.name')}</h1>
                <p className="text-gray-600 dark:text-gray-400">{t('app.slogan')}</p>
                <p className="mt-4 text-sm text-gray-500">
                    Current Language: <span className="font-bold">{currentLanguage}</span>
                </p>
                <button
                    onClick={toggleLanguage}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Toggle Language
                </button>
            </div>

            {/* Navigation Example */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
                    <Home className="h-8 w-8 text-blue-600" />
                    <span className="font-medium">{t('nav.dashboard')}</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
                    <Wallet className="h-8 w-8 text-green-600" />
                    <span className="font-medium">{t('nav.wallets')}</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <span className="font-medium">{t('nav.expenses')}</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                    <span className="font-medium">{t('nav.budgets')}</span>
                </div>
            </div>

            {/* Dashboard Stats Example */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl">
                    <h3 className="text-sm font-medium opacity-90">{t('dashboard.totalBalance')}</h3>
                    <p className="text-2xl font-bold mt-2">10,000,000 ₫</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl">
                    <h3 className="text-sm font-medium opacity-90">{t('dashboard.totalIncome')}</h3>
                    <p className="text-2xl font-bold mt-2">5,000,000 ₫</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl">
                    <h3 className="text-sm font-medium opacity-90">{t('dashboard.totalExpense')}</h3>
                    <p className="text-2xl font-bold mt-2">3,000,000 ₫</p>
                </div>
            </div>

            {/* Common Buttons Example */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow mb-8">
                <h3 className="text-lg font-bold mb-4">{t('common.save')} / {t('common.cancel')} Buttons</h3>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        {t('common.save')}
                    </button>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        {t('common.cancel')}
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        {t('common.delete')}
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        {t('common.add')}
                    </button>
                </div>
            </div>

            {/* Form Example with Validation */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow">
                <h3 className="text-lg font-bold mb-4">{t('auth.login')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('auth.email')}</label>
                        <input
                            type="email"
                            placeholder={t('auth.email')}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <p className="text-xs text-red-600 mt-1">{t('validation.required')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('auth.password')}</label>
                        <input
                            type="password"
                            placeholder={t('auth.password')}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <p className="text-xs text-gray-600 mt-1">{minLengthMessage}</p>
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        {t('auth.login')}
                    </button>
                </div>
            </div>

            {/* Messages Example */}
            <div className="mt-8 space-y-2">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300">
                    {t('messages.saveSuccess')}
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
                    {t('messages.errorOccurred')}
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300">
                    {t('messages.noData')}
                </div>
            </div>
        </div>
    );
};

export default I18nExample;
