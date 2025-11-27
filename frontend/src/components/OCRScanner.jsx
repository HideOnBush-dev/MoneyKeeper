import { useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from './Toast';

// Category mappings for display
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

const getCategoryLabel = (categoryValue) => {
  const category = EXPENSE_CATEGORIES.find(c => c.value === categoryValue);
  return category ? `${category.emoji} ${category.label}` : categoryValue;
};

const OCRScanner = ({ onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast({ type: 'error', message: 'Chỉ hỗ trợ file ảnh (.jpg, .png)' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: 'error', message: 'Kích thước file tối đa 5MB' });
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/process_receipt', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        // Handle non-JSON error responses
        const text = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: text || 'Không thể xử lý ảnh' };
        }
        throw new Error(errorData.error || errorData.message || 'Không thể xử lý ảnh');
      }
      
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'OCR processing failed');
      }

      setResult({
        text: data.text || '',
        amount: data.amount,
        date: data.date,
        fee: data.fee,
        note: data.note,
        merchant: data.merchant,
        invoice_number: data.invoice_number,
        suggested_category: data.suggested_category,
        method: data.method || 'ocr',
      });

      // Only pass to parent if we have valid amount
      if (data.amount && !isNaN(data.amount) && data.amount > 0) {
        const ocrData = {
          amount: data.amount,
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : null,
          fee: data.fee,
          note: data.note,
          merchant: data.merchant,
          invoice_number: data.invoice_number,
          suggested_category: data.suggested_category,
        };
        onSuccess?.(ocrData);
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      setError(error.message || 'Không thể xử lý ảnh');
      toast({ type: 'error', message: error.message || 'Không thể xử lý ảnh' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        id="ocr-scanner-input"
        onChange={handleFileChange}
        disabled={loading}
      />
      
      <label
        htmlFor="ocr-scanner-input"
        className={`block w-full py-3 px-4 bg-white border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-gray-700 font-medium">
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-blue-600" />
              <span>Chọn ảnh hóa đơn</span>
            </>
          )}
        </div>
      </label>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Lỗi</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            {error.includes('Tesseract OCR') && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Cài đặt Tesseract OCR:</p>
                <ul className="text-xs text-yellow-700 list-disc list-inside space-y-0.5">
                  <li>macOS: <code className="bg-yellow-100 px-1 rounded">brew install tesseract tesseract-lang</code></li>
                  <li>Linux: <code className="bg-yellow-100 px-1 rounded">sudo apt-get install tesseract-ocr tesseract-ocr-vie</code></li>
                  <li>Windows: Tải từ <a href="https://github.com/UB-Mannheim/tesseract/wiki" target="_blank" rel="noopener noreferrer" className="underline">GitHub</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 bg-white border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-green-800">Đã quét thành công</p>
          </div>
          
          {result.amount && (
            <p className="text-sm text-gray-700">
              Số tiền: <strong>{result.amount.toLocaleString('vi-VN')} đ</strong>
            </p>
          )}
          
          {result.date && (
            <p className="text-sm text-gray-700">
              Ngày: <strong>{new Date(result.date).toLocaleDateString('vi-VN')}</strong>
            </p>
          )}
          
          {result.fee && (
            <p className="text-sm text-gray-700">
              Phí/VAT: <strong>{result.fee.toLocaleString('vi-VN')} đ</strong>
            </p>
          )}
          
          {result.suggested_category && (
            <p className="text-sm text-gray-700">
              Danh mục đề xuất: <strong className="text-blue-600">🤖 {getCategoryLabel(result.suggested_category)}</strong>
            </p>
          )}
          
          {result.note && (
            <p className="text-sm text-gray-700">
              Ghi chú: <strong className="text-blue-600">{result.note}</strong>
            </p>
          )}
          
          {result.merchant && (
            <p className="text-sm text-gray-700">
              Cửa hàng: <strong>{result.merchant}</strong>
            </p>
          )}
          
          {result.invoice_number && (
            <p className="text-sm text-gray-700">
              Mã HĐ: <strong>{result.invoice_number}</strong>
            </p>
          )}
          
          {result.method && (
            <p className="text-xs text-gray-500 mt-1">
              Phương thức: {result.method === 'ai' ? '🤖 AI' : '📄 OCR'}
            </p>
          )}

          {result.text && (
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                Xem văn bản nhận dạng
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded-lg overflow-auto max-h-24 text-[10px] leading-relaxed whitespace-pre-wrap">
                {result.text}
              </pre>
            </details>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2 text-center">
        JPG, PNG • Tối đa 5MB
      </p>
    </div>
  );
};

export default OCRScanner;

