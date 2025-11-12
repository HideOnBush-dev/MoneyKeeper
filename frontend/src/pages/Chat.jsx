import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Bot, User, Settings, Sparkles, Heart, Zap, Brain, 
  Trash2, TrendingUp, PieChart, Lightbulb, Copy, Check, 
  Download, MessageSquare, Plus, ChevronLeft, Menu, X,
  Mic, MicOff, Clock, Star, BarChart3, Maximize2, Paperclip, Smile
} from "lucide-react";
import { chatSocket } from "../services/socket";
import { chatAPI, expenseAPI, budgetAPI, walletAPI } from "../services/api";
import MarkdownRenderer from "../components/MarkdownRenderer";

const PERSONALITIES = [
  { id: "friendly", name: "Thân thiện", icon: Heart, color: "from-pink-500 to-rose-500", accent: "bg-pink-100 text-pink-600" },
  { id: "professional", name: "Chuyên nghiệp", icon: Brain, color: "from-blue-500 to-indigo-500", accent: "bg-blue-100 text-blue-600" },
  { id: "motivational", name: "Động viên", icon: Zap, color: "from-amber-500 to-orange-500", accent: "bg-amber-100 text-amber-600" },
  { id: "casual", name: "Thoải mái", icon: Sparkles, color: "from-purple-500 to-pink-500", accent: "bg-purple-100 text-purple-600" },
];

