import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [appError, setAppError] = useState(null);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error('Global App Error (driver-app):', error);
      const msg = error && error.message ? error.message : 'Something went wrong';
      setAppError(msg);
    };

    // Install a global JS error handler in React Native
    const prevHandler = (global.ErrorUtils && global.ErrorUtils.getGlobalHandler)
      ? global.ErrorUtils.getGlobalHandler()
      : null;

    if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error('Unhandled JS Error (driver-app):', error, { isFatal });
        errorHandler(error);
        if (typeof prevHandler === 'function') {
          try { prevHandler(error, isFatal); } catch (_) { /* noop */ }
        }
      });
    }

    // Best-effort unhandled promise rejection tracking in RN (no process.on)
    try {
      const tracking = require('promise/setimmediate/rejection-tracking');
      if (tracking && typeof tracking.enable === 'function') {
        try {
          tracking.enable({
            allRejections: true,
            onUnhandled: (_id, error) => errorHandler(error),
            onHandled: () => {},
          });
        } catch (_) {
          // ignore if polyfill cannot be enabled
        }
      }
    } catch (_) {
      // ignore if module not available
    }

    return () => {
      // ErrorUtils does not provide an unsubscribe; no-op on cleanup
    };
  }, []);

  if (appError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d32f2f', marginBottom: 10 }}>Error Occurred</Text>
        <Text style={{ fontSize: 14, color: '#555', marginHorizontal: 20, textAlign: 'center' }}>
          {appError}
        </Text>
        <Text style={{ fontSize: 12, color: '#999', marginTop: 20, marginHorizontal: 20, textAlign: 'center' }}>
          Check the console logs for more details. Try reloading the app.
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
