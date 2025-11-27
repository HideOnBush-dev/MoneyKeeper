import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, Wallet, BarChart2, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

const Landing = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white to-blue-50">
      <SEO
        title="Quản lý chi tiêu thông minh với AI"
        description="Theo dõi chi tiêu, lập ngân sách, phân tích xu hướng và nhận gợi ý từ AI để đạt mục tiêu tài chính nhanh hơn."
        image="/app-icon.png"
      />
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-24 w-[28rem] h-[28rem] bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40rem] bg-gradient-to-t from-blue-100/60 to-transparent blur-3xl" />
        {/* Subtle grid */}
        <svg className="absolute inset-0 opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 px-4 py-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Money Keeper
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-6 text-gray-700">
              <a href="#features" className="hover:text-blue-700 transition-colors">Tính năng</a>
              <a href="#ai" className="hover:text-blue-700 transition-colors">AI</a>
              <a href="#pricing" className="hover:text-blue-700 transition-colors">Giá</a>
              <a href="#faq" className="hover:text-blue-700 transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center space-x-3">
              <Link to="/login" className="px-4 py-2 rounded-xl font-semibold text-gray-700 hover:text-blue-700">
                Đăng nhập
              </Link>
              <Link to="/register" className="px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow hover:shadow-lg">
                Bắt đầu
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-24 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 px-3 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-4"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">Quản lý tài chính thông minh</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent"
            >
              Theo dõi, phân tích, tối ưu chi tiêu của bạn.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 text-lg md:text-xl text-gray-600"
            >
              Money Keeper giúp bạn lập ngân sách, phân tích xu hướng và nhận gợi ý từ AI để đạt mục tiêu tài chính nhanh hơn.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/register"
                className="group inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl"
              >
                <span>Bắt đầu miễn phí</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold border border-gray-300 text-gray-700 hover:bg-white"
              >
                <span>Dùng thử ngay</span>
              </Link>
            </motion.div>

            {/* Hero stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Người dùng', value: '10K+' },
                { label: 'Giao dịch theo dõi', value: '5M+' },
                { label: 'Độ hài lòng', value: '98%' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="rounded-2xl bg-white/70 backdrop-blur border border-white/60 py-4 shadow"
                >
                  <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                  <div className="text-xs font-semibold text-gray-500">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mock preview card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-[2rem] blur-2xl opacity-60" />
            <div className="relative rounded-[2rem] bg-white border border-gray-100 shadow-2xl overflow-hidden">
              <div className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-gray-100 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-xl bg-blue-600 text-white">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-gray-800">Xu hướng thu chi</div>
                  </div>
                  <div className="h-32 rounded-xl bg-white border border-gray-100" />
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-gray-100 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-gray-800">Trợ lý AI</div>
                  </div>
                  <div className="space-y-2">
                    {['/add amount: 120k category: food', 'Gợi ý giảm chi 15% tháng này', 'Nhắc ngân sách sắp chạm 80%'].map((t, idx) => (
                      <div key={idx} className="px-3 py-2 rounded-lg bg-white border border-gray-100 text-sm text-gray-700">{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Vì sao chọn Money Keeper?</h2>
          <p className="mt-3 text-gray-600">Được xây dựng để đơn giản nhưng mạnh mẽ, thân thiện và bảo mật.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Wallet, title: 'Quản lý ví linh hoạt', desc: 'Nhiều ví, chuyển tiền, theo dõi số dư theo thời gian.' },
            { icon: BarChart2, title: 'Báo cáo trực quan', desc: 'Xu hướng theo ngày/tuần/tháng và phân bổ danh mục.' },
            { icon: Zap, title: 'Hiệu năng mượt mà', desc: 'Tối ưu UI/UX, phản hồi nhanh, tối ưu cho di động.' },
            { icon: ShieldCheck, title: 'Bảo mật và riêng tư', desc: 'Xác thực, rate limit, và tuân thủ bảo vệ dữ liệu.' },
            { icon: MessageSquare, title: 'Trợ lý AI thông minh', desc: 'Nhập liệu nhanh, gợi ý và cảnh báo bất thường.' },
            { icon: CheckCircle2, title: 'Cảnh báo ngân sách', desc: 'Thông báo khi gần/vượt hạn mức theo ngưỡng.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white border border-gray-100 p-6 shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white inline-block shadow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900">Khách hàng nói gì</h2>
          <p className="mt-2 text-gray-600">Họ đã tối ưu chi tiêu và đạt mục tiêu tài chính.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Minh Anh', text: 'Giao diện đẹp, dễ dùng. Mình kiểm soát chi tiêu tốt hơn hẳn!' },
            { name: 'Huy Hoàng', text: 'Tính năng AI gợi ý cực hữu ích, nhập liệu nhanh chóng.' },
            { name: 'Thu Trang', text: 'Ngân sách và cảnh báo giúp mình không vượt hạn mức.' },
          ].map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white border border-gray-100 p-6 shadow"
            >
              <div className="text-gray-700">{t.text}</div>
              <div className="mt-4 font-semibold text-gray-900">{t.name}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-extrabold">Sẵn sàng kiểm soát tài chính của bạn?</h3>
            <p className="mt-2 text-white/90 md:text-lg">Đăng ký miễn phí và bắt đầu ngay hôm nay.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/register" className="px-6 py-3 rounded-xl font-bold bg-white text-blue-700 hover:shadow-lg">
                Tạo tài khoản
              </Link>
              <Link to="/login" className="px-6 py-3 rounded-xl font-bold border border-white/40 text-white hover:bg-white/10">
                Tôi đã có tài khoản
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
