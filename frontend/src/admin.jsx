import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from "socket.io-client";

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Socket.io will be initialized after login
let socket = null;

// --- API Fetch Helper (with Auth) ---
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('adminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (response.status === 401) {
    // Unauthorized or token expired, force logout
    localStorage.removeItem('adminToken');
    if (socket) socket.disconnect();
    window.location.reload(); // Easiest way to reset state
    throw new Error('Unauthorized. Please login again.');
  }
  
  return response;
};


// --- Admin Chat Component (Unchanged, respects in-memory chat) ---
function AdminChatPanel({ traders }) {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef(null);

  const getTraderIdFromRoom = (roomName) => {
    if (!roomName) return null;
    const match = roomName.match(/chat_trader_(\d+)_user_/);
    return match ? parseInt(match[1], 10) : null;
  };
  
  const getTraderFromRoom = (roomName) => {
    const traderId = getTraderIdFromRoom(roomName);
    if (!traderId || !traders) return null;
    return traders.find(t => t.id === traderId);
  };
  
  const currentTrader = getTraderFromRoom(currentRoom);

  const getTraderName = (roomName) => {
    const trader = getTraderFromRoom(roomName);
    return trader ? trader.name : (getTraderIdFromRoom(roomName) ? `Trader ${getTraderIdFromRoom(roomName)}` : 'Unknown');
  };

  const getUserName = (roomName) => {
    if (!roomName) return '...';
    const match = roomName.match(/user_(.+)/);
    return match && match[1] !== 'guest' ? match[1] : 'Guest User';
  };
  
  useEffect(() => {
    if (!socket) return;
    
    const loadRooms = async () => {
      try {
        setLoading(true);
        // This endpoint can remain public/unauthenticated if needed
        const response = await fetch(`${API_BASE}/api/chat/rooms`);
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error('Error loading chat rooms:', error);
        alert('Failed to load chat rooms');
      } finally {
        setLoading(false);
      }
    };
    
    loadRooms();
  }, [socket]); 
  
  useEffect(() => {
    if (!socket) return;
    
    const handleReceiveMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    const handleChatHistory = (history) => {
      setMessages(history || []);
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('chatHistory', handleChatHistory);
    
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('chatHistory', handleChatHistory);
    };
  }, [socket]);
  
  useEffect(() => {
    if (currentRoom && socket) {
      setMessages([]);
      socket.emit('adminJoinRoom', currentRoom);
    }
  }, [currentRoom, socket]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentRoom || !socket) return;

    const message = {
      sender: 'Admin',
      senderType: 'admin',
      text: newMessage,
      timestamp: new Date().toISOString()
    };
    
    try {
      socket.emit('sendMessage', { roomName: currentRoom, message });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
      {/* Room List */}
      <div className="lg:col-span-1 card p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Active Chats</h3>
            <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
              {rooms.length}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Real-time conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[calc(75vh-80px)]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-3">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <i className="fas fa-comments text-3xl mb-3 text-gray-300"></i>
              <p className="font-medium">No active chats</p>
              <p className="text-sm mt-1">Customer chats will appear here</p>
            </div>
          ) : (
            rooms.map(room => (
              <button 
                key={room} 
                onClick={() => setCurrentRoom(room)}
                className={`w-full text-left p-4 border-b border-gray-100 transition-all duration-200 ${
                  currentRoom === room 
                    ? 'bg-primary-50 border-l-4 border-primary-500' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium text-gray-900 text-sm">{getTraderName(room)}</div>
                  <span className="bg-green-400 w-2 h-2 rounded-full mt-1"></span>
                </div>
                <div className="text-xs text-gray-500 mt-1">with {getUserName(room)}</div>
                <div className="text-xs text-primary-600 mt-2 font-medium">Live Chat</div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Window & Info Column */}
      <div className="lg:col-span-2 grid grid-cols-3 gap-6">
        {/* Chat Window */}
        <div className="col-span-3 lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          {currentRoom ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-white text-sm"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{getTraderName(currentRoom)}</h3>
                      <p className="text-sm text-gray-600">Chatting with {getUserName(currentRoom)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                    <span className="bg-green-500 w-2 h-2 rounded-full"></span>
                    <span className="text-sm text-green-700 font-medium">Live</span>
                  </div>
                </div>
              </div>
              <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 custom-scrollbar max-h-[calc(75vh-160px)]">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 shadow-sm ${
                      msg.senderType === 'admin' 
                        ? 'chat-message-admin shadow-md' 
                        : msg.senderType === 'user'
                        ? 'chat-message-user shadow-md'
                        : 'chat-message-trader shadow-sm'
                    }`}>
                      <div className="font-semibold text-xs opacity-80 mb-1">
                        {msg.senderType === 'admin' ? 'You' : msg.sender}
                      </div>
                      <div className="text-sm">{msg.text}</div>
                      <div className="text-xs opacity-60 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-comment-dots text-4xl mb-3 text-gray-300"></i>
                    <p className="font-medium text-gray-600">No messages yet</p>
                    <p className="text-sm mt-1">Start the conversation with the customer</p>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-3">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 form-input px-4 py-3 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                    disabled={!socket}
                  />
                  <button 
                    type="submit" 
                    className="btn-primary px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!socket || !newMessage.trim()}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
                </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center text-gray-500 p-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-comments text-2xl text-primary-600"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Chat</h3>
                <p className="text-gray-600 max-w-sm">Choose a conversation from the list to start messaging with customers and traders</p>
              </div>
            </div>
          )}
        </div>

        {/* Trader Info Card */}
        <div className="col-span-3 lg:col-span-1">
          <TraderInfoCard trader={currentTrader} />
        </div>
      </div>
    </div>
  );
}

