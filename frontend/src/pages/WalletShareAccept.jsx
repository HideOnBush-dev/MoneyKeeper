import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { walletAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const WalletShareAccept = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [walletName, setWalletName] = useState('');

    useEffect(() => {
        const acceptShare = async () => {
            // Wait for auth to load
            if (authLoading) return;

            // If not logged in, redirect to login with return url
            if (!user) {
                const currentUrl = `/wallets/share?${searchParams.toString()}`;
                navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
                return;
            }

            const token = searchParams.get('token');
            const walletId = searchParams.get('wallet_id');

            if (!token || !walletId) {
                setStatus('error');
                setMessage('Liên kết chia sẻ không hợp lệ. Thiếu thông tin token hoặc wallet ID.');
                return;
            }

            try {
                setStatus('loading');
                setMessage('Đang xử lý chia sẻ ví...');

                const response = await walletAPI.acceptShare({
                    token: token,
                    wallet_id: walletId,
                    can_edit: true
                });

                setStatus('success');
                setWalletName(response.data.wallet?.name || 'Ví được chia sẻ');
                setMessage(`Đã chấp nhận chia sẻ ví "${response.data.wallet?.name}" thành công!`);

                // Redirect to wallets page after 2 seconds
                setTimeout(() => {
                    navigate('/wallets');
                }, 2000);
            } catch (error) {
                console.error('Error accepting share:', error);
                setStatus('error');

                const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Lỗi khi chấp nhận chia sẻ ví';
                setMessage(errorMsg);

                // For expired or invalid tokens, redirect to wallets after showing error
                setTimeout(() => {
                    navigate('/wallets');
                }, 3000);
            }
        };

        acceptShare();
    }, [searchParams, navigate, user, authLoading]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-slate-700">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        {status === 'loading' && (
                            <div className="p-6 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full">
                                <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="p-6 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full">
                                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
                        {status === 'loading' && 'Đang xử lý...'}
                        {status === 'success' && 'Thành công!'}
                        {status === 'error' && 'Có lỗi xảy ra'}
                    </h2>

                    {/* Message */}
                    <div className={`p-4 rounded-xl mb-6 ${status === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                            status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                                'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                        <div className="flex items-start gap-3">
                            {status === 'loading' && <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />}
                            {status === 'success' && <Wallet className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />}
                            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />}
                            <p className={`text-sm ${status === 'loading' ? 'text-blue-800 dark:text-blue-300' :
                                    status === 'success' ? 'text-green-800 dark:text-green-300' :
                                        'text-red-800 dark:text-red-300'
                                }`}>
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Wallet Name (only show on success) */}
                    {status === 'success' && walletName && (
                        <div className="text-center mb-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tên ví</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{walletName}</p>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="text-center">
                        {status === 'loading' ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Vui lòng đợi...</p>
                        ) : (
                            <button
                                onClick={() => navigate('/wallets')}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                Đi đến trang Ví
                            </button>
                        )}
                    </div>
                </div>

                {/* Additional Info */}
                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {status === 'success' && 'Đang chuyển hướng...'}
                        {status === 'error' && 'Tự động chuyển về trang Ví sau 3 giây...'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WalletShareAccept;
