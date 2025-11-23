import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

const ErrorPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const errorMessage = searchParams.get('message') || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    const errorCode = searchParams.get('code') || '';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
                    {/* Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                    </div>

                    {/* Error Code */}
                    {errorCode && (
                        <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-2">
                            Mã lỗi: {errorCode}
                        </p>
                    )}

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Có lỗi xảy ra
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        {errorMessage}
                    </p>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            <RefreshCw className="h-5 w-5" />
                            Tải lại trang
                        </button>

                        <button
                            onClick={() => navigate(-1)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Quay lại
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>

                {/* Additional Info */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ hỗ trợ
                </p>
            </div>
        </div>
    );
};

export default ErrorPage;
