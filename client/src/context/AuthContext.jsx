import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     api.get('/auth/me')
  //       .then(res => {
  //         setUser(res.data.user);
  //         const s = initSocket(token);

  //         // ✅ IMPORTANT: wait for connection
  //         s.on('connect', () => {
  //           console.log('🟢 Socket connected:', s.id);
  //           setSocket(s);
  //         });

  //         s.on('disconnect', () => {
  //           console.log('🔴 Socket disconnected');
  //         });

          
  //       })
  //       .catch(() => localStorage.removeItem('token'))
  //       .finally(() => setLoading(false));
  //   } else {
  //     setLoading(false);
  //   }
  // }, []);

  useEffect(() => {
  const token = localStorage.getItem('token');

  if (token) {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);

        const s = initSocket(token);

        setSocket(s); // ✅ FIX: set immediately

        s.on('connect', () => {
          console.log('🟢 Socket connected:', s.id);
        });

        s.on('disconnect', () => {
          console.log('🔴 Socket disconnected');
        });

      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  } else {
    setLoading(false);
  }
}, []);
  // const login = (token, userData) => {
  //   localStorage.setItem('token', token);
  //   setUser(userData);
  //   const s = initSocket(token);

  //    // ✅ same fix here
  //   s.on('connect', () => {
  //     console.log('🟢 Socket connected:', s.id);
  //     // s.emit('join', userData.id);

  //     setSocket(s);
  //   });

  //   s.on('disconnect', () => {
  //     console.log('🔴 Socket disconnected');
  //   });
  // };

  const login = (token, userData) => {
  localStorage.setItem('token', token);
  setUser(userData);

  const s = initSocket(token);

  setSocket(s); // ✅ FIX: set immediately

  s.on('connect', () => {
    console.log('🟢 Socket connected:', s.id);
  });

  s.on('disconnect', () => {
    console.log('🔴 Socket disconnected');
  });
};


  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);

    if (socket) {
      socket.disconnect(); // ✅ ensure proper disconnect
    }
    disconnectSocket();
    setSocket(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, socket, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
