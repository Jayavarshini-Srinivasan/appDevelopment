import axios from 'axios';
import { auth } from '../../firebaseConfig';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const isLocalHost = (h) => ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(h);

const resolveMobileHost = () => {
  // Try multiple expo/debugger sources to extract the device-visible host IP
  const hostCandidates = [];
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || '';
  if (hostUri) {
    const clean = hostUri.replace('exp://', '').replace('http://', '').replace('https://', '');
    hostCandidates.push(clean.split(':')[0]);
  }
  const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
  if (scriptURL) {
    const clean = scriptURL.replace('exp://', '').replace('http://', '').replace('https://', '');
    hostCandidates.push(clean.split(':')[0]);
  }

  for (const h of hostCandidates) {
    if (!h) continue;
    if (!isLocalHost(h)) return h;
  }

  // No usable host from expo manifest; fall back to platform-specific defaults
  if (Platform.OS === 'android') return '10.0.2.2';
  return '127.0.0.1';
};

const sanitizeUrl = (u) => (u || '').replace(/['"`]/g, '').trim();

const resolveBaseUrl = () => {
  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra || {});
  if (Platform.OS === 'web') {
    const webEnv = sanitizeUrl(process.env.VITE_API_URL || extra.API_URL);
    if (webEnv) return webEnv;
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${host}:5002/api`;
  }

  const hostFromExpo = resolveMobileHost();

  // Use env if set, but translate to the expo host when env uses localhost
  const mobileEnv = sanitizeUrl(process.env.EXPO_PUBLIC_API_URL || extra.API_URL);
  if (mobileEnv) {
    try {
      const url = new URL(mobileEnv);
      const envHost = url.hostname;
      const envPort = url.port || '5002';
      const envProtocol = url.protocol || 'http:';
      if (isLocalHost(envHost) && hostFromExpo) {
        const chosen = `${envProtocol}//${hostFromExpo}:${envPort}/api`;
        console.log('[API] Translated mobile ENV host', mobileEnv, '->', chosen);
        return chosen;
      }
      return mobileEnv;
    } catch (e) {
      if (hostFromExpo) return `http://${hostFromExpo}:5002/api`;
      return Platform.OS === 'android' ? `http://10.0.2.2:5002/api` : `http://127.0.0.1:5002/api`;
    }
  }

  if (hostFromExpo) return `http://${hostFromExpo}:5002/api`;
  return Platform.OS === 'android' ? `http://10.0.2.2:5002/api` : `http://127.0.0.1:5002/api`;
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
      } catch (tokenError) {
        console.error('API Request - Token error:', tokenError);
      }
    }
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const url = error?.config?.url;
    const status = error?.response?.status;
    // try to get better message
    const message = (error?.response?.data && (typeof error?.response?.data === 'string' ? error?.response?.data : error?.response?.data?.message)) || error?.message || error?.toString() || 'Unknown error';
    if (status == null) {
      // No HTTP response received -> network/base URL issue
      console.error('API Response Error (network):', url, message, 'BaseURL:', api.defaults.baseURL);
    } else {
      console.error('API Response Error:', url, status, message);
    }
    return Promise.reject(error);
  }
);

console.log('API base URL:', API_BASE_URL);

// Health-check fallback: try alternative hosts and update baseURL at runtime
const tryHosts = async () => {
  if (Platform.OS === 'web') return;
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return;
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

  // If we have a hostFromExpo, prefer it
  const hostFromExpo = resolveMobileHost();
  if (hostFromExpo && !candidates.includes(hostFromExpo)) add(hostFromExpo);

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
      } catch (e) {
        // continue
      }
    }
  }
};

tryHosts();

export default api;

