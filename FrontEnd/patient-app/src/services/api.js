import axios from 'axios';
import { auth } from '../../firebaseConfig';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const resolveMobileHost = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost;
  if (hostUri) {
    const clean = hostUri.replace('exp://', '').replace('http://', '').replace('https://', '');
    const host = clean.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const clean = scriptURL.replace('exp://', '').replace('http://', '').replace('https://', '');
    const host = clean.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
};

const sanitizeUrl = (u) => (u || '').replace(/['"`]/g, '').trim();

const resolveBaseUrl = () => {
  if (Platform.OS === 'web') {
    const webEnv = sanitizeUrl(process.env.VITE_API_URL);
    if (webEnv) return webEnv;
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${host}:5000/api`;
  }

  const hostFromExpo = resolveMobileHost();
  const mobileEnv = sanitizeUrl(process.env.EXPO_PUBLIC_API_URL);
  if (mobileEnv) {
    try {
      const url = new URL(mobileEnv);
      const envHost = url.hostname;
      const badHosts = ['localhost', '127.0.0.1'];
      const isPrivateLan = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostFromExpo);
      if ((badHosts.includes(envHost) || envHost === '10.0.2.2') && hostFromExpo && isPrivateLan) {
        return `http://${hostFromExpo}:5000/api`;
      }
      return mobileEnv;
    } catch {
      return `http://${hostFromExpo}:5000/api`;
    }
  }

  return `http://${hostFromExpo}:5000/api`;
};

const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

