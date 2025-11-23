import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

// Read from environment variables or expo.extra first
const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra || {});
const envConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || extra.FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || extra.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || extra.FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || extra.FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || extra.FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFromEnv = requiredKeys.filter((k) => !envConfig[k]);

// Final fallback using provided project keys to avoid runtime login failure
const fallbackConfig = {
  apiKey: 'AIzaSyDGUwEaC9le1MexL5MCd60aqGpAIaQHiRQ',
  authDomain: 'rapidaid-8a617.firebaseapp.com',
  projectId: 'rapidaid-8a617',
  storageBucket: 'rapidaid-8a617.firebasestorage.app',
  messagingSenderId: '406348450924',
  appId: '1:406348450924:web:e1a1fec111b118f730dc49',
  measurementId: 'G-XJ1N4JFDZ8',
};

const isEnvValid = missingFromEnv.length === 0;
const firebaseConfig = isEnvValid ? envConfig : fallbackConfig;

if (!isEnvValid) {
  console.warn('[Firebase][patient] Missing env for keys:', missingFromEnv.join(', '));
  console.warn('[Firebase][patient] Using fallback Firebase config for project:', fallbackConfig.projectId);
}

let app;
let auth;
let db;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('[Firebase][patient] Initialized for project:', firebaseConfig.projectId);
  console.log('[Firebase][patient] Auth domain:', firebaseConfig.authDomain);
} catch (e) {
  console.warn('[Firebase][patient] Initialization failed:', e?.message || e);
  app = null; auth = null; db = null;
}

export { auth, db };
export default app;
export const firebaseConfigStatus = { isValid: Boolean(auth && db), usedFallback: !isEnvValid, missing: missingFromEnv };
