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
  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra || {});
  if (Platform.OS === 'web') {
    const webEnv = sanitizeUrl(process.env.VITE_API_URL);
    if (webEnv) return webEnv;
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${host}:5002/api`;
  }

  // Prefer Expo LAN IP when available
  const hostFromExpo = resolveMobileHost();

  // Use env if set, unless it's localhost/127/10.0.2.2 while we have a LAN IP
  const mobileEnv = sanitizeUrl(process.env.EXPO_PUBLIC_API_URL);
  if (mobileEnv) {
    try {
      const url = new URL(mobileEnv);
      const envHost = url.hostname;
      const envPort = url.port || '5000';
      const badHosts = ['localhost', '127.0.0.1'];
      const isPrivateLan = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostFromExpo);
      if ((badHosts.includes(envHost) || envHost === '10.0.2.2') && hostFromExpo && isPrivateLan) {
        return `http://${hostFromExpo}:5002/api`;
      }
      return mobileEnv;
    } catch {
      return `http://${hostFromExpo}:5002/api`;
    }
  }

  return `http://${hostFromExpo}:5002/api`;
};

const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

console.log('API base URL:', API_BASE_URL);

const tryHosts = async () => {
  if (Platform.OS === 'web') return;
  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra || {});
  if (process.env.EXPO_PUBLIC_API_URL || extra.API_URL) return;
  const candidates = [];
  const add = (h) => { if (h && !candidates.includes(h)) candidates.push(h); };
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || '';
  if (hostUri) {
    const clean = hostUri.replace('exp://', '').replace('http://', '').replace('https://', '');
    add(clean.split(':')[0]);
  }
  const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const clean = scriptURL.replace('exp://', '').replace('http://', '').replace('https://', '');
    add(clean.split(':')[0]);
  }
  add('10.0.2.2');
  add('localhost');
  add('127.0.0.1');

  const ports = ['5002', '5001', '5000'];
  for (const host of candidates) {
    if (!host) continue;
    for (const port of ports) {
      const url = `http://${host}:${port}/health`;
      try {
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          const newBase = `http://${host}:${port}/api`;
          if (api.defaults.baseURL !== newBase) {
            api.defaults.baseURL = newBase;
            console.log('API base URL updated after health-check:', newBase);
          }
          return;
        }
      } catch {}
    }
  }
};

tryHosts();

api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('❌ Error getting auth token:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response OK:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'no response';
    const data = error.response?.data || error.message || 'unknown error';
    console.error(`❌ API Response Error: ${url} | Status: ${status} | Data:`, data);
    return Promise.reject(error);
  }
);

export default api;

