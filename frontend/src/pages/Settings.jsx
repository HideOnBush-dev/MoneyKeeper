import { useState, useEffect } from 'react';
import { Crown, Sparkles, Zap, Check, MessageSquare, Globe, Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import Select from '../components/Select';
import PageHeader from '../components/PageHeader';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [premiumInfo, setPremiumInfo] = useState({ premium: false, chatMessageCount: 0, limit: 200 });

  useEffect(() => {
    // Load premium status from user context
    if (user) {
      setPremiumInfo({
        premium: user.premium || false,
        chatMessageCount: user.chat_message_count || 0,
        limit: user.premium ? Infinity : 200,
      });
    }
  }, [user]);

  const handleUpgrade = () => {
    alert('Tính năng thanh toán sẽ sớm được ra mắt! 🎉');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      <PageHeader icon={SettingsIcon} title="Cài đặt" iconColor="from-gray-600 to-slate-700" />

      {/* Premium Section */}
      <div className={`relative overflow-hidden rounded-2xl shadow-md ${
          premiumInfo.premium
            ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500'
            : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600'
        } p-6 text-white`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <Crown className="h-6 w-6" />
          <h2 className="text-xl font-bold">
            {premiumInfo.premium ? 'Premium' : 'Nâng cấp Premium'}
          </h2>
        </div>

        {premiumInfo.premium ? (
            <div className="space-y-3">
              <p className="text-sm opacity-90">
                Cảm ơn bạn đã là thành viên Premium! 🎉
              </p>
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 bg-white/20 backdrop-blur rounded-xl">
                  <p className="text-xs opacity-80">Tin nhắn AI</p>
                  <p className="text-lg font-bold">Không giới hạn</p>
                </div>
                <div className="px-3 py-2 bg-white/20 backdrop-blur rounded-xl">
                  <p className="text-xs opacity-80">Trạng thái</p>
                  <p className="text-sm font-bold flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Hoạt động
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm opacity-90">
                Mở khóa toàn bộ tính năng Premium
              </p>

              {/* Message usage */}
              <div className="bg-white/20 backdrop-blur rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-semibold text-sm">Tin nhắn AI hôm nay</span>
                  </div>
                  <span className="text-lg font-bold">
                    {premiumInfo.chatMessageCount}/{premiumInfo.limit}
                  </span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((premiumInfo.chatMessageCount / premiumInfo.limit) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm mt-2 opacity-75">
                  {premiumInfo.chatMessageCount >= premiumInfo.limit
                    ? 'Bạn đã đạt giới hạn hôm nay. Nâng cấp để tiếp tục!'
                    : `Còn ${premiumInfo.limit - premiumInfo.chatMessageCount} tin nhắn`}
                </p>
              </div>

              {/* Features list */}
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  'Tin nhắn AI không giới hạn',
                  'Báo cáo chi tiêu nâng cao',
                  'Xuất dữ liệu không giới hạn',
                  'Hỗ trợ ưu tiên',
                  'Tính năng mới sớm nhất',
                  'Không quảng cáo'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                className="w-full py-3 bg-white text-purple-600 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Zap className="h-5 w-5" />
                Nâng cấp Premium
              </button>
            </div>
          )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Định dạng số tiền</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Chọn cách nhập dấu chấm, dấu phẩy khi gõ số tiền.</p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4 text-blue-600 dark:text-blue-500"
              checked={settings.numberFormat === 'vi-VN'}
              onChange={() => updateSettings({ numberFormat: 'vi-VN' })}
            />
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Tiếng Việt (vi-VN)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Thí dụ: 1.234.567,89</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4 text-blue-600 dark:text-blue-500"
              checked={settings.numberFormat === 'en-US'}
              onChange={() => updateSettings({ numberFormat: 'en-US' })}
            />
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">English (en-US)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Example: 1,234,567.89</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Tiền tệ mặc định</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Tiền tệ dùng để hiển thị số tiền.</p>
        <Select
          value={settings.currency}
          onChange={(value) => updateSettings({ currency: value })}
          options={[
            { value: 'VND', label: 'VND – Vietnamese Dong', icon: '🇻🇳' },
            { value: 'USD', label: 'USD – US Dollar', icon: '🇺🇸' },
            { value: 'EUR', label: 'EUR – Euro', icon: '🇪🇺' },
            { value: 'JPY', label: 'JPY – Japanese Yen', icon: '🇯🇵' },
          ]}
          icon={Globe}
          placeholder="Chọn tiền tệ"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Giao diện</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Chủ đề màu sắc cho ứng dụng.</p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4 text-blue-600 dark:text-blue-500"
              checked={settings.theme === 'light'}
              onChange={() => updateSettings({ theme: 'light' })}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Sáng</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4 text-blue-600 dark:text-blue-500"
              checked={settings.theme === 'dark'}
              onChange={() => updateSettings({ theme: 'dark' })}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tối</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;
