import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import { db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalCompleted: 0, completedToday: 0, rating: 0 });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [assignedRequests, setAssignedRequests] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadEmergencyRequests();
    loadDutyStatus();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      loadEmergencyRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnDuty) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnDuty]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEmergencyRequests();
      loadDashboardData();
      loadDutyStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading dashboard data...');
      const [statsResponse, locationResponse] = await Promise.all([
        api.get('/driver/stats'),
        api.get('/driver/location/current')
      ]);
      
      console.log('📈 Stats response:', statsResponse.data);
      console.log('📍 Location response:', locationResponse.data);
      
      if (statsResponse.data.data) {
        setStats(statsResponse.data.data);
      }
      
      if (locationResponse.data.data) {
        setCurrentLocation(locationResponse.data.data);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
    }
  };

  const loadEmergencyRequests = async () => {
    try {
      const [pendingResponse, assignedResponse] = await Promise.all([
        api.get('/driver/requests/pending'),
        api.get('/driver/requests/assigned')
      ]);
      
      setPendingRequests(pendingResponse.data.data?.length || 0);
      setAssignedRequests(assignedResponse.data.data?.length || 0);
    } catch (error) {
      console.error('Error loading emergency requests:', error);
    }
  };

  const loadDutyStatus = async () => {
    try {
      console.log('🔄 Loading duty status...');
      // Try to get duty status from driver profile
      const profileResponse = await api.get('/driver/profile');
      console.log('✅ Profile response:', profileResponse.data);
      
      if (profileResponse.data.data) {
        const dutyStatus = profileResponse.data.data.isOnDuty || false;
        console.log('🎯 Setting duty status to:', dutyStatus);
        setIsOnDuty(dutyStatus);
      }
    } catch (error) {
      console.error('❌ Error loading duty status:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // If profile endpoint fails, duty status will remain false (default)
    }
  };

  const toggleDuty = async () => {
    setLoading(true);
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await api.post('/driver/duty/toggle', { isOnDuty: newStatus });
      Alert.alert('Success', newStatus ? 'You are now ON DUTY' : 'You are now OFF DUTY');
    } catch (error) {
      console.error('❌ Error toggling duty:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Warning', 'Location permission not granted. Duty is ON, tracking disabled.');
        return;
      }

      setIsTracking(true);
      
      // Get current location immediately
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      await updateDriverLocation(currentLocation.coords);

      // Watch for location changes
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Update when moved 20 meters
        },
        async (location) => {
          await updateDriverLocation(location.coords);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    setIsTracking(false);
  };

  const updateDriverLocation = async (coords) => {
    try {
      const { latitude, longitude } = coords;
      // Update via API only (avoid client Firestore writes on mobile)
      await api.post('/driver/location', { 
        latitude, 
        longitude,
        isOnDuty: isOnDuty 
      });
      
      setCurrentLocation({ latitude, longitude });
    } catch (error) {
      console.error('Error updating location via API:', error.response?.data || error.message);
    }
  };

  const handleViewRequests = () => {
    navigation.navigate('AssignedRequests');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const getDutyButtonStyle = () => {
    return isOnDuty ? styles.dutyButtonActive : styles.dutyButtonInactive;
  };

  const getDutyStatusText = () => {
    return isOnDuty ? 'ON DUTY' : 'OFF DUTY';
  };

  const getLocationStatus = () => {
    if (!isOnDuty) return 'Not tracking (Off Duty)';
    if (isTracking && currentLocation) return 'Location Active';
    if (isTracking) return 'Acquiring location...';
    return 'Location unavailable';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome Back!</Text>
        <Text style={styles.driverName}>{user?.email || 'Driver'}</Text>
      </View>

      {/* Duty Status Card */}
      <View style={styles.dutyCard}>
        <View style={styles.dutyStatusContainer}>
          <View style={[styles.statusIndicator, isOnDuty ? styles.statusActive : styles.statusInactive]} />
          <View style={styles.dutyTextContainer}>
            <Text style={styles.dutyStatusTitle}>Duty Status</Text>
            <Text style={[styles.dutyStatusValue, isOnDuty ? styles.dutyActiveText : styles.dutyInactiveText]}>
              {getDutyStatusText()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.dutyButton, getDutyButtonStyle()]}
          onPress={toggleDuty}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.dutyButtonText}>
              {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Status */}
      {isOnDuty && (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Location Status</Text>
            <View style={[styles.locationIndicator, isTracking ? styles.locationActive : styles.locationInactive]} />
          </View>
          <Text style={styles.locationStatus}>{getLocationStatus()}</Text>
          {currentLocation && (
            <Text style={styles.locationCoords}>
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          )}
        </View>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Today's Performance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalCompleted}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.rating || '4.8'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingRequests}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Emergency Requests */}
      <View style={styles.requestsSection}>
        <Text style={styles.sectionTitle}>Emergency Requests</Text>
        
        {isOnDuty ? (
          <View style={styles.requestsContainer}>
            <TouchableOpacity
              style={styles.requestCard}
              onPress={handleViewRequests}
            >
              <View style={styles.requestIconContainer}>
                <Text style={styles.requestIcon}>🚨</Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestTitle}>Pending Requests</Text>
                <Text style={styles.requestCount}>{pendingRequests} requests</Text>
              </View>
              <Text style={styles.requestArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.requestCard, styles.assignedCard]}
              onPress={handleViewRequests}
            >
              <View style={styles.requestIconContainer}>
                <Text style={styles.requestIcon}>📍</Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestTitle}>Assigned to You</Text>
                <Text style={styles.requestCount}>{assignedRequests} active</Text>
              </View>
              <Text style={styles.requestArrow}>›</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.offDutyMessage}>
            <Text style={styles.offDutyText}>Go on duty to see emergency requests</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewProfile}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewRequests}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Requests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0A6CF1',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E0E7FF',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dutyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dutyStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: '#EF4444',
  },
  dutyTextContainer: {
    flex: 1,
  },
  dutyStatusTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  dutyStatusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  dutyActiveText: {
    color: '#10B981',
  },
  dutyInactiveText: {
    color: '#EF4444',
  },
  dutyButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  dutyButtonInactive: {
    backgroundColor: '#10B981',
  },
  dutyButtonActive: {
    backgroundColor: '#EF4444',
  },
  dutyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  locationIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  locationActive: {
    backgroundColor: '#10B981',
  },
  locationInactive: {
    backgroundColor: '#EF4444',
  },
  locationStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '23%',
    margin: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A6CF1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  requestsSection: {
    marginBottom: 20,
  },
  requestsContainer: {
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  requestIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  requestIcon: {
    fontSize: 24,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  requestCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  offDutyMessage: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  offDutyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});