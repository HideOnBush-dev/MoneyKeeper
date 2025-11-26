import { io } from 'socket.io-client';

class ChatSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket && this.connected) {
      return this.socket;
    }

    const isDev = import.meta.env.DEV;
    const { protocol, hostname, origin } = window.location || { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:3000' };
    const defaultDevUrl = `${protocol}//${hostname}:8000`;
    const baseUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      (isDev ? defaultDevUrl : origin);
    const namespace = '/chat';
    const socketUrl = isDev ? namespace : `${baseUrl.replace(/\/$/, '')}${namespace}`;

    console.log('🔌 Connecting to socket:', socketUrl, '(Dev mode:', isDev, ')');

    // Connect to the chat namespace
    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      autoConnect: true,
      path: '/socket.io',
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat socket:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from chat socket:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  sendMessage(message, personality = 'friendly') {
    if (!this.socket || !this.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('message', { message, personality });
  }

  onMessage(callback) {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  onResponse(callback) {
    if (this.socket) {
      this.socket.on('response', callback);
    }
  }

  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  offMessage(callback) {
    if (this.socket) {
      this.socket.off('message', callback);
    }
  }

  offResponse(callback) {
    if (this.socket) {
      this.socket.off('response', callback);
    }
  }

  offError(callback) {
    if (this.socket) {
      this.socket.off('error', callback);
    }
  }
}

export const chatSocket = new ChatSocket();
export default chatSocket;

