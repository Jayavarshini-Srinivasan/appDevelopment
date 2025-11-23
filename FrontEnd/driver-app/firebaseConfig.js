import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

// Gather config from supported sources
const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra || {});
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || extra.FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || extra.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || extra.FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || extra.FIREBASE_APP_ID,
};

const hasAllRequired = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app = null;
let auth = null;
let db = null;

if (hasAllRequired) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    db = getFirestore(app);
    if (__DEV__) {
      console.log('[Firebase][driver] Initialized for project:', firebaseConfig.projectId);
      console.log('[Firebase][driver] Auth domain:', firebaseConfig.authDomain);
    }
  } catch (e) {
    console.warn('[Firebase][driver] Initialization failed:', e?.message || e);
    app = null; auth = null; db = null;
  }
} else {
  console.warn('[Firebase][driver] Missing Firebase configuration. Ensure EXPO_PUBLIC_* env or expo.extra.* are set.');
}

export { auth, db };
export default app;
