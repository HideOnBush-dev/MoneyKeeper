import { useEffect, useState } from 'react';
import { notificationsAPI } from '../services/api';
import { Bell } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ page: p, per_page: 10 });
      setItems(data?.notifications || []);
      setPages(data?.pagination?.pages || 1);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      // update local state
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <PageHeader icon={Bell} title="Thông báo" iconColor="from-yellow-500 to-amber-600" />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Không có thông báo nào.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li key={n.id} className="p-3 flex items-start gap-2">
                <div className={`mt-1 w-2 h-2 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                  >
                    Đã đọc
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => fetchData(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 text-sm font-medium border border-gray-200"
            >
              Trước
            </button>
            <span className="text-xs text-gray-600 font-medium">
              {page} / {pages}
            </span>
            <button
              onClick={() => fetchData(Math.min(pages, page + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 text-sm font-medium border border-gray-200"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
