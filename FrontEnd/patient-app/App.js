import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [appError, setAppError] = useState(null);

  useEffect(() => {
    // Global error handler for React Native
    const errorHandler = (error) => {
      console.error('Global App Error:', error);
      setAppError((error && error.message) ? error.message : 'Something went wrong');
    };

    // Register a global handler using React Native's ErrorUtils when available
    const prevHandler = (global.ErrorUtils && global.ErrorUtils.getGlobalHandler)
      ? global.ErrorUtils.getGlobalHandler()
      : null;

    if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error('Unhandled JS Error:', error, { isFatal });
        errorHandler(error);
        if (typeof prevHandler === 'function') {
          try { prevHandler(error, isFatal); } catch (_) { /* noop */ }
        }
      });
    }

    // Best-effort unhandled promise rejection catch in RN
    const tracking = require('promise/setimmediate/rejection-tracking');
    if (tracking && tracking.enable) {
      try {
        tracking.enable({ allRejections: true, onUnhandled: (id, error) => errorHandler(error) });
      } catch (_) {
        // ignore if polyfill not available
      }
    }

    return () => {
      // No explicit unsubscribe API for ErrorUtils or rejection tracking in RN
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
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
