import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Định dạng số tiền</h2>
        <p className="text-gray-600 mb-4">Chọn cách nhập dấu chấm, dấu phẩy khi gõ số tiền.</p>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 rounded-xl border cursor-pointer">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4"
              checked={settings.numberFormat === 'vi-VN'}
              onChange={() => updateSettings({ numberFormat: 'vi-VN' })}
            />
            <div>
              <p className="font-medium">Tiếng Việt (vi-VN)</p>
              <p className="text-sm text-gray-500">Thí dụ: 1.234.567,89</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 rounded-xl border cursor-pointer">
            <input
              type="radio"
              name="numberFormat"
              className="h-4 w-4"
              checked={settings.numberFormat === 'en-US'}
              onChange={() => updateSettings({ numberFormat: 'en-US' })}
            />
            <div>
              <p className="font-medium">English (en-US)</p>
              <p className="text-sm text-gray-500">Example: 1,234,567.89</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Tiền tệ mặc định</h2>
        <p className="text-gray-600 mb-4">Tiền tệ dùng để hiển thị số tiền.</p>
        <select
          value={settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value })}
          className="px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold appearance-none"
        >
          <option value="VND">VND – Vietnamese Dong</option>
          <option value="USD">USD – US Dollar</option>
          <option value="EUR">EUR – Euro</option>
          <option value="JPY">JPY – Japanese Yen</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Giao diện</h2>
        <p className="text-gray-600 mb-4">Chủ đề màu sắc cho ứng dụng.</p>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 px-4 py-2 rounded-xl border cursor-pointer">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4"
              checked={settings.theme === 'light'}
              onChange={() => updateSettings({ theme: 'light' })}
            />
            <span>Sáng</span>
          </label>
          <label className="flex items-center space-x-2 px-4 py-2 rounded-xl border cursor-pointer">
            <input
              type="radio"
              name="theme"
              className="h-4 w-4"
              checked={settings.theme === 'dark'}
              onChange={() => updateSettings({ theme: 'dark' })}
            />
            <span>Tối</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;
