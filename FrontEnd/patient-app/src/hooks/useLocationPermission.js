import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

const mapLocation = (location) => {
  if (!location?.coords) return null;
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: new Date(location.timestamp),
  };
};

export default function useLocationPermission() {
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    checkPermission();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateState = (setter) => {
    if (isMountedRef.current) {
      setter();
    }
  };

  const checkPermission = useCallback(async () => {
    try {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      updateState(() => setStatus(currentStatus));
      if (currentStatus === 'granted') {
        await getLocation();
      }
    } catch (err) {
      updateState(() => setError(err));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (isRequesting) return status === 'granted';
    setIsRequesting(true);
    try {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      updateState(() => setStatus(newStatus));
      if (newStatus === 'granted') {
        await getLocation();
        return true;
      }
      return false;
    } catch (err) {
      updateState(() => setError(err));
      return false;
    } finally {
      updateState(() => setIsRequesting(false));
    }
  }, [isRequesting]);

  const getLocation = useCallback(async () => {
    try {
      const foregroundPerm = await Location.getForegroundPermissionsAsync();
      if (foregroundPerm.status !== 'granted') {
        updateState(() => setStatus(foregroundPerm.status));
        throw new Error('Location permission not granted');
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const mapped = mapLocation(position);
      updateState(() => {
        setLocation(mapped);
        setError(null);
      });
      return mapped;
    } catch (err) {
      updateState(() => setError(err));
      throw err;
    }
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  return {
    status,
    location,
    error,
    isRequesting,
    requestPermission,
    getLocation,
    openSettings,
    refreshPermission: checkPermission,
  };
}

