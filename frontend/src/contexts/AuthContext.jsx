import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'money_keeper_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Try to restore user from localStorage on initial load
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to restore user from localStorage:', e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('Failed to save user to localStorage:', e);
      }
    } else {
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to remove user from localStorage:', e);
      }
    }
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      const response = await axios.get('/api/auth/me', {
        withCredentials: true,
      });
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      // Get stored user from localStorage
      let storedUser = null;
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          storedUser = JSON.parse(stored);
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // If we have a stored user and this is the first retry, try once more
      if (retryCount === 0 && storedUser) {
        setTimeout(() => checkAuth(1), 500);
        return;
      }
      
      // Only clear user if we're sure the session is invalid (401)
      // For other errors (network, 500, etc), keep the stored user
      if (error.response?.status === 401) {
        setUser(null);
      } else if (storedUser) {
        // For non-401 errors, keep the stored user to allow offline-like experience
        // This helps when server is restarting or temporarily unavailable
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, remember = true) => {
    const response = await axios.post('/auth/login', {
      username,
      password,
      remember,
    }, {
      withCredentials: true,
    });
    if (response.data.user) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const register = async (username, email, password) => {
    const response = await axios.post('/auth/register', {
      username,
      email,
      password,
    }, {
      withCredentials: true,
    });
    if (response.data.user) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.get('/auth/logout', {
        withCredentials: true,
      });
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
