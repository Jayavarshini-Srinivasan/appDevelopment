import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!auth) {
      console.warn('AuthContext: Firebase auth not initialized. Check Firebase configuration.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      if (firebaseUser) {
        console.log('��� User UID:', firebaseUser.uid);
        setUser(firebaseUser);
        try {
          const meResponse = await api.get('/auth/me');
          if (meResponse.data?.data) {
            console.log('📄 User data loaded:', meResponse.data.data);
            setUserData(meResponse.data.data);
          } else {
            console.log('⚠️ /auth/me returned no data');
          }
        } catch (error) {
          console.error('❌ Error fetching user data via API:', error);
        }
      } else {
        console.log('🚪 User logged out');
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase not configured. Please set Firebase credentials.');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const register = async (email, password, userData) => {
    if (!auth) throw new Error('Firebase not configured. Please set Firebase credentials.');
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Prepare comprehensive driver data
      const driverData = {
        email,
        role: 'driver',
        isActive: true,
        createdAt: new Date().toISOString(),
        ...userData,
        // Initialize driver statistics
        stats: {
          totalCompleted: 0,
          completedToday: 0,
          completedThisWeek: 0,
          averageRating: 0,
          totalDistance: 0,
          totalHours: 0,
          emergencyTypes: {}
        },
        // Initialize driver status
        status: 'offline',
        isOnDuty: false,
        currentLocation: null,
        lastActive: new Date().toISOString()
      };

      // Store user data in backend via API
      await api.post('/auth/register', { email, password, ...driverData });

      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