const QUICK_ACTIONS = [
  { icon: TrendingUp, text: "/spending month=THIS", label: "Phân tích chi tiêu tháng này", color: "from-blue-500 to-cyan-500", emoji: "📊" },
  { icon: PieChart, text: "/balance", label: "Tổng quan tài chính của tôi", color: "from-purple-500 to-pink-500", emoji: "💰" },
  { icon: Lightbulb, text: "/efficiency month=THIS", label: "Đánh giá hiệu quả ngân sách", color: "from-amber-500 to-orange-500", emoji: "🧮" },
  { icon: Sparkles, text: "/budget month=THIS category=\"Ăn uống\" limit=3000000", label: "Lên kế hoạch ngân sách", color: "from-green-500 to-emerald-500", emoji: "✨" },
  { icon: BarChart3, text: "/trends months=6", label: "Xu hướng thu - chi 6 tháng", color: "from-indigo-500 to-purple-500", emoji: "📈" },
  { icon: Star, text: "/allocation month=THIS", label: "Phân bổ chi tiêu", color: "from-rose-500 to-pink-500", emoji: "🧩" },
];

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [personality, setPersonality] = useState("friendly");
  const [showPersonality, setShowPersonality] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    const socket = chatSocket.connect();

    socket.on('connect', () => {
      setConnected(true);
      // Send initial greeting message
      setMessages([{ 
        role: "ai", 
        text: "Xin chào! Mình là MoneyKeeper AI, trợ lý tài chính của bạn! 🤗 Bạn muốn mình giúp gì hôm nay?",
        timestamp: new Date()
      }]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('message', (data) => {
      console.log('User message received:', data);
    });

    socket.on('response', (data) => {
      if (data.done) {
        setMessages((prev) => [...prev, { 
          role: "ai", 
          text: data.data,
          timestamp: new Date()
        }]);
        setStreamingMessage("");
        setLoading(false);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setMessages((prev) => [...prev, { 
        role: "ai", 
        text: error.data || "Đã xảy ra lỗi khi xử lý tin nhắn.",
        timestamp: new Date(),
        isError: true
      }]);
      setLoading(false);
    });

    return () => {
      chatSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingMessage]);

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chatConversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading conversations:', e);
      }
    }
  }, []);

  const sendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || !connected || loading) return;

    // Handle slash commands locally
    if (messageToSend.startsWith('/')) {
      setInput("");
      if (await handleSlashCommand(messageToSend)) {
        return;
      }
    }

    if (!customMessage) {
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    
    // Add user message to UI
    setMessages((prev) => [...prev, { 
      role: "user", 
      text: messageToSend,
      attachments: attachments?.length ? attachments : undefined,
      timestamp: new Date()
    }]);
    if (attachments?.length) setAttachments([]);
    
    setLoading(true);
    
    try {
      // Send message via socket
      chatSocket.sendMessage(messageToSend, personality);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [...prev, { 
        role: "ai", 
        text: "Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.",
        timestamp: new Date(),
        isError: true
      }]);
      setLoading(false);
    }
  };

  const handleQuickAction = (text) => {
    sendMessage(text);
  };

  // Slash commands
  const SLASH_COMMANDS = [
    { cmd: '/help', desc: 'Hiển thị trợ giúp lệnh' },
    { cmd: '/add', desc: 'Thêm giao dịch. Ví dụ: /add amount=120000 category="Ăn uống" note="Bữa trưa" date=2025-11-12 wallet="Ví chính"' },
    { cmd: '/edit', desc: 'Sửa giao dịch. Ví dụ: /edit id=123 amount=150000 note="điều chỉnh"' },
    { cmd: '/budget', desc: 'Tạo ngân sách. Ví dụ: /budget month=2025-11 category="Ăn uống" limit=3000000' },
    { cmd: '/goal', desc: 'Tạo mục tiêu. Ví dụ: /goal name="Quỹ du lịch" target=20000000 due=2026-06-01' },
    { cmd: '/balance', desc: 'Xem tổng số dư các ví' },
    { cmd: '/spending', desc: 'Thống kê chi tiêu. Ví dụ: /spending month=2025-11' },
    { cmd: '/alerts', desc: 'Xem cảnh báo ngân sách' },
    { cmd: '/remember', desc: 'Ghi nhớ key/value. Ví dụ: /remember key="thành phố" value="Đà Nẵng"' },
    { cmd: '/recall', desc: 'Truy xuất. Ví dụ: /recall key="thành phố"' },
    { cmd: '/trends', desc: 'Xu hướng thu - chi. Ví dụ: /trends months=6' },
    { cmd: '/allocation', desc: 'Phân bổ chi tiêu. Ví dụ: /allocation month=2025-11' },
    { cmd: '/efficiency', desc: 'Hiệu quả ngân sách. Ví dụ: /efficiency month=2025-11' },
  ];

  const addSystemMessage = (text, sources = null) => {
    setMessages((prev) => [...prev, {
      role: "ai",
      text,
      timestamp: new Date(),
      sources
    }]);
  };

  const parseArgs = (str) => {
    const args = {};
    const regex = /(\w+)=("([^"]+)"|'([^']+)'|[^\s]+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const key = match[1];
      const raw = match[3] || match[4] || match[2];
      args[key] = String(raw).replace(/^["']|["']$/g, '');
    }
    return args;
  };

  const numberOr = (v, def = null) => {
    const n = Number(String(v ?? '').replace(/[, ]/g, ''));
    return isNaN(n) ? def : n;
  };

  const resolveWalletIdByName = async (name) => {
    try {
      const { data } = await walletAPI.getAll();
      const list = data?.wallets || data || [];
      const found = list.find(w => w.name?.toLowerCase() === String(name || '').toLowerCase());
      return found?.id || null;
    } catch {
      return null;
    }
  };

  const memoryKey = 'chatLongTermMemory';
  const loadMemory = () => {
    try { return JSON.parse(localStorage.getItem(memoryKey) || '{}'); } catch { return {}; }
  };
  const saveMemory = (mem) => {
    localStorage.setItem(memoryKey, JSON.stringify(mem));
  };

  const handleSlashCommand = async (raw) => {
    const [command] = raw.trim().split(/\s+/);
    const argStr = raw.slice(command.length).trim();
    const args = parseArgs(argStr);

    try {
      switch (command) {
        case '/help': {
          const help = SLASH_COMMANDS.map(c => `${c.cmd} — ${c.desc}`).join('\n');
          addSystemMessage(`Các lệnh hỗ trợ:\n${help}`);
          return true;
        }
        case '/add': {
          const payload = {
            amount: numberOr(args.amount, 0),
            category: args.category,
            note: args.note,
            date: args.date || new Date().toISOString().slice(0,10),
            wallet_id: args.wallet_id || null,
          };
          if (!payload.wallet_id && args.wallet) {
            payload.wallet_id = await resolveWalletIdByName(args.wallet);
          }
          await expenseAPI.create(payload);
          addSystemMessage(`Đã thêm giao dịch ${Intl.NumberFormat('vi-VN').format(payload.amount)} ₫ cho "${payload.category}" (${payload.note || 'không ghi chú'}).`, [
            { label: 'Xem chi tiêu', route: '/expenses' }
          ]);
          return true;
        }
        case '/edit': {
          const id = args.id;
          if (!id) throw new Error('Thiếu id');
          const update = { ...args };
          delete update.id;
          if (update.amount) update.amount = numberOr(update.amount, null);
          await expenseAPI.update(id, update);
          addSystemMessage(`Đã cập nhật giao dịch #${id}.`, [
            { label: 'Xem chi tiêu', route: '/expenses' }
          ]);
          return true;
        }
        case '/budget': {
          const payload = {
            month: args.month,
            category: args.category,
            limit: numberOr(args.limit, 0),
          };
          await budgetAPI.create(payload);
          addSystemMessage(`Đã tạo ngân sách cho ${payload.category} tháng ${payload.month} với hạn mức ${Intl.NumberFormat('vi-VN').format(payload.limit)} ₫.`, [
            { label: 'Xem ngân sách', route: '/budgets' }
          ]);
          return true;
        }
        case '/goal': {
          const text = `Đã ghi nhận mục tiêu "${args.name}" mục tiêu ${Intl.NumberFormat('vi-VN').format(numberOr(args.target, 0))} ₫ trước ${args.due || '—'}.`;
          addSystemMessage(text, [{ label: 'Xem ngân sách', route: '/budgets' }]);
          return true;
        }
        case '/balance': {
          const { data } = await walletAPI.getAll();
          const wallets = data?.wallets || data || [];
          const total = wallets.reduce((s, w) => s + (w.balance || 0), 0);
          const lines = wallets.map(w => `• ${w.name}: ${Intl.NumberFormat('vi-VN').format(w.balance || 0)} ₫`).join('\n');
          addSystemMessage(`Số dư ví:\n${lines}\n\nTổng: ${Intl.NumberFormat('vi-VN').format(total)} ₫`, [
            { label: 'Xem ví', route: '/wallets' }
          ]);
          return true;
        }
        case '/spending': {
          const { data } = await expenseAPI.getStatistics({ period: 'month', month: args.month });
          const categories = data?.by_category || data?.categories || [];
          const lines = categories.map(c => `• ${c.category}: ${Intl.NumberFormat('vi-VN').format(c.amount)} ₫`).join('\n');
          addSystemMessage(`Thống kê chi tiêu ${args.month || 'tháng này'}:\n${lines}`, [
            { label: 'Báo cáo chi tiêu', route: '/expenses' }
          ]);
          return true;
        }
        case '/alerts': {
          const { data } = await budgetAPI.getAlerts();
          const items = data?.alerts || data || [];
          if (!items.length) {
            addSystemMessage('Hiện chưa có cảnh báo ngân sách.');
          } else {
            const lines = items.map(a => `• ${a.category}: đã dùng ${Math.round(a.percentage)}% (${Intl.NumberFormat('vi-VN').format(a.spent)} / ${Intl.NumberFormat('vi-VN').format(a.limit)} ₫)`).join('\n');
            addSystemMessage(`Cảnh báo ngân sách:\n${lines}`, [{ label: 'Xem ngân sách', route: '/budgets' }]);
          }
          return true;
        }
        case '/trends': {
          const months = Number(args.months || 6);
          const { data } = await expenseAPI.getTrends({ months });
          const rows = data?.rows || data || [];
          if (!rows.length) {
            addSystemMessage('Chưa có dữ liệu xu hướng.');
            return true;
          }
          const lines = rows.map(r => `- ${r.month}: thu ${Intl.NumberFormat('vi-VN').format(Math.abs(r.income || 0))} ₫ • chi ${Intl.NumberFormat('vi-VN').format(Math.abs(r.expenses || 0))} ₫`).join('\n');
          addSystemMessage(`**Xu hướng thu - chi ${months} tháng gần đây**\n\n${lines}`);
          return true;
        }
        case '/allocation': {
          const month = args.month || 'THIS';
          const params = month === 'THIS' ? {} : { month };
          const { data } = await expenseAPI.getStatistics({ period: 'month', ...params });
          const categories = data?.by_category || data?.categories || [];
          if (!categories.length) {
            addSystemMessage('Chưa có dữ liệu phân bổ chi tiêu.');
            return true;
          }
          const total = categories.reduce((s, c) => s + (c.amount || 0), 0);
          const lines = categories.map(c => {
            const pct = total > 0 ? Math.round((c.amount || 0) * 100 / total) : 0;
            return `- ${c.category}: ${Intl.NumberFormat('vi-VN').format(c.amount)} ₫ (${pct}%)`;
          }).join('\n');
          addSystemMessage(`**Phân bổ chi tiêu** ${month === 'THIS' ? 'tháng này' : month}\n\n${lines}\n\nTổng: ${Intl.NumberFormat('vi-VN').format(total)} ₫`);
          return true;
        }
        case '/efficiency': {
          const month = args.month || 'THIS';
          const now = new Date();
          const m = month === 'THIS' ? String(now.getMonth() + 1).padStart(2, '0') : month.split('-')[1];
          const y = month === 'THIS' ? now.getFullYear() : Number(month.split('-')[0]);
          const { data } = await budgetAPI.getCurrent({ month: m, year: y });
          const budgets = data?.budgets || data || [];
          if (!budgets.length) {
            addSystemMessage('Bạn chưa có ngân sách cho tháng này.');
            return true;
          }
          const lines = budgets.map(b => `- ${b.category}: ${Intl.NumberFormat('vi-VN').format(b.spent || 0)} / ${Intl.NumberFormat('vi-VN').format(b.amount || 0)} ₫ (${Math.round(b.percentage || 0)}%) — ${b.status === 'exceeded' ? '⚠️ vượt' : '✅ ổn'}`).join('\n');
          addSystemMessage(`**Hiệu quả ngân sách tháng ${m}-${y}**\n\n${lines}`, [{ label: 'Xem ngân sách', route: '/budgets' }]);
          return true;
        }
        case '/remember': {
          const mem = loadMemory();
          if (!args.key) throw new Error('Thiếu key');
          mem[args.key] = args.value || '';
          saveMemory(mem);
          addSystemMessage(`Đã ghi nhớ "${args.key}".`);
          return true;
        }
        case '/recall': {
          const mem = loadMemory();
          const val = mem[args.key];
          addSystemMessage(val ? `Bạn đã lưu "${args.key}": ${val}` : `Không tìm thấy "${args.key}" trong bộ nhớ.`);
          return true;
        }
        default:
          return false;
      }
    } catch (e) {
      console.error('Slash command error:', e);
      addSystemMessage(`Không thực hiện được lệnh: ${e?.message || 'Lỗi không xác định'}`);
      return true;
    }
  };

  const clearChat = async () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      try {
        await chatAPI.clearHistory();
        setMessages([{ 
          role: "ai", 
          text: "Lịch sử chat đã được xóa. Hãy bắt đầu cuộc trò chuyện mới! 🤗",
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
  };

  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString('vi-VN')}\n${msg.text}\n`
    ).join('\n---\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveConversation = () => {
    if (messages.length <= 1) return;
    
    const title = messages.find(m => m.role === 'user')?.text?.slice(0, 50) || 'Cuộc trò chuyện mới';
    const newConv = {
      id: Date.now(),
      title,
      messages: [...messages],
      timestamp: new Date(),
      personality
    };
    
    const updatedConversations = [newConv, ...conversations];
    setConversations(updatedConversations);
    localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
  };

  const loadConversation = (conv) => {
    setMessages(conv.messages);
    setPersonality(conv.personality);
    setCurrentConversation(conv.id);
    setShowSidebar(false);
  };

  const deleteConversation = (id) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
    if (currentConversation === id) {
      setCurrentConversation(null);
    }
  };

  const startNewChat = () => {
    setMessages([{ 
      role: "ai", 
      text: "Xin chào! Mình là MoneyKeeper AI, trợ lý tài chính của bạn! 🤗 Bạn muốn mình giúp gì hôm nay?",
      timestamp: new Date()
    }]);
    setCurrentConversation(null);
    setShowSidebar(false);
  };

  const selectedPersonality = PERSONALITIES.find(p => p.id === personality);

  // Sidebar content reused for desktop and mobile
  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-200/50 bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Lịch sử chat
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSidebar(false)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
          >
            <X className="h-5 w-5 text-gray-600" />
          </motion.button>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-5 w-5" />
          Cuộc trò chuyện mới
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Chưa có cuộc trò chuyện nào</p>
            <p className="text-xs mt-1">Bắt đầu chat để lưu lịch sử</p>
          </div>
        ) : (
          conversations.map((conv, idx) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                currentConversation === conv.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md'
              }`}
              onClick={() => loadConversation(conv)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2 mb-1.5">
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(conv.timestamp).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    currentConversation === conv.id
                      ? 'hover:bg-white/20 text-white'
                      : 'hover:bg-red-50 text-red-500'
                  } opacity-0 group-hover:opacity-100`}
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {messages.length > 1 && (
        <div className="p-4 border-t border-gray-200/50 bg-gradient-to-br from-white to-blue-50/30 space-y-2">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download className="h-4 w-4" />
            Lưu cuộc trò chuyện
          </motion.button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -my-10 h-[calc(100vh-4rem)] flex overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none hidden md:block">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-cyan-400/15 to-indigo-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-20 right-0 w-80 h-80 bg-gradient-to-br from-purple-400/20 via-pink-400/15 to-rose-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-br from-indigo-400/15 via-blue-400/15 to-cyan-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl z-50 flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Persistent Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 bg-white/90 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl z-20">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-lg z-30 flex-shrink-0"
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full p-4">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg transition-all lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </motion.button>

              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  MoneyKeeper AI
                </h1>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2 h-2 bg-gray-400 rounded-full" />
                      Đang kết nối...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportChat}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all"
                    title="Xuất file"
                  >
                    <Download className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearChat}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-md hover:shadow-lg transition-all"
                    title="Xóa chat"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </>
              )}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPersonality(!showPersonality)}
                className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg transition-all"
                title="Cài đặt"
              >
                <Settings className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Personality Selector */}
          <AnimatePresence>
            {showPersonality && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-gray-200/50 bg-gradient-to-br from-white to-purple-50/30"
              >
                <div className="max-w-5xl mx-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Chọn phong cách trò chuyện
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPersonality(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded-lg hover:bg-gray-100"
                    >
                      Đóng ✕
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {PERSONALITIES.map((p, idx) => {
                      const Icon = p.icon;
                      const isSelected = personality === p.id;
                      return (
                        <motion.button
                          key={p.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setPersonality(p.id);
                            setShowPersonality(false);
                          }}
                          className={`relative overflow-hidden flex flex-col items-center gap-3 p-4 rounded-2xl transition-all ${
                            isSelected
                              ? `bg-gradient-to-br ${p.color} text-white shadow-xl border-2 border-white`
                              : 'bg-white text-gray-700 hover:shadow-lg border-2 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="selected-personality"
                              className="absolute inset-0 bg-white/10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          
                          <motion.div 
                            animate={isSelected ? { rotate: [0, 10, -10, 0] } : {}}
                            transition={{ duration: 0.5 }}
                            className={`p-3 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}
                          >
                            <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                          </motion.div>
                          
                          <div className="text-center">
                            <span className="font-bold text-sm block mb-1">{p.name}</span>
                            {isSelected && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-xs opacity-90"
                              >
                                ✓ Đã chọn
                              </motion.span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-2 md:px-4 md:py-4 space-y-4 max-w-4xl mx-auto w-full">
          {messages.length === 1 && messages[0].role === "ai" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-6 py-6 md:py-8"
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="inline-block"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-30"></div>
                    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-2xl">
                      <Sparkles className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </motion.div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Chào mừng! 👋
                  </h2>
                  <p className="text-gray-600 text-lg max-w-2xl px-4 leading-relaxed">
                    Tôi là <span className="font-bold text-blue-600">MoneyKeeper AI</span>, trợ lý tài chính thông minh của bạn. 
                    Hãy để tôi giúp bạn quản lý tài chính hiệu quả hơn!
                  </p>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Gợi ý cho bạn
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: idx * 0.1,
                          type: "spring",
                          stiffness: 200
                        }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleQuickAction(action.text)}
                        disabled={!connected || loading}
                        className="group relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-white shadow-md hover:shadow-xl border-2 border-gray-100 hover:border-transparent transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                        />
                        
                        <motion.div 
                          className={`relative p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}
                          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </motion.div>
                        
                        <div className="flex-1 relative z-10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{action.emoji}</span>
                            <span className="text-sm font-bold text-gray-800 group-hover:text-white transition-colors">
                              {action.text}
                            </span>
                          </div>
                        </div>
                        
                        <motion.div
                          className="relative z-10"
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Send className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                        </motion.div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => {
            if (idx === 0 && msg.role === "ai" && messages.length === 1) return null;

            const prev = idx > 0 ? messages[idx - 1] : null;
            const next = idx < messages.length - 1 ? messages[idx + 1] : null;

            const isSameDay = (a, b) => {
              if (!a || !b) return false;
              const da = new Date(a);
              const db = new Date(b);
              return da.getFullYear() === db.getFullYear() &&
                da.getMonth() === db.getMonth() &&
                da.getDate() === db.getDate();
            };

            const isGroupedWithPrev = !!prev &&
              prev.role === msg.role &&
              Math.abs(new Date(msg.timestamp) - new Date(prev.timestamp)) < 1000 * 60 * 3; // within 3 minutes

            const isLastInGroup = !next ||
              next.role !== msg.role ||
              Math.abs(new Date(next.timestamp) - new Date(msg.timestamp)) >= 1000 * 60 * 3;

            const showDaySeparator = !prev || !isSameDay(prev?.timestamp, msg?.timestamp);

            return (
              <div key={idx}>
                {showDaySeparator && msg.timestamp && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <span className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
                      {new Date(msg.timestamp).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${isGroupedWithPrev ? "mt-0.5" : "mt-1.5"}`}
                >
                  <div
                    className={`flex items-start gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {isGroupedWithPrev ? (
                      <div className="w-10" />
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.05, 0.3) + 0.1, type: "spring" }}
                        className={`rounded-2xl p-2.5 flex-shrink-0 shadow-md ${
                          msg.role === "ai" 
                            ? "bg-gradient-to-br from-blue-500 to-indigo-500" 
                            : "bg-gradient-to-br from-gray-700 to-gray-800"
                        }`}
                      >
                        {msg.role === "ai" ? (
                          <Bot className="h-5 w-5 text-white" />
                        ) : (
                          <User className="h-5 w-5 text-white" />
                        )}
                      </motion.div>
                    )}
                    
                    <div className="flex flex-col gap-1.5 flex-1">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`relative px-4 py-3 rounded-2xl shadow-lg ${
                          msg.isError
                            ? "bg-gradient-to-br from-red-50 to-rose-50 text-red-800 border-2 border-red-200"
                            : msg.role === "ai"
                            ? "bg-white text-gray-800 border-2 border-gray-100"
                            : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                        }`}
                        style={{
                          borderTopLeftRadius: msg.role === "ai" && isGroupedWithPrev ? "0.375rem" : undefined,
                          borderTopRightRadius: msg.role === "user" && isGroupedWithPrev ? "0.375rem" : undefined,
                          borderBottomLeftRadius: msg.role === "ai" ? "0.5rem" : undefined,
                          borderBottomRightRadius: msg.role === "user" ? "0.5rem" : undefined,
                        }}
                      >
                        {msg.role === "ai" ? (
                          <MarkdownRenderer text={msg.text} className="break-words text-sm leading-relaxed" />
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                            {msg.text}
                          </p>
                        )}
                        
                        {msg.attachments?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((f, i) => (
                              <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                                {f.name} ({Math.round(f.size/1024)} KB)
                              </span>
                            ))}
                          </div>
                        ) : null}
                        
                        {msg.role === "ai" && !msg.isError && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1, scale: 1.1 }}
                            onClick={() => copyMessage(msg.text, idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
                            title="Sao chép"
                          >
                            {copiedIndex === idx ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-600" />
                            )}
                          </motion.button>
                        )}

                        {msg.sources?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.sources.map((s, i) => (
                              <a key={i} href={s.href || s.route || '#'} onClick={(e) => { if (!s.href) e.preventDefault(); }} className="text-[11px] px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                                {s.label || 'Nguồn'}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                      
                      {msg.timestamp && isLastInGroup && (
                        <span className={`text-xs text-gray-400 px-2 flex items-center gap-1 ${msg.role === "user" ? "justify-end" : ""}`}>
                          <Clock className="h-3 w-3" />
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
          
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-3 max-w-[85%]">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="rounded-2xl p-2.5 flex-shrink-0 shadow-md bg-gradient-to-br from-blue-500 to-indigo-500"
                >
                  <Bot className="h-5 w-5 text-white" />
                </motion.div>
                
                <div className="px-5 py-3 rounded-2xl shadow-lg bg-white border-2 border-gray-100 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <motion.span
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2.5 h-2.5 bg-blue-500 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-2.5 h-2.5 bg-indigo-500 rounded-full"
                    />
                    <motion.span
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-2.5 h-2.5 bg-purple-500 rounded-full"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Đang suy nghĩ...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar - Clean & Simple */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto w-full p-3 md:p-4">
            <form
              className="relative"
              onSubmit={e => {
                e.preventDefault();
                sendMessage();
              }}
            >
              {/* Simple input container */}
              <div className="flex items-end gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                {/* Left actions */}
                <div className="hidden md:flex items-center gap-1.5 pl-1">
                  <button
                    type="button"
                    disabled={loading || !connected}
                    className={`p-2 rounded-lg transition-colors ${
                      loading || !connected ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    title="Đính kèm"
                    onClick={() => document.getElementById('chat-file-input')?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    id="chat-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setAttachments(files.map(f => ({ name: f.name, size: f.size, type: f.type })));
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={loading || !connected}
                    className={`p-2 rounded-lg transition-colors ${
                      loading || !connected ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    title="Biểu tượng cảm xúc (chưa hỗ trợ)"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>

                {/* Textarea */}
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="w-full bg-transparent outline-none text-sm md:text-base px-2 py-2 resize-none max-h-32 overflow-y-auto text-gray-900 placeholder:text-gray-400"
                    placeholder="Nhập tin nhắn của bạn..."
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={loading || !connected}
                    style={{ minHeight: '24px' }}
                  />
                </div>

                {/* Mic */}
                <button
                  type="button"
                  disabled={!connected}
                  onClick={() => {
                    try {
                      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                      if (!SR) {
                        alert('Trình duyệt chưa hỗ trợ thu âm/nói-to-văn-bản.');
                        return;
                      }
                      if (recording) {
                        recognitionRef.current && recognitionRef.current.stop();
                        setRecording(false);
                        return;
                      }
                      const rec = new SR();
                      recognitionRef.current = rec;
                      rec.lang = 'vi-VN';
                      rec.interimResults = true;
                      rec.onresult = (ev) => {
                        let transcript = '';
                        for (let i = ev.resultIndex; i < ev.results.length; i++) {
                          transcript += ev.results[i][0].transcript;
                        }
                        setInput(transcript);
                      };
                      rec.onend = () => setRecording(false);
                      setRecording(true);
                      rec.start();
                    } catch (err) {
                      console.error(err);
                      setRecording(false);
                    }
                  }}
                  className={`flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all ${recording ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  title="Thu âm (chuyển giọng nói thành văn bản)"
                >
                  {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                {/* Send button - Minimal */}
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !connected}
                  className={`flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all ${
                    loading || !input.trim() || !connected
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="mt-1 text-[11px] text-gray-400 text-center">
                Nhấn Enter để gửi • Shift+Enter để xuống dòng
              </div>

              {/* Connection warning */}
              {!connected && (
                <div className="flex items-center justify-center gap-2 mt-2 text-xs text-amber-600">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span>Đang kết nối...</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