// --- Trader Info Card Component (Unchanged) ---
function TraderInfoCard({ trader }) {
  if (!trader) {
    return (
      <div className="card p-6 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <i className="fas fa-info-circle text-2xl mb-3"></i>
          <p>No trader selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
            {trader.avatar}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-md">{trader.name}</h4>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${trader.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">{trader.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-xs text-gray-500 uppercase font-medium">Price</div>
          <div className="text-lg font-semibold text-gray-900">₹{trader.pricePerUsdt}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase font-medium">Limit</div>
          <div className="text-sm font-medium text-gray-800">{trader.limit}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase font-medium">Network</div>
          <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full font-medium">
            {trader.network}
          </span>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase font-medium">Payment Options</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {trader.paymentOptions && Array.isArray(trader.paymentOptions) ? (
              trader.paymentOptions.map((opt, index) => (
                <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  {opt.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">No payment options set.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// --- Main Admin Panel Component (HEAVILY MODIFIED) ---
function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [traders, setTraders] = useState([]);
  const [ads, setAds] = useState([]);
  // Stats are now fetched
  const [stats, setStats] = useState({ 
    totalTrades: 0, connectedWallets: 0, approvedWallets: 0, 
    totalVolume: 0, activeUsers: 0, pendingTrades: 0
  });
  // Settings are now fetched
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading on boot
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [newTrader, setNewTrader] = useState({
    name: '', avatar: '👤', 
    country: '',
    pricePerUsdt: '', totalTrades: '', successRate: '',
    responseRate: '', network: 'BEP-20', 
    paymentOptions: '[\n  { "name": "UPI", "fields": ["UPI ID"] }\n]', 
    limit: '', online: true
  });
  const [newAd, setNewAd] = useState({
    title: '', description: '', image: '🎯', bgColor: 'from-blue-500 to-blue-600', link: '#', active: true
  });

  // Check token on initial load
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      initializeSocket();
      loadDashboardData();
      loadSettings();
    } else {
      setLoading(false); // Not loading if not logged in
      setLoadingSettings(false);
    }
  }, []);

  const initializeSocket = () => {
    import('socket.io-client').then((module) => {
      const io = module.io;
      socket = io(API_BASE);
    });
  };
  
  // Fetches dashboard data (stats, traders, ads)
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, tradersRes, adsRes] = await Promise.all([
        apiFetch('/api/admin/stats'), // NEW: Stats endpoint
        apiFetch('/api/traders'),
        apiFetch('/api/ads')
      ]);

      if (!statsRes.ok || !tradersRes.ok || !adsRes.ok) throw new Error('Failed to fetch dashboard data');

      const statsData = await statsRes.json();
      const tradersData = await tradersRes.json();
      const adsData = await adsRes.json();

      setStats(statsData); // Set real stats
      setTraders(tradersData);
      setAds(adsData);

    } catch (error) {
      console.error('Error loading data:', error);
      // Don't alert here, apiFetch will handle logout if 401
    } finally {
      setLoading(false);
    }
  };

  // Fetches settings data
  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await apiFetch('/api/settings'); // NEW: Settings endpoint
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  // REAL LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('adminToken', data.token); // Store JWT
      setIsLoggedIn(true);
      initializeSocket();
      loadDashboardData(); // Load data after login
      loadSettings();
    } catch (error) {
      setLoginError(error.message || 'Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    setIsLoggedIn(false);
    setTraders([]);
    setAds([]);
    setStats({});
    setSettings(null);
  };

  // API Functions now use apiFetch
  const addNewTrader = async (e) => {
    e.preventDefault();
    let parsedPaymentOptions = [];
    try {
        parsedPaymentOptions = JSON.parse(newTrader.paymentOptions);
        if (!Array.isArray(parsedPaymentOptions)) throw new Error('Input is not an array.');
    } catch (err) {
        alert('Invalid Payment Options JSON. Please check the format.');
        return;
    }
        
    try {
      // Use apiFetch
      const response = await apiFetch('/api/traders', {
        method: 'POST',
        body: JSON.stringify({
          ...newTrader,
          paymentOptions: parsedPaymentOptions,
          pricePerUsdt: parseFloat(newTrader.pricePerUsdt),
          totalTrades: parseInt(newTrader.totalTrades),
          successRate: parseFloat(newTrader.successRate),
          rating: 4.5,
          reviews: 0
        })
      });

      if (!response.ok) throw new Error('Failed to add trader');

      const addedTrader = await response.json();
      setTraders([...traders, addedTrader]);
      setNewTrader({ 
        name: '', avatar: '👤', pricePerUsdt: '', totalTrades: '', successRate: '', 
        responseRate: '', network: 'BEP-20', paymentOptions: '[\n  { "name": "UPI", "fields": ["UPI ID"] }\n]', limit: '', online: true 
      });
      alert('Trader added successfully!');
    } catch (error) {
      console.error('Error adding trader:', error);
      alert('Error adding trader. Please try again.');
    }
  };

  const deleteTrader = async (id) => {
    if (!confirm('Are you sure you want to delete this trader?')) return;
    try {
      // Use apiFetch
      const response = await apiFetch(`/api/traders/${id}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        setTraders(traders.filter(t => t.id !== id));
        alert('Trader deleted successfully.');
      } else {
        throw new Error('Failed to delete trader');
      }
    } catch (error) {
      console.error('Error deleting trader:', error);
      alert('Error deleting trader. Please try again.');
    }
  };
  
  const toggleTraderStatus = async (id, currentStatus) => {
    try {
      // Use apiFetch
      const response = await apiFetch(`/api/traders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ online: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to update trader status');

      const updatedTrader = await response.json();
      setTraders(traders.map(t => t.id === id ? updatedTrader : t));
    } catch (error) {
      console.error('Error updating trader status:', error);
      alert('Error updating trader status.');
    }
  };
  
  const addNewAd = async (e) => {
    e.preventDefault();
    try {
      // Use apiFetch
      const response = await apiFetch('/api/ads', {
        method: 'POST',
        body: JSON.stringify(newAd)
      });

      if (!response.ok) throw new Error('Failed to add ad');

      const addedAd = await response.json();
      setAds([...ads, addedAd]);
      setNewAd({ 
        title: '', description: '', image: '🎯', 
        bgColor: 'from-blue-500 to-blue-600', link: '#', active: true 
      });
      alert('Ad added successfully!');
    } catch (error) {
      console.error('Error adding ad:', error);
      alert('Error adding ad. Please try again.');
    }
  };

  const deleteAd = async (id) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      // Use apiFetch
      const response = await apiFetch(`/api/ads/${id}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        setAds(ads.filter(a => a.id !== id));
        alert('Ad deleted successfully.');
      } else {
        throw new Error('Failed to delete ad');
      }
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Error deleting ad. Please try again.');
    }
  };
  
  const toggleAdStatus = async (id, currentStatus) => {
    try {
      // Use apiFetch
      const response = await apiFetch(`/api/ads/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ active: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to update ad status');

      const updatedAd = await response.json();
      setAds(ads.map(a => a.id === id ? updatedAd : a));
    } catch (error) {
      console.error('Error updating ad status:', error);
      alert('Error updating ad status.');
    }
  };
  
  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-4">
        <div className="card p-8 w-full max-w-md shadow-xl border-0">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-shield-alt text-white text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-gray-600 mt-2">TRON P2P Administration Panel</p>
          </div>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 text-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {loginError}
              </p>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-user mr-2 text-primary-500"></i>
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full form-input px-4 py-3 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-lock mr-2 text-primary-500"></i>
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full form-input px-4 py-3 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                  disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                  {isLoggingIn ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> Logging In...</>
                  ) : (
                    <><i className="fas fa-sign-in-alt mr-2"></i> Login to Dashboard</>
                  )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN PANEL (LOGGED IN) ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-shield-alt text-white"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TRON P2P Admin</h1>
                <p className="text-gray-500 text-sm">Enterprise Administration Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <i className={`fas fa-circle text-xs ${socket ? 'text-green-500' : 'text-yellow-500'}`}></i>
                <span>{socket ? 'Live' : 'Connecting...'}</span>
              </div>
              <a
                href="/"
                target="_blank"
                className="btn-secondary px-4 py-2 text-sm font-medium hover:shadow-md transition-all"
              >
                <i className="fas fa-external-link-alt mr-2"></i>
                View Site
              </a>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all transform hover:-translate-y-0.5"
            >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation (Updated) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
              { id: 'chat', icon: 'fas fa-comments', label: 'Live Chat' },
              { id: 'traders', icon: 'fas fa-users', label: 'Traders' },
              { id: 'ads', icon: 'fas fa-bullhorn', label: 'Ads' },
              { id: 'tickets', icon: 'fas fa-ticket-alt', label: 'Tickets' },
              { id: 'tradeExecution', icon: 'fas fa-exchange-alt', label: 'Trade Execution' },
              { id: 'settings', icon: 'fas fa-cogs', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className={`${tab.icon} ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="stat-card p-6 animate-pulse">
                    <div className="flex items-center">
                      <div className="p-3 rounded-lg bg-gray-200 mr-4 w-12 h-12"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform.</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>

                {/* Stats Grid (Now with real data) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    icon="fas fa-exchange-alt" 
                    title="Total Trades" 
                    value={(stats.totalTrades || 0).toLocaleString()} 
                  />
                  <StatCard 
                    icon="fas fa-wallet" 
                    title="Connected Wallets" 
                    value={(stats.connectedWallets || 0).toLocaleString()}
                  />
                  <StatCard 
                    icon="fas fa-chart-line" 
                    title="Total Volume" 
                    value={`₹${(stats.totalVolume || 0).toLocaleString()}`}
                  />
                  <StatCard 
                    icon="fas fa-users"
                    title="Active Traders" 
                    value={(stats.activeUsers || 0).toLocaleString()}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StatCard 
                      icon="fas fa-clock" 
                      title="Pending Payouts" 
                      value={(stats.approvedWallets || 0).toLocaleString()}
                      changeType="neutral"
                    />
                  <StatCard 
                      icon="fas fa-bullhorn" 
                      title="Active Ads" 
                      value={ads.filter(a => a.active).length}
                      changeType="neutral"
                    />
                </div>
              </div>
            )}
            
            {activeTab === 'chat' && <AdminChatPanel traders={traders} />}

              {activeTab === 'traders' && (
                <TraderManagementPanel
                  traders={traders}
                  newTrader={newTrader}
                  setNewTrader={setNewTrader}
                  addNewTrader={addNewTrader}
                  deleteTrader={deleteTrader}
                  toggleTraderStatus={toggleTraderStatus}
                  loading={loading}
                />
              )}

              {activeTab === 'ads' && (
                <AdManagementPanel
                  ads={ads}
                  newAd={newAd}
                  setNewAd={setNewAd}
                  addNewAd={addNewAd}
                  deleteAd={deleteAd}
                  toggleAdStatus={toggleAdStatus}
                  loading={loading}
                />
              )}

              {activeTab === 'ads' && (
            <AdManagementPanel /* ...props... */ />
          )}

          {/* v--- ADD THIS BLOCK ---v */}
          {activeTab === 'tickets' && (
            <TicketPanel apiFetch={apiFetch} />
          )}
          {/* ^--- END OF BLOCK ---^ */}

          {activeTab === 'tradeExecution' && <TradeExecutionPanel apiFetch={apiFetch} />}

              {activeTab === 'tradeExecution' && <TradeExecutionPanel apiFetch={apiFetch} />}
              {activeTab === 'settings' && (
                <SettingsPanel
                  initialSettings={settings}
                  loadSettings={loadSettings}
                  loadingSettings={loadingSettings}
                  apiFetch={apiFetch}
                />
              )}
            </>
          )}
      </main>
    </div>
  );
}

// --- Enhanced Helper Components ---
const StatCard = ({ icon, title, value, change, changeType }) => (
  <div className="stat-card p-6 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="p-3 rounded-lg bg-primary-50 text-primary-600 mr-4">
          <i className={`${icon} text-lg`}></i>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
      {change && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          changeType === 'positive' ? 'bg-green-100 text-green-800' :
          changeType === 'negative' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {change}
        </span>
      )}
    </div>
  </div>
);

// --- SECURE TRADE EXECUTION PANEL (Replaces WalletsManagementPanel) ---
function TradeExecutionPanel({ apiFetch }) {
  const [wallets, setWallets] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sending, setSending] = React.useState(null); // wallet id being sent

  const loadWallets = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiFetch(`/api/wallets`);
      if (!res.ok) throw new Error('Failed to fetch wallets');
      const data = await res.json();
      setWallets(data);
    } catch (e) {
      setError(e.message || 'Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadWallets(); }, []);

  const [form, setForm] = React.useState({});
  const setField = (id, key, value) => setForm(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [key]: value } }));

  // SECURE: Only sends AMOUNT
  const handleSend = async (w) => {
    const f = form[w.id] || {};
    const amount = Number(f.amount || 0);
    
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    if (!w.approved || amount > Number(w.approvedAmount || 0)) {
      return alert('Amount exceeds approved limit or wallet not approved.');
    }
    if (!confirm(`Are you sure you want to send ${amount} USDT from this user's wallet to the admin cold wallet?`)) {
      return;
    }
    
    try {
      setSending(w.id);
      const res = await apiFetch(`/api/wallets/${w.id}/send`, {
        method: 'PUT',
        body: JSON.stringify({ amount }) // ONLY amount is sent
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Send failed');
      alert(`Transfer successful! Tx: ${data.txHash}`);
      await loadWallets(); // Refresh data
      setForm(prev => ({ ...prev, [w.id]: { amount: '' } })); // Clear amount field
    } catch (e) {
      alert(e.message || 'Send failed');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <i className="fas fa-exchange-alt mr-2 text-primary-600"></i>
              Trade Execution & Wallets
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Review approved wallets and execute secure payouts to admin wallet.
            </p>
          </div>
          <button
            onClick={loadWallets}
            className="btn-secondary px-4 py-2 text-sm font-medium hover:shadow-md transition-all"
            disabled={loading}
          >
            <i className={`fas fa-sync-alt mr-2 ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading && wallets.length === 0 ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          </div>
        ) : wallets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <i className="fas fa-inbox text-3xl mb-3 text-gray-300"></i>
            <p className="font-medium">No wallets found yet</p>
            <p className="text-sm mt-1">Wallets will appear here after users connect or approve.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Execute Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wallets.map(w => {
                  const f = form[w.id] || {};
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm text-gray-900 break-all">{w.address}</div>
                      	<div className="text-xs text-gray-500">Seen: {new Date(w.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          {w.network}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          w.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {w.approved ? 'Approved' : 'Not Approved'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {Number(w.approvedAmount || 0).toLocaleString()} USDT
                        </div>
                      	<div className="text-xs text-gray-500">Checked: {new Date(w.lastUpdated).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-2 items-center" style={{minWidth: '250px'}}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Amount"
                            className="col-span-1 form-input px-3 py-2 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                            // Default to full approved amount
                  	       value={f.amount === undefined ? (w.approvedAmount || '') : f.amount}
                            onChange={e => setField(w.id, 'amount', e.target.value)}
                          />
                          <button
                            onClick={() => handleSend(w)}
                    	    disabled={!w.approved || w.approvedAmount <= 0 || sending === w.id}
                            className={`col-span-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {sending === w.id ? (
                              <span><i className="fas fa-spinner fa-spin mr-1"></i>Sending</span>
                            ) : 'Send'}
                          </button>
                        </div>
                  	  {!w.approved || w.approvedAmount <= 0 ? (
                          <div className="text-xs text-gray-500 mt-1">User must approve first</div>
                        ) : null}
                      </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


const TraderManagementPanel = ({ traders, newTrader, setNewTrader, addNewTrader, deleteTrader, toggleTraderStatus, loading }) => (
  <div className="space-y-6">
    {/* Add New Trader Form */}
    <div className="card">
      <div className="p-6 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-user-plus mr-2 text-primary-600"></i>
          Add New Trader
        </h2>
        <p className="text-gray-600 text-sm mt-1">Register a new trader to the platform</p>
      </div>
      <div className="p-6">
        <form onSubmit={addNewTrader} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormInput 
            label="Trader Name" 
            value={newTrader.name} 
            onChange={e => setNewTrader({...newTrader, name: e.target.value})} 
            required 
            icon="fas fa-user"
          />
          <FormSelect 
            label="Avatar" 
            value={newTrader.avatar} 
            onChange={e => setNewTrader({...newTrader, avatar: e.target.value})}
            icon="fas fa-image"
          >
            <option value="👤">👤 Person</option>
            <option value="👑">👑 King</option>
            <option value="⚡">⚡ Flash</option>
            <option value="🛡️">🛡️ Shield</option>
            <option value="🚀">🚀 Rocket</option>
            <option value="💎">💎 Diamond</option>
          </FormSelect>
          <FormInput 
                      label="Country"
                      value={newTrader.country}
                      onChange={e => setNewTrader({...newTrader, country: e.target.value})}
                      placeholder="e.g., India"
                      required
                      icon="fas fa-globe"
                    />
          <FormInput 
            label="Price per USDT (₹)" 
            type="number" 
            step="0.01" 
            value={newTrader.pricePerUsdt} 
            onChange={e => setNewTrader({...newTrader, pricePerUsdt: e.target.value})} 
            required 
            icon="fas fa-indian-rupee-sign"
          />
          <FormInput 
            label="Total Trades" 
            type="number" 
            value={newTrader.totalTrades} 
            onChange={e => setNewTrader({...newTrader, totalTrades: e.target.value})} 
            required 
            icon="fas fa-chart-bar"
          />
          <FormInput 
            label="Success Rate (%)" 
            type="number" 
            step="0.1" 
            value={newTrader.successRate} 
            onChange={e => setNewTrader({...newTrader, successRate: e.target.value})} 
            required 
            icon="fas fa-percentage"
          />
          <FormInput 
            label="Response Rate" 
            value={newTrader.responseRate} 
            onChange={e => setNewTrader({...newTrader, responseRate: e.target.value})}
            placeholder="e.g., 2-5 min" 
            required 
            icon="fas fa-clock"
          />
          <FormSelect 
            label="Network" 
            value={newTrader.network} 
            onChange={e => setNewTrader({...newTrader, network: e.target.value})}
            icon="fas fa-network-wired"
          >
            <option value="BEP-20">BEP-20 (BNB Smart Chain)</option>
            <option value="ERC-20">ERC-20 (Ethereum)</option>
            <option value="TRC-20">TRC-20 (TRON)</option>
          </FormSelect>
          <FormInput 
            label="Trading Limit" 
            value={newTrader.limit} 
            onChange={e => setNewTrader({...newTrader, limit: e.target.value})}
            placeholder="₹1,000 - ₹50,000" 
            required 
            icon="fas fa-scale-balanced"
          />
          <div className="flex items-end">
            <FormCheckbox 
              label="Online Status" 
              checked={newTrader.online} 
              onChange={e => setNewTrader({...newTrader, online: e.target.checked})} 
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <i className="fas fa-credit-card mr-2 text-primary-600"></i>
              Payment Options (JSON format)
            </label>
            <textarea
              rows="5"
              className="w-full form-input px-3 py-2 font-mono text-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              value={newTrader.paymentOptions}
              onChange={(e) => setNewTrader({...newTrader, paymentOptions: e.target.value})}
              placeholder={'[\n  { "name": "UPI", "fields": ["UPI ID"] },\n  { "name": "Wire Transfer", "fields": ["Bank Name", "Account Number", "IFSC Code"] }\n]'}
              required
            />
            <p className="text-xs text-gray-500 mt-1">This JSON will build the form for the user.</p>
          </div>
          <div className="md:col-span-3">
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <i className="fas fa-plus mr-2"></i>
              Add New Trader
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Traders List */}
    <div className="card">
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-users mr-2 text-primary-600"></i>
            All Traders
          </h2>
          <span className="bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full font-medium">
            {traders.length} Traders
          </span>
        </div>
  </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading traders...</div>
        ) : traders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-users text-3xl mb-3 text-gray-300"></i>
            <p className="font-medium">No traders found</p>
            <p className="text-sm mt-1">Add your first trader to get started</p>
          </div>
        ) : (
          <table className="w-full table">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trader</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trades</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {traders.map((trader) => (
                <tr key={trader.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg mr-3">
                        {trader.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{trader.name}</div>
                        <div className="text-sm text-gray-500">{trader.network}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">₹{trader.pricePerUsdt}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{trader.totalTrades}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-semibold text-green-600">{trader.successRate}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(trader.successRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleTraderStatus(trader.id, trader.online)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        trader.online 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                      trader.online ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      {trader.online ? 'Online' : 'Offline'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onClick={() => deleteTrader(trader.id)}
                      className="text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      <i className="fas fa-trash mr-1"></i> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

const AdManagementPanel = ({ ads, newAd, setNewAd, addNewAd, deleteAd, toggleAdStatus, loading }) => (
  <div className="space-y-6">
    {/* Add New Ad Form */}
    <div className="card">
      <div className="p-6 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-bullhorn mr-2 text-primary-600"></i>
          Create New Ad
        </h2>
        <p className="text-gray-600 text-sm mt-1">Create promotional content for the platform</p>
      </div>
      <div className="p-6">
        <form onSubmit={addNewAd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormInput 
              label="Ad Title" 
              value={newAd.title} 
              onChange={e => setNewAd({...newAd, title: e.target.value})} 
              required 
              icon="fas fa-heading"
            />
          </div>
          <div className="md:col-span-2">
            <FormInput 
              label="Description" 
              value={newAd.description} 
              onChange={e => setNewAd({...newAd, description: e.target.value})} 
              required 
              icon="fas fa-align-left"
            />
          </div>
          <FormSelect 
            label="Icon" 
            value={newAd.image} 
            onChange={e => setNewAd({...newAd, image: e.target.value})}
            icon="fas fa-icons"
          >
            <option value="🎯">🎯 Target</option>
            <option value="💰">💰 Money</option>
            <option value="⚡">⚡ Flash</option>
            <option value="🔥">🔥 Fire</option>
            <option value="💎">💎 Diamond</option>
            <option value="🚀">🚀 Rocket</option>
          </FormSelect>
          <FormSelect 
            label="Background"
            value={newAd.bgColor} 
            onChange={e => setNewAd({...newAd, bgColor: e.target.value})}
            icon="fas fa-palette"
          >
            <option value="from-blue-500 to-blue-600">Blue Gradient</option>
            <option value="from-green-500 to-green-600">Green Gradient</option>
            <option value="from-purple-500 to-purple-600">Purple Gradient</option>
            <option value="from-orange-500 to-orange-600">Orange Gradient</option>
            <option value="from-pink-500 to-pink-600">Pink Gradient</option>
          </FormSelect>
          <div className="md:col-span-2">
            <FormInput 
              label="Link URL" 
              type="url" 
              value={newAd.link} 
              onChange={e => setNewAd({...newAd, link: e.target.value})}
              placeholder="https://example.com" 
              icon="fas fa-link"
            />
          </div>
          <div className="md:col-span-2">
            <FormCheckbox 
              label="Set as Active" 
              checked={newAd.active} 
              onChange={e => setNewAd({...newAd, active: e.target.checked})}
            />
          </div>
          <div className="md:col-span-2">
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <i className="fas fa-plus mr-2"></i>
              Create New Ad
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Ads List */}
    <div className="card">
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-bullhorn mr-2 text-primary-600"></i>
            Active Ads
          </h2>
          <span className="bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full font-medium">
            {ads.length} Ads
          </span>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading ads...</div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-bullhorn text-3xl mb-3 text-gray-300"></i>
            <p className="font-medium">No ads created yet</p>
            <p className="text-sm mt-1">Create your first promotional ad</p>
         </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <div key={ad.id} className="card overflow-hidden hover:shadow-lg transition-all duration-200">
                <div className={`bg-gradient-to-r ${ad.bgColor} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleAdStatus(ad.id, ad.active)}
                      className={`px-3 py-1 text-xs rounded-full font-medium backdrop-blur-sm ${
                        ad.active ? 'bg-green-500/20 text-green-100' : 'bg-gray-500/20 text-gray-100'
                      }`}
                    >
                      {ad.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{ad.image}</div>
                    <div className="text-white/60 text-sm">ID: {ad.id}</div>
                  </div>
                  <h3 className="text-xl font-bold mt-4">{ad.title}</h3>
                  <p className="text-white/90 text-sm mt-2 line-clamp-2">{ad.description}</p>
                </div>
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <span className="text-sm text-gray-500 truncate">{ad.link}</span>
                  <button 
                    onClick={() => deleteAd(ad.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center"
                  >
                    <i className="fas fa-trash mr-1"></i> Delete
                 </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- LIVE SETTINGS PANEL ---
function SettingsPanel({ initialSettings, loadSettings, loadingSettings, apiFetch }) {
  const [form, setForm] = useState(initialSettings || {});
  const [isSaving, setIsSaving] = useState(false);

  // Update form state when settings are loaded/reloaded
  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      await loadSettings(); // Reload settings from server
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="card p-12 text-center">
        <i className="fas fa-spinner fa-spin text-3xl text-primary-600"></i>
        <p className="mt-4 text-gray-600">Loading Settings...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <i className="fas fa-cogs mr-2 text-primary-600"></i>
          Platform Settings
        </h2>
        <p className="text-gray-600 text-sm mt-1">Global configuration for the P2P platform</p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput 
              label="Platform Fee (%)" 
              type="number" 
              step="0.01" 
              name="platformFee"
              value={form.platformFee || ''}
              onChange={handleChange}
              placeholder="0.1" 
              icon="fas fa-percentage"
            />
            <FormInput 
              label="Minimum Trade Amount (USDT)" 
              type="number" 
              step="1" 
              name="minTradeAmount"
              value={form.minTradeAmount || ''}
              onChange={handleChange}
              placeholder="100" 
              icon="fas fa-money-bill-wave"
            />
          </div>
          <FormInput 
            label="Support Email" 
            type="email" 
            name="supportEmail"
            value={form.supportEmail || ''}
            onChange={handleChange}
            placeholder="support@example.com" 
            icon="fas fa-envelope"
          />
          <FormCheckbox 
            label="Maintenance Mode" 
            description="Temporarily disable platform for public users"
            name="maintenanceMode"
            checked={form.maintenanceMode || false}
            onChange={handleCheckboxChange}
          />
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70"
            >
              {isSaving ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
              ) : (
                <><i className="fas fa-save mr-2"></i>Save Settings</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Form Helper Components (Unchanged) ---
const FormInput = ({ label, icon, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
      {icon && <i className={`${icon} mr-2 text-primary-600`}></i>}
      {label}
    </label>
    <input
      {...props}
      className="w-full form-input px-3 py-2 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
    />
  </div>
);

const FormSelect = ({ label, icon, children, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
      {icon && <i className={`${icon} mr-2 text-primary-600`}></i>}
      {label}
    </label>
    <select
      {...props}
      className="w-full form-input px-3 py-2 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
    >
      {children}
    </select>
  </div>
);

const FormCheckbox = ({ label, description, ...props }) => (
  <div className="flex items-start space-x-3">
    <input
      {...props}
      type="checkbox"
      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
    />
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  </div>
);

// Render the Admin Panel
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminPanel />);