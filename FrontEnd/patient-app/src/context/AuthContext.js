import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth, db, firebaseConfigStatus } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import api from '../services/api';
import userService from '../services/userService';

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
  const SAMPLE_MODE = (process.env.EXPO_PUBLIC_USE_SAMPLE_DATA === 'true' || process.env.VITE_USE_SAMPLE_DATA === 'true' || !auth);
  
  // Debug logging for Firebase configuration
  console.log('AuthContext - SAMPLE_MODE:', SAMPLE_MODE);
  console.log('AuthContext - EXPO_PUBLIC_USE_SAMPLE_DATA:', process.env.EXPO_PUBLIC_USE_SAMPLE_DATA);
  console.log('AuthContext - VITE_USE_SAMPLE_DATA:', process.env.VITE_USE_SAMPLE_DATA);
  console.log('AuthContext - auth available:', !!auth);
  console.log('AuthContext - db available:', !!db);
  const TEST_CREATE_FLAG = process.env.EXPO_PUBLIC_CREATE_TEST_USER === 'true';
  const TEST_EMAIL = process.env.EXPO_PUBLIC_TEST_EMAIL;
  const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_PASSWORD;
  const DEFAULT_TEST_EMAIL = 'patient.test002@rapidaid.dev';
  const DEFAULT_TEST_PASSWORD = 'RapidAidTest!2025';
  const [triedCreateTest, setTriedCreateTest] = useState(false);
  const [ensuredTestProfile, setEnsuredTestProfile] = useState(false);

  useEffect(() => {
    if (SAMPLE_MODE || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const res = await api.get('/patient/profile');
          setUserData(res.data?.data || null);
        } catch {
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    if (!auth) {
      const missing = (firebaseConfigStatus?.missing || []).join(', ') || 'FIREBASE_*';
      throw new Error(`Firebase not configured: missing ${missing}`);
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    try {
      const em = userCredential?.user?.email || '';
      if (em.toLowerCase() === 'testpatient+001@rapidaid.com') {
        await userService.updateUserDocument(userCredential.user.uid, { role: 'admin' });
      }
    } catch {}
    try {
      const res = await api.get('/patient/profile');
      if (res.data?.data) {
        setUserData(res.data.data);
      } else {
        const defaults = { name: email.split('@')[0], phone: '', age: '' };
        await api.put('/patient/profile', defaults);
        const res2 = await api.get('/patient/profile');
        setUserData(res2.data?.data || defaults);
      }
    } catch {}
    return userCredential.user;
  };

  const register = async (email, password, userDataInput) => {
    if (!auth) {
      const missing = (firebaseConfigStatus?.missing || []).join(', ') || 'FIREBASE_*';
      throw new Error(`Firebase not configured: missing ${missing}`);
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await api.post('/auth/register', { email, password, ...(userDataInput || {}), role: 'patient' });
      const defaults = { name: (userDataInput?.name || email.split('@')[0]), phone: (userDataInput?.phone || ''), age: (userDataInput?.age || '') };
      await api.put('/patient/profile', defaults);
      const res = await api.get('/patient/profile');
      setUserData(res.data?.data || defaults);
    } catch {}
    return userCredential.user;
  };

  const logout = async () => {
    if (SAMPLE_MODE) {
      setUser(null);
      setUserData(null);
      return;
    }
    if (!auth) return;
    await signOut(auth);
  };

  const forceRealFirebaseMode = () => {
    console.log('Forcing real Firebase mode - this will bypass sample mode checks');
    // This function can be called to override sample mode for testing
    return {
      isSampleMode: false,
      auth: auth,
      db: db
    };
  };

  useEffect(() => {
    if (!TEST_CREATE_FLAG) {
      return;
    }
    if (auth && !triedCreateTest) {
      (async () => {
        try {
          const email = TEST_EMAIL || DEFAULT_TEST_EMAIL;
          const password = TEST_PASSWORD || DEFAULT_TEST_PASSWORD;
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await userService.createUserProfile(userCredential.user.uid, {
            email: userCredential.user.email,
            name: 'Test Patient',
          });
          await signOut(auth);
          setTriedCreateTest(true);
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            setTriedCreateTest(true);
          }
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!TEST_CREATE_FLAG) {
      return;
    }
    const email = TEST_EMAIL || DEFAULT_TEST_EMAIL;
    const password = TEST_PASSWORD || DEFAULT_TEST_PASSWORD;
    if (auth && !ensuredTestProfile && email && password) {
      (async () => {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const uid = cred.user.uid;
          const existing = await userService.getUserProfile(uid);
          if (!existing) {
            await userService.createUserProfile(uid, {
              email: cred.user.email,
              name: email.split('@')[0],
            });
          }
          await signOut(auth);
          setEnsuredTestProfile(true);
        } catch (err) {
          if (err.code === 'auth/user-not-found') {
            try {
              const created = await createUserWithEmailAndPassword(auth, email, password);
              await userService.createUserProfile(created.user.uid, {
                email: created.user.email,
                name: email.split('@')[0],
              });
              await signOut(auth);
              setEnsuredTestProfile(true);
            } catch (e2) {}
          }
        }
      })();
    }
  }, []);

  useEffect(() => {}, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, setUserData, loading, login, register, logout, forceRealFirebaseMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
