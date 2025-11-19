import * as Location from 'expo-location';
import { Alert } from 'react-native';
import userService from './userService';
import api from './api';

export const locationService = {
  async ensureLocationEnabled() {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm?.granted) {
      const req = await Location.requestForegroundPermissionsAsync();
      if (!req?.granted) {
        Alert.alert('Enable Location', 'Location permission is required.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Allow', onPress: async () => { await Location.requestForegroundPermissionsAsync(); } }
        ]);
        throw new Error('Location permission denied');
      }
    }
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert('Turn On Location', 'Please turn on device location services.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Try Again' }
      ]);
      throw new Error('Location services disabled');
    }
    return true;
  },
  // Request location permissions
  async requestLocationPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  },

  // Get current location
  async getCurrentLocation() {
    try {
      await this.ensureLocationEnabled();
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      // Get address from coordinates
      const address = await this.getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  },

  // Get address from coordinates
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address) {
        return `${address.street || ''} ${address.city || ''}, ${address.region || ''}`.trim();
      }
      return 'Location not available';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location not available';
    }
  },

  // Update user location in database
  async updateUserLocation(userId) {
    const location = await this.getCurrentLocation();
    try {
      await api.put('/patient/profile', {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
      });
    } catch {}
    try {
      await userService.updateUserLocation(userId, location);
    } catch {}
    return location;
  },

  // Watch location changes
  watchLocation(callback, options = {}) {
    const defaultOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // 10 seconds
      distanceInterval: 10, // 10 meters
      ...options,
    };

    return Location.watchPositionAsync(defaultOptions, async (location) => {
      try {
        const address = await this.getAddressFromCoordinates(
          location.coords.latitude,
          location.coords.longitude
        );
        
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address,
          timestamp: new Date(),
        };
        
        callback(locationData);
      } catch (error) {
        console.error('Error in location watch callback:', error);
      }
    });
  },

  // Stop watching location
  async stopWatchingLocation(locationSubscription) {
    if (locationSubscription) {
      await locationSubscription.remove();
    }
  },

  // Get distance between two coordinates (in meters)
  getDistanceBetween(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },
};

export default locationService;