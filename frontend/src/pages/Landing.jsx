import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-blue-600">Money Keeper</div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-6">Quản lý chi tiêu thông minh</h1>
          <p className="text-xl mb-8">
            Theo dõi chi tiêu, lập ngân sách và đạt được mục tiêu tài chính một cách dễ dàng
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/register"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium text-lg"
            >
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-blue-600 text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Phân tích chi tiêu</h3>
            <p className="text-gray-600">
              Nhận báo cáo chi tiết và biểu đồ trực quan về thói quen chi tiêu của bạn
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-blue-600 text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">Trợ lý AI</h3>
            <p className="text-gray-600">
              AI thông minh giúp phân loại chi tiêu và đưa ra lời khuyên tài chính
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-blue-600 text-3xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Quản lý ngân sách</h3>
            <p className="text-gray-600">
              Đặt ngân sách và nhận thông báo khi chi tiêu vượt mức
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
